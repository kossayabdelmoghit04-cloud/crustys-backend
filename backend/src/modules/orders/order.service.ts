import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { CreateOrderDTO, OrderQueryFilters, UpdateOrderStatusDTO, SalesStatistics } from './order.types';
import { EmailProducer } from '../emails';
import { logger } from '../../utils/logger';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service';
import { StockAlertService } from '../stock-alerts/stock-alert.service';

export class OrderService {
  /**
   * Génère un numéro de commande unique au format CRUSTY-YYYYMMDD-XXXX
   */
  private static async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // AAAAMMJJ
    
    // Essayer de générer un code unique robuste
    let orderNumber = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const random = Math.floor(1000 + Math.random() * 9000); // 4 chiffres aléatoires
      orderNumber = `CRUSTY-${dateStr}-${random}`;

      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber },
      });

      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      // Fallback avec timestamp pour garantir l'unicité à 100%
      orderNumber = `CRUSTY-${dateStr}-${Date.now().toString().slice(-4)}`;
    }

    return orderNumber;
  }

  /**
   * Créer une commande (avec transaction Prisma sécurisée)
   */
  public static async create(data: CreateOrderDTO, userId?: string) {
    // 1. Si userId est fourni, vérifier que l'utilisateur existe
    let user: any = null;
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new AppError('Utilisateur client introuvable.', 404);
      }
    }

    // 2. Extraire tous les IDs de produits uniques pour valider en une seule requête
    const productIds = Array.from(new Set(data.items.map((item) => item.productId)));

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      throw new AppError('Un ou plusieurs produits spécifiés sont introuvables.', 400);
    }

    // Convertir les produits en dictionnaire pour un accès rapide O(1)
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 3. Calculer les détails des items, valider le stock et calculer le montant total
    let totalPrice = 0;
    const orderItemsData: any[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new AppError(`Produit introuvable pour l'ID ${item.productId}`, 400);
      }

      if (!product.isAvailable) {
        throw new AppError(`Le produit "${product.name}" n'est pas disponible actuellement.`, 400);
      }

      // Vérifier le stock si géré
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          `Stock insuffisant pour le produit "${product.name}". Restant: ${product.stockQuantity}, Demandé: ${item.quantity}`,
          400
        );
      }

      // Déterminer le prix unitaire (prix de réduction si disponible)
      const unitPrice = product.discountPrice !== null ? product.discountPrice : product.price;
      const subtotal = unitPrice * item.quantity;
      totalPrice += subtotal;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      });
    }

    // 4. Générer le numéro de commande unique
    const orderNumber = await this.generateOrderNumber();

    // 5. Exécuter l'ensemble de la création et soustraction des stocks dans une TRANSACTION SQL
    const order = await prisma.$transaction(async (tx) => {
      // Déduire les stocks de produits
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Déduire également la dispo si stock tombe à 0
      for (const item of data.items) {
        const updatedProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        if (updatedProduct && updatedProduct.stockQuantity === 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { isAvailable: false },
          });
        }
      }

      // Déterminer les enums Prisma correspondants
      let methodEnum: PaymentMethod = PaymentMethod.STRIPE;
      const lowerMethod = data.paymentMethod.toLowerCase();
      if (lowerMethod === 'cash') {
        methodEnum = PaymentMethod.CASH;
      } else if (lowerMethod === 'card') {
        methodEnum = PaymentMethod.CARD;
      }

      const statusEnum = methodEnum === PaymentMethod.CASH ? PaymentStatus.PENDING : PaymentStatus.PAID;

      // Créer la commande
      const orderCreated = await tx.order.create({
        data: {
          userId: userId || null,
          orderNumber,
          totalPrice,
          deliveryType: data.deliveryType,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress || null,
          notes: data.notes || null,
          paymentStatus: methodEnum === PaymentMethod.CASH ? 'pending' : 'paid',
          orderStatus: OrderStatus.PENDING,
          items: {
            create: orderItemsData,
          },
          payments: {
            create: {
              paymentMethod: methodEnum,
              amount: totalPrice,
              paymentStatus: statusEnum,
            },
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  image: true,
                },
              },
            },
          },
          payments: true,
        },
      });

      return orderCreated;
    });

    // Enqueue customer order confirmation email asynchronously (non-blocking)
    if (user && user.email) {
      EmailProducer.enqueueOrderConfirmationEmail(user.email, {
        firstName: user.firstName,
        orderNumber: order.orderNumber,
        items: order.items.map((i: any) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.unitPrice,
        })),
        totalPrice: order.totalPrice,
        estimatedDelivery: order.deliveryType === 'delivery' ? '30-45 minutes' : '15-20 minutes',
      }).catch(err => {
        logger.error(`[Order Service] Failed enqueuing Order Confirmation email to ${user.email}: ${err.message}`);
      });
    }

    // Enqueue admin new order alert email asynchronously (non-blocking)
    EmailProducer.enqueueAdminAlertEmail('admin@crustys.com', {
      orderNumber: order.orderNumber,
      totalPrice: order.totalPrice,
      deliveryType: order.deliveryType === 'delivery' ? 'Livraison' : 'À emporter',
      customerName: user ? `${user.firstName} ${user.lastName}` : 'Client de passage',
      adminDashboardUrl: 'https://admin.crustysexpress.com/orders',
    }).catch(err => {
      logger.error(`[Order Service] Failed enqueuing Admin New Order Alert email: ${err.message}`);
    });

    // Créer une notification administrateur pour la nouvelle commande
    AdminNotificationService.createNotification({
      title: "Nouvelle commande",
      message: `Commande ${order.orderNumber} créée`,
      type: "ORDER_CREATED",
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice
      }
    }).catch(err => {
      logger.error(`[Order Service] Failed to create admin notification ORDER_CREATED: ${err.message}`);
    });

    // Vérifier les niveaux de stock pour chaque produit
    for (const item of data.items) {
      StockAlertService.checkProductStock(item.productId).catch(err => {
        logger.error(`[Order Service] Failed checking stock level for ${item.productId}: ${err.message}`);
      });
    }

    return order;
  }

  /**
   * Récupérer toutes les commandes avec pagination et filtres (Pour l'Admin)
   */
  public static async getAll(filters: OrderQueryFilters) {
    const page = Math.max(1, parseInt(filters.page as string || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit as string || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.orderStatus = filters.status;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    // Filtrer par montant total
    if (filters.minTotal || filters.maxTotal) {
      where.totalPrice = {};
      if (filters.minTotal) {
        where.totalPrice.gte = parseFloat(filters.minTotal as string);
      }
      if (filters.maxTotal) {
        where.totalPrice.lte = parseFloat(filters.maxTotal as string);
      }
    }

    // Filtrer par date
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Tri
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const totalOrders = await prisma.order.count({ where });

    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    const totalPages = Math.ceil(totalOrders / limit);

    return {
      orders,
      pagination: {
        total: totalOrders,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Récupérer une commande par son ID avec vérification d'accès propriétaire
   */
  public static async getById(id: string, requesterUserId?: string, requesterRole?: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Commande introuvable.', 404);
    }

    // Si la requête vient d'un client, vérifier qu'il est bien le propriétaire de la commande
    if (requesterRole !== 'Super Admin' && requesterRole !== 'Admin' && requesterRole !== 'Manager') {
      if (order.userId !== requesterUserId) {
        throw new AppError('Accès refusé. Vous n\'êtes pas autorisé à voir cette commande.', 403);
      }
    }

    return order;
  }

  /**
   * Modifier le statut d'une commande (Admin/Manager uniquement)
   */
  public static async updateStatus(id: string, statusDto: UpdateOrderStatusDTO) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError('Commande introuvable.', 404);
    }

    // S'il s'agit d'une annulation, restituer les stocks de produits
    if (statusDto.status === OrderStatus.CANCELLED && order.orderStatus !== OrderStatus.CANCELLED) {
      await prisma.$transaction(async (tx) => {
        // Restituer les stocks
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
              isAvailable: true, // Rendre à nouveau disponible si c'était épuisé
            },
          });
        }

        // Mettre à jour le statut de commande et le statut du paiement
        await tx.order.update({
          where: { id },
          data: {
            orderStatus: OrderStatus.CANCELLED,
            paymentStatus: 'failed',
          },
        });

        // Mettre à jour le statut du paiement associé
        await tx.payment.updateMany({
          where: { orderId: id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
          },
        });
      });

      // Vérifier les stocks après annulation (rétablissement)
      for (const item of order.items) {
        StockAlertService.checkProductStock(item.productId).catch(err => {
          logger.error(`[Order Service] Failed checking stock level for restocked product ${item.productId}: ${err.message}`);
        });
      }

      AdminNotificationService.createNotification({
        title: "Commande annulée",
        message: `La commande ${order.orderNumber} a été annulée`,
        type: "ORDER_CANCELLED",
        metadata: { orderId: order.id, orderNumber: order.orderNumber }
      }).catch(err => {
        logger.error(`[Order Service] Failed to create admin notification ORDER_CANCELLED: ${err.message}`);
      });
    } else {
      // Passage à un autre statut (ex: CONFIRMED, DELIVERED)
      const dataUpdate: any = {
        orderStatus: statusDto.status,
      };

      // Si livré, on confirme le paiement s'il ne l'était pas
      if (statusDto.status === OrderStatus.DELIVERED) {
        dataUpdate.paymentStatus = 'paid';
        
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id },
            data: dataUpdate,
          });

          await tx.payment.updateMany({
            where: { orderId: id },
            data: {
              paymentStatus: PaymentStatus.PAID,
            },
          });
        });

        AdminNotificationService.createNotification({
          title: "Commande payée",
          message: `La commande ${order.orderNumber} a été payée`,
          type: "ORDER_PAID",
          metadata: { orderId: order.id, orderNumber: order.orderNumber }
        }).catch(err => {
          logger.error(`[Order Service] Failed to create admin notification ORDER_PAID: ${err.message}`);
        });
      } else {
        await prisma.order.update({
          where: { id },
          data: dataUpdate,
        });
      }
    }

    return this.getById(id, undefined, 'Admin');
  }

  /**
   * Annuler une commande client (Un client ne peut annuler que si le statut est PENDING)
   */
  public static async cancelOrder(id: string, requesterUserId?: string, requesterRole?: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new AppError('Commande introuvable.', 404);
    }

    const isAdmin = requesterRole === 'Super Admin' || requesterRole === 'Admin' || requesterRole === 'Manager';

    // Si client, s'assurer qu'il possède la commande et qu'elle est toujours au statut PENDING
    if (!isAdmin) {
      if (order.userId !== requesterUserId) {
        throw new AppError('Accès refusé. Vous n\'êtes pas autorisé à annuler cette commande.', 403);
      }

      if (order.orderStatus !== OrderStatus.PENDING) {
        throw new AppError(
          'Impossible d\'annuler une commande déjà confirmée ou en cours de préparation.',
          400
        );
      }
    }

    // Restituer les stocks et annuler la commande (Transaction)
    await prisma.$transaction(async (tx) => {
      // Réintégrer les stocks
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
            isAvailable: true,
          },
        });
      }

      await tx.order.update({
        where: { id },
        data: {
          orderStatus: OrderStatus.CANCELLED,
          paymentStatus: 'failed',
        },
      });

      await tx.payment.updateMany({
        where: { orderId: id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    });

    // Vérifier les stocks après annulation (rétablissement)
    for (const item of order.items) {
      StockAlertService.checkProductStock(item.productId).catch(err => {
        logger.error(`[Order Service] Failed checking stock level for restocked product ${item.productId}: ${err.message}`);
      });
    }

    AdminNotificationService.createNotification({
      title: "Commande annulée",
      message: `La commande ${order.orderNumber} a été annulée par le client`,
      type: "ORDER_CANCELLED",
      metadata: { orderId: order.id, orderNumber: order.orderNumber }
    }).catch(err => {
      logger.error(`[Order Service] Failed to create admin notification ORDER_CANCELLED: ${err.message}`);
    });

    return this.getById(id, undefined, 'Admin');
  }

  /**
   * Obtenir les statistiques des ventes et chiffre d'affaires (Tableau de bord Admin)
   */
  public static async getStatistics(): Promise<SalesStatistics> {
    // Chiffre d'affaires total sur les commandes livrées/payées
    const revenueAggregate = await prisma.order.aggregate({
      where: {
        orderStatus: OrderStatus.DELIVERED,
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenue = revenueAggregate._sum.totalPrice || 0;
    const completedOrders = revenueAggregate._count.id || 0;

    // Nombre total de commandes (tous statuts confondus)
    const totalOrders = await prisma.order.count();

    // Nombre de commandes annulées
    const cancelledOrders = await prisma.order.count({
      where: {
        orderStatus: OrderStatus.CANCELLED,
      },
    });

    const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

    // Revenu par méthode de paiement
    const payments = await prisma.payment.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
      },
      select: {
        paymentMethod: true,
        amount: true,
      },
    });

    const paymentMap = new Map<string, number>();
    payments.forEach((pay) => {
      const prev = paymentMap.get(pay.paymentMethod) || 0;
      paymentMap.set(pay.paymentMethod, prev + pay.amount);
    });

    const revenueByPaymentMethod = Array.from(paymentMap.entries()).map(([paymentMethod, amount]) => ({
      paymentMethod,
      amount,
    }));

    // Revenu par statut de commande
    const ordersGrouped = await prisma.order.groupBy({
      by: ['orderStatus'],
      _sum: {
        totalPrice: true,
      },
    });

    const revenueByStatus = ordersGrouped.map((grp) => ({
      status: grp.orderStatus,
      amount: grp._sum.totalPrice || 0,
    }));

    // Produits les plus vendus
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          orderStatus: OrderStatus.DELIVERED,
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    const productStatsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    orderItems.forEach((item) => {
      const prev = productStatsMap.get(item.productId) || { name: item.product.name, quantity: 0, revenue: 0 };
      productStatsMap.set(item.productId, {
        name: item.product.name,
        quantity: prev.quantity + item.quantity,
        revenue: prev.revenue + item.subtotal,
      });
    });

    const popularProducts = Array.from(productStatsMap.entries())
      .map(([productId, val]) => ({
        productId,
        name: val.name,
        quantitySold: val.quantity,
        revenue: val.revenue,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5); // Top 5 des produits

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      cancelledOrders,
      averageOrderValue,
      revenueByPaymentMethod,
      revenueByStatus,
      popularProducts,
    };
  }
}

import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { stripe } from '../../utils/stripe';
import Stripe from 'stripe';
import * as Sentry from '@sentry/node';
import { recordSentryErrorTimestamp, reportCriticalFailure } from '../../config/sentry';
import { env } from '../../config/env';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';
import { CreatePaymentIntentDTO, PaymentQueryFilters } from './payment.types';
import { logger } from '../../utils/logger';
import { EmailProducer } from '../emails';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service';
import { StockAlertService } from '../stock-alerts/stock-alert.service';

export class PaymentService {
  /**
   * Créer un Stripe PaymentIntent pour une commande
   */
  public static async createPaymentIntent(data: CreatePaymentIntentDTO, userId?: string) {
    const { orderId } = data;

    // 1. Récupérer la commande
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Commande introuvable.', 404);
    }

    if (order.orderStatus === OrderStatus.CANCELLED) {
      throw new AppError('Impossible de payer une commande annulée.', 400);
    }

    // 2. Empêcher le double paiement
    const alreadyPaid = order.payments.some((p) => p.paymentStatus === PaymentStatus.PAID);
    if (alreadyPaid) {
      throw new AppError('Cette commande a déjà été payée.', 400);
    }

    // 3. Créer le PaymentIntent Stripe (le montant doit être en centimes)
    const amountInCents = Math.round(order.totalPrice * 100);

    try {
      logger.info(`[Stripe] Création du PaymentIntent pour la commande ${orderId}. Montant: ${order.totalPrice} CAD (${amountInCents} cts)`);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'cad',
        payment_method_types: ['card'],
        metadata: {
          orderId: order.id,
          userId: userId || 'guest',
        },
      });

      // 4. Enregistrer la transaction en attente dans la base de données
      // Si un paiement existe déjà en attente, on peut mettre à jour son transactionId
      const pendingPayment = order.payments.find((p) => p.paymentStatus === PaymentStatus.PENDING);

      let dbPayment;
      if (pendingPayment) {
        dbPayment = await prisma.payment.update({
          where: { id: pendingPayment.id },
          data: {
            transactionId: paymentIntent.id,
            paymentMethod: PaymentMethod.STRIPE,
            amount: order.totalPrice,
          },
        });
      } else {
        dbPayment = await prisma.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalPrice,
            paymentMethod: PaymentMethod.STRIPE,
            paymentStatus: PaymentStatus.PENDING,
            transactionId: paymentIntent.id,
            currency: 'CAD',
          },
        });
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        paymentId: dbPayment.id,
      };
    } catch (error: any) {
      logger.error(`[Stripe Error] Échec de la création du PaymentIntent: ${error.message}`);
      
      recordSentryErrorTimestamp();
      const orderId = order.id;
      const paymentId = pendingPayment?.id || 'unknown';
      const stripePaymentIntentId = error.raw?.payment_intent?.id || error.payment_intent || 'unknown';

      if (error instanceof Stripe.errors.StripeError) {
        Sentry.configureScope((scope) => {
          scope.setTags({
            stripe_error: 'true',
            stripe_error_type: error.type,
            orderId,
            paymentId,
            stripePaymentIntentId,
          });
          scope.setExtras({
            orderId,
            paymentId,
            stripePaymentIntentId,
            raw_error: error.raw,
          });
        });
        Sentry.captureException(error);

        if (
          error instanceof Stripe.errors.StripeAPIError ||
          error instanceof Stripe.errors.StripeAuthenticationError ||
          error instanceof Stripe.errors.StripePermissionError
        ) {
          reportCriticalFailure(
            error,
            'STRIPE_FAILURE',
            'Stripe Gateway Failure',
            `Échec de la communication avec la passerelle Stripe (${error.constructor.name}) : ${error.message}`,
            { orderId, paymentId, stripePaymentIntentId }
          ).catch(() => {});
        }
      } else {
        Sentry.captureException(error);
      }

      throw new AppError(`Erreur d'intégration Stripe : ${error.message}`, 500);
    }
  }

  /**
   * Traiter et valider le Webhook Stripe sécurisé
   */
  public static async handleWebhook(rawBody: Buffer, signature: string) {
    let event;

    try {
      // Valider la signature du webhook
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      logger.error(`[Stripe Webhook Error] Signature invalide: ${err.message}`);
      throw new AppError(`Signature de Webhook invalide : ${err.message}`, 400);
    }

    logger.info(`[Stripe Webhook] Événement reçu : ${event.type}`);

    const session = event.data.object as any;

    // Gérer les événements Stripe
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const orderId = session.metadata?.orderId;
        const transactionId = session.id;

        logger.info(`[Stripe Webhook] Paiement réussi pour le PaymentIntent ${transactionId} (Commande: ${orderId})`);

        await prisma.$transaction(async (tx) => {
          // 1. Mettre à jour le paiement associé
          const payment = await tx.payment.findFirst({
            where: { transactionId },
          });

          if (payment) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                paymentStatus: PaymentStatus.PAID,
                paidAt: new Date(),
              },
            });
          }

          // 2. Confirmer la commande
          if (orderId) {
            await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'paid',
                orderStatus: OrderStatus.CONFIRMED,
              },
            });
          }
        });

        if (orderId) {
          try {
            const findPromise = prisma.order.findUnique({
              where: { id: orderId }
            });
            if (findPromise && typeof findPromise.then === 'function') {
              const order = await findPromise;
              if (order) {
                await AdminNotificationService.createNotification({
                  title: "Commande payée",
                  message: `La commande ${order.orderNumber} a été payée avec succès via Stripe`,
                  type: "ORDER_PAID",
                  metadata: { orderId: order.id, orderNumber: order.orderNumber, transactionId }
                });
              }
            }
          } catch (error: any) {
            logger.error(`[Stripe Webhook] Erreur lors de la notification de paiement réussi: ${error.message}`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const orderId = session.metadata?.orderId;
        const transactionId = session.id;

        logger.warn(`[Stripe Webhook] Échec du paiement pour le PaymentIntent ${transactionId}`);

        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findFirst({
            where: { transactionId },
          });

          if (payment) {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                paymentStatus: PaymentStatus.FAILED,
              },
            });
          }

          if (orderId) {
            await tx.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: 'failed',
              },
            });
          }
        });
        break;
      }

      case 'charge.refunded': {
        const transactionId = session.payment_intent;
        logger.info(`[Stripe Webhook] Remboursement Stripe détecté pour le PaymentIntent ${transactionId}`);

        const payment = await prisma.payment.findFirst({
          where: { transactionId },
          include: { order: { include: { items: true, user: true } } },
        });

        if (payment && payment.paymentStatus !== PaymentStatus.REFUNDED) {
          await prisma.$transaction(async (tx) => {
            // Passer le paiement à REFUNDED
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                paymentStatus: PaymentStatus.REFUNDED,
              },
            });

            // Annuler la commande
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                orderStatus: OrderStatus.CANCELLED,
                paymentStatus: 'failed',
              },
            });

            // Restituer les stocks
            for (const item of payment.order.items) {
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
          });

          // Vérifier les stocks après remboursement (rétablissement)
          for (const item of payment.order.items) {
            StockAlertService.checkProductStock(item.productId).catch(err => {
              logger.error(`[Payment Webhook] Failed checking stock level for restocked product ${item.productId}: ${err.message}`);
            });
          }

          AdminNotificationService.createNotification({
            title: "Commande remboursée",
            message: `La commande ${payment.order.orderNumber} a été remboursée`,
            type: "ORDER_REFUNDED",
            metadata: { orderId: payment.orderId, orderNumber: payment.order.orderNumber, amount: payment.amount }
          }).catch(() => {});

          AdminNotificationService.createNotification({
            title: "Commande annulée",
            message: `La commande ${payment.order.orderNumber} a été annulée suite à son remboursement`,
            type: "ORDER_CANCELLED",
            metadata: { orderId: payment.orderId, orderNumber: payment.order.orderNumber }
          }).catch(() => {});

          // Enqueue refund notification email asynchronously (non-blocking)
          if (payment.order.user && payment.order.user.email) {
            EmailProducer.enqueueRefundEmail(payment.order.user.email, {
              firstName: payment.order.user.firstName,
              refundAmount: payment.amount,
              paymentReference: payment.transactionId || payment.id,
              reason: 'Remboursement initié via passerelle de paiement Stripe',
            }).catch(err => {
              logger.error(`[Stripe Webhook] Failed enqueuing Refund Email to ${payment.order.user?.email}: ${err.message}`);
            });
          }
        }
        break;
      }

      default:
        logger.debug(`[Stripe Webhook] Événement non géré : ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Effectuer un remboursement manuel Stripe (Admin uniquement)
   */
  public static async refundPayment(paymentId: string, reason?: string) {
    // 1. Trouver le paiement
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            items: true,
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Paiement introuvable.', 404);
    }

    if (payment.paymentStatus !== PaymentStatus.PAID) {
      throw new AppError('Seuls les paiements validés (PAID) peuvent être remboursés.', 400);
    }

    if (!payment.transactionId) {
      throw new AppError('Aucune ID de transaction Stripe n\'est associée à ce paiement.', 400);
    }

    try {
      logger.info(`[Stripe] Demande de remboursement pour le paiement ${paymentId} (Intent: ${payment.transactionId})`);

      // 2. Déclencher le remboursement sur l'API Stripe
      await stripe.refunds.create({
        payment_intent: payment.transactionId,
        reason: 'requested_by_customer',
        metadata: {
          paymentId: payment.id,
          orderId: payment.orderId,
          customReason: reason || 'Non spécifié',
        },
      });

      // 3. Appliquer les changements en base de données de manière transactionnelle
      await prisma.$transaction(async (tx) => {
        // Mettre à jour le paiement
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });

        // Annuler la commande associée
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            orderStatus: OrderStatus.CANCELLED,
            paymentStatus: 'failed',
          },
        });

        // Réintégrer les stocks de produits
        for (const item of payment.order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                increment: item.quantity,
              },
              isAvailable: true, // Marquer dispo à nouveau
            },
          });
        }
      });

      // Vérifier les stocks après remboursement manuel (rétablissement)
      for (const item of payment.order.items) {
        StockAlertService.checkProductStock(item.productId).catch(err => {
          logger.error(`[Payment Service] Failed checking stock level for restocked product ${item.productId}: ${err.message}`);
        });
      }

      AdminNotificationService.createNotification({
        title: "Commande remboursée",
        message: `La commande ${payment.order.orderNumber} a été remboursée (manuel)`,
        type: "ORDER_REFUNDED",
        metadata: { orderId: payment.orderId, orderNumber: payment.order.orderNumber, amount: payment.amount }
      }).catch(() => {});

      AdminNotificationService.createNotification({
        title: "Commande annulée",
        message: `La commande ${payment.order.orderNumber} a été annulée (remboursée)`,
        type: "ORDER_CANCELLED",
        metadata: { orderId: payment.orderId, orderNumber: payment.order.orderNumber }
      }).catch(() => {});

      // Enqueue refund notification email asynchronously (non-blocking)
      if (payment.order.user && payment.order.user.email) {
        EmailProducer.enqueueRefundEmail(payment.order.user.email, {
          firstName: payment.order.user.firstName,
          refundAmount: payment.amount,
          paymentReference: payment.transactionId || payment.id,
          reason: reason || 'Annulation de commande ou geste commercial',
        }).catch(err => {
          logger.error(`[Payment Service] Failed enqueuing Refund Email to ${payment.order.user?.email}: ${err.message}`);
        });
      }

      return this.getPaymentById(paymentId);
    } catch (error: any) {
      logger.error(`[Stripe Error] Échec du remboursement Stripe : ${error.message}`);
      
      recordSentryErrorTimestamp();
      const orderId = payment ? payment.orderId : 'unknown';
      const stripePaymentIntentId = payment ? payment.transactionId || 'unknown' : 'unknown';

      if (error instanceof Stripe.errors.StripeError) {
        Sentry.configureScope((scope) => {
          scope.setTags({
            stripe_error: 'true',
            stripe_error_type: error.type,
            orderId,
            paymentId,
            stripePaymentIntentId,
          });
          scope.setExtras({
            orderId,
            paymentId,
            stripePaymentIntentId,
            raw_error: error.raw,
          });
        });
        Sentry.captureException(error);

        if (
          error instanceof Stripe.errors.StripeAPIError ||
          error instanceof Stripe.errors.StripeAuthenticationError ||
          error instanceof Stripe.errors.StripePermissionError
        ) {
          reportCriticalFailure(
            error,
            'STRIPE_FAILURE',
            'Stripe Gateway Failure',
            `Échec de la communication avec la passerelle Stripe (${error.constructor.name}) : ${error.message}`,
            { orderId, paymentId, stripePaymentIntentId }
          ).catch(() => {});
        }
      } else {
        Sentry.captureException(error);
      }

      throw new AppError(`Erreur de remboursement Stripe : ${error.message}`, 500);
    }
  }

  /**
   * Consulter l'historique des paiements avec pagination et filtres (Admin uniquement)
   */
  public static async getPayments(filters: PaymentQueryFilters) {
    const page = Math.max(1, parseInt(filters.page as string || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit as string || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.paymentStatus = filters.status;
    }

    if (filters.method) {
      where.paymentMethod = filters.method;
    }

    if (filters.orderId) {
      where.orderId = filters.orderId;
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

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const totalPayments = await prisma.payment.count({ where });

    const payments = await prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalPrice: true,
            customerPhone: true,
            user: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalPayments / limit);

    return {
      payments,
      pagination: {
        total: totalPayments,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Consulter les détails d'un paiement spécifique par ID
   */
  public static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
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
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new AppError('Paiement introuvable.', 404);
    }

    return payment;
  }
}

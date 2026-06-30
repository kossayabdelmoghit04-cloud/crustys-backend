import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { CreateNotificationDTO, NotificationQueryFilters, NotificationStats } from './admin-notification.types';
import { ADMIN_NOTIFICATION_CONSTANTS } from './admin-notification.constants';
import { logger } from '../../utils/logger';

export class AdminNotificationService {
  /**
   * Enregistrer une nouvelle notification administrateur dans PostgreSQL
   * Supporte l'émission temps réel via Socket.io
   */
  static async createNotification(data: CreateNotificationDTO) {
    try {
      const notification = await prisma.adminNotification.create({
        data: {
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata || null,
          adminId: data.adminId || null,
        },
      });

      // Émettre l'événement temps réel via Socket.io si configuré globalement
      try {
        const io = (global as any).io;
        if (io) {
          logger.info(`[Socket.io] Emission d'une notification: ${notification.title}`);
          io.emit('admin-notification', notification);
        }
      } catch (err: any) {
        logger.error(`[Socket.io Error] Impossible d'émettre la notification temps réel: ${err.message}`);
      }

      return notification;
    } catch (error: any) {
      logger.error(`[AdminNotificationService] Erreur lors de la création de la notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupérer les notifications avec pagination et filtres (type, isRead)
   */
  static async getNotifications(filters: NotificationQueryFilters) {
    const page = Math.max(1, typeof filters.page === 'string' ? parseInt(filters.page, 10) : (filters.page || ADMIN_NOTIFICATION_CONSTANTS.DEFAULT_PAGE));
    const limit = Math.max(1, typeof filters.limit === 'string' ? parseInt(filters.limit, 10) : (filters.limit || ADMIN_NOTIFICATION_CONSTANTS.DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead === 'true' || filters.isRead === true;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const [notifications, total] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminNotification.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Récupérer toutes les notifications non lues
   */
  static async getUnreadNotifications() {
    return prisma.adminNotification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marquer une notification comme lue par son ID
   */
  static async markAsRead(id: string) {
    const notification = await prisma.adminNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError('Notification introuvable.', 404);
    }

    return prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marquer toutes les notifications non lues comme lues
   */
  static async markAllAsRead() {
    return prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Supprimer une notification par son ID
   */
  static async deleteNotification(id: string) {
    const notification = await prisma.adminNotification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError('Notification introuvable.', 404);
    }

    await prisma.adminNotification.delete({
      where: { id },
    });

    return { message: 'Notification supprimée avec succès' };
  }

  /**
   * Supprimer toutes les notifications lues
   */
  static async deleteAllReadNotifications() {
    return prisma.adminNotification.deleteMany({
      where: { isRead: true },
    });
  }

  /**
   * Obtenir les statistiques du module
   */
  static async getStatistics(): Promise<NotificationStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, unread, read, todayCount] = await Promise.all([
      prisma.adminNotification.count(),
      prisma.adminNotification.count({ where: { isRead: false } }),
      prisma.adminNotification.count({ where: { isRead: true } }),
      prisma.adminNotification.count({
        where: {
          createdAt: {
            gte: today,
          },
        },
      }),
    ]);

    return {
      total,
      unread,
      read,
      today: todayCount,
    };
  }

  /**
   * Surveiller le niveau de stock pour un produit et créer une alerte si nécessaire
   */
  static async checkStockLevel(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) return;

      if (product.stockQuantity === 0) {
        // Eviter le spamming si la notification existe déjà en non lue
        const existingAlert = await prisma.adminNotification.findFirst({
          where: {
            type: 'OUT_OF_STOCK',
            isRead: false,
            metadata: {
              path: ['productId'],
              equals: product.id,
            },
          },
        });

        if (!existingAlert) {
          await this.createNotification({
            title: 'Rupture de stock',
            message: `Le produit "${product.name}" est en rupture de stock.`,
            type: 'OUT_OF_STOCK',
            metadata: { productId: product.id, slug: product.slug },
          });
        }
      } else if (product.stockQuantity <= ADMIN_NOTIFICATION_CONSTANTS.LOW_STOCK_THRESHOLD) {
        const existingAlert = await prisma.adminNotification.findFirst({
          where: {
            type: 'LOW_STOCK',
            isRead: false,
            metadata: {
              path: ['productId'],
              equals: product.id,
            },
          },
        });

        if (!existingAlert) {
          await this.createNotification({
            title: 'Stock faible',
            message: `Le stock du produit "${product.name}" est faible (${product.stockQuantity} restants).`,
            type: 'LOW_STOCK',
            metadata: { productId: product.id, stockQuantity: product.stockQuantity, slug: product.slug },
          });
        }
      }
    } catch (error: any) {
      logger.error(`[AdminNotificationService] Erreur lors de la vérification du stock: ${error.message}`);
    }
  }
}

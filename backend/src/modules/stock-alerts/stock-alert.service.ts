import { prisma } from '../../utils/prisma';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';
import { STOCK_ALERT_CONSTANTS } from './stock-alert.constants';
import { StockStats } from './stock-alert.types';

export class StockAlertService {
  /**
   * Vérifie si le produit est en stock faible et déclenche une alerte LOW_STOCK
   */
  static async checkLowStock(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.stockAlertEnabled) {
        return;
      }

      if (product.stockQuantity <= product.lowStockThreshold && product.stockQuantity > 0) {
        const now = new Date();
        const cooldownMs = STOCK_ALERT_CONSTANTS.COOLDOWN_HOURS * 60 * 60 * 1000;
        
        const isCooldownPassed = !product.lastLowStockAlertAt || 
          (now.getTime() - product.lastLowStockAlertAt.getTime() >= cooldownMs);

        if (isCooldownPassed) {
          // Vérifier si une alerte LOW_STOCK non lue existe déjà pour éviter le spam
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
            await AdminNotificationService.createNotification({
              title: 'Stock faible',
              message: `Le stock du produit "${product.name}" est faible (${product.stockQuantity} restants).`,
              type: 'LOW_STOCK',
              metadata: { productId: product.id, stockQuantity: product.stockQuantity, slug: product.slug },
            });

            await prisma.product.update({
              where: { id: productId },
              data: { lastLowStockAlertAt: now },
            });

            await AuditService.create({
              action: 'LOW_STOCK_TRIGGERED',
              entity: 'Product',
              entityId: productId,
              newValue: { stockQuantity: product.stockQuantity, lowStockThreshold: product.lowStockThreshold },
            });

            logger.info(`[StockAlertService] Alerte LOW_STOCK déclenchée pour le produit ${product.name}`);
          }
        }
      }
    } catch (error) {
      logger.error(`[StockAlertService] Erreur lors de checkLowStock pour le produit ${productId}: ${(error as Error).message}`);
    }
  }

  /**
   * Vérifie si le produit est en rupture de stock et déclenche une alerte OUT_OF_STOCK
   */
  static async checkOutOfStock(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.stockAlertEnabled) {
        return;
      }

      if (product.stockQuantity === 0) {
        // Vérifier si une alerte OUT_OF_STOCK non lue existe déjà pour éviter le spam
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
          await AdminNotificationService.createNotification({
            title: 'Rupture de stock',
            message: `Le produit "${product.name}" est en rupture de stock.`,
            type: 'OUT_OF_STOCK',
            metadata: { productId: product.id, slug: product.slug },
          });

          await AuditService.create({
            action: 'OUT_OF_STOCK_TRIGGERED',
            entity: 'Product',
            entityId: productId,
            newValue: { stockQuantity: 0 },
          });

          logger.info(`[StockAlertService] Alerte OUT_OF_STOCK déclenchée pour le produit ${product.name}`);
        }
      }
    } catch (error) {
      logger.error(`[StockAlertService] Erreur lors de checkOutOfStock pour le produit ${productId}: ${(error as Error).message}`);
    }
  }

  /**
   * Vérifie l'état de stock de tous les produits
   */
  static async checkAllProducts() {
    try {
      const products = await prisma.product.findMany();
      for (const product of products) {
        await this.checkProductStock(product.id);
      }
    } catch (error) {
      logger.error(`[StockAlertService] Erreur lors de checkAllProducts: ${(error as Error).message}`);
    }
  }

  /**
   * Réinitialise l'état d'alerte de stock d'un produit (lastLowStockAlertAt = null)
   */
  static async resetAlert(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (product && product.lastLowStockAlertAt !== null) {
        await prisma.product.update({
          where: { id: productId },
          data: { lastLowStockAlertAt: null },
        });
        logger.info(`[StockAlertService] Alerte réinitialisée pour le produit ${product.name}`);
      }
    } catch (error) {
      logger.error(`[StockAlertService] Erreur lors de resetAlert pour le produit ${productId}: ${(error as Error).message}`);
    }
  }

  /**
   * Récupère la liste des produits en stock faible
   */
  static async getLowStockProducts() {
    const products = await prisma.product.findMany({
      where: {
        stockAlertEnabled: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return products.filter((p) => p.stockQuantity <= p.lowStockThreshold);
  }

  /**
   * Récupère les statistiques globales de stock
   */
  static async getStockStats(): Promise<StockStats> {
    const products = await prisma.product.findMany();

    let lowStock = 0;
    let outOfStock = 0;
    let healthyStock = 0;

    for (const p of products) {
      if (p.stockQuantity === 0) {
        outOfStock++;
      } else if (p.stockQuantity <= p.lowStockThreshold) {
        lowStock++;
      } else {
        healthyStock++;
      }
    }

    return {
      totalProducts: products.length,
      lowStock,
      outOfStock,
      healthyStock,
    };
  }

  /**
   * Helper unifié pour traiter l'état de stock complet d'un produit
   */
  static async checkProductStock(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) return;

      if (product.stockQuantity === 0) {
        await this.checkOutOfStock(productId);
      } else if (product.stockQuantity <= product.lowStockThreshold) {
        await this.checkLowStock(productId);
      } else {
        await this.resetAlert(productId);
      }
    } catch (error) {
      logger.error(`[StockAlertService] Erreur lors de checkProductStock pour le produit ${productId}: ${(error as Error).message}`);
    }
  }
}

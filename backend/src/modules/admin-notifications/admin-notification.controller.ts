import { Request, Response, NextFunction } from 'express';
import { AdminNotificationService } from './admin-notification.service';

export class AdminNotificationController {
  /**
   * GET /api/v1/admin-notifications
   * Récupérer toutes les notifications avec pagination et filtres
   */
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = req.query;
      const result = await AdminNotificationService.getNotifications(filters);

      return res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin-notifications/unread
   * Récupérer toutes les notifications non lues
   */
  static async getUnreadNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await AdminNotificationService.getUnreadNotifications();

      return res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin-notifications/stats
   * Obtenir les statistiques des notifications
   */
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminNotificationService.getStatistics();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin-notifications/:id/read
   * Marquer une notification spécifique comme lue
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await AdminNotificationService.markAsRead(id);

      return res.status(200).json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/admin-notifications/read-all
   * Marquer toutes les notifications non lues comme lues
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminNotificationService.markAllAsRead();

      return res.status(200).json({
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues.',
        data: { count: result.count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin-notifications/:id
   * Supprimer une notification par son ID
   */
  static async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await AdminNotificationService.deleteNotification(id);

      return res.status(200).json({
        success: true,
        message: 'Notification supprimée avec succès.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin-notifications/cleanup/read
   * Supprimer toutes les notifications lues (nettoyage)
   */
  static async cleanupReadNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminNotificationService.deleteAllReadNotifications();

      return res.status(200).json({
        success: true,
        message: 'Toutes les notifications lues ont été supprimées.',
        data: { count: result.count },
      });
    } catch (error) {
      next(error);
    }
  }
}

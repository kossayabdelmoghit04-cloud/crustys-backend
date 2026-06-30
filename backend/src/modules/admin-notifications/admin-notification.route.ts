import { Router, Request, Response, NextFunction } from 'express';
import { AdminNotificationController } from './admin-notification.controller';
import { validate } from '../../middlewares/validate';
import { authenticateAdmin, requirePermissions } from '../auth/auth.middleware';
import { AppError } from '../../utils/appError';
import {
  notificationQuerySchema,
  markReadSchema,
  deleteNotificationSchema,
} from './admin-notification.validation';
import { auditTrail } from '../audit/audit.middleware';

const router = Router();

// Toutes les routes de notification nécessitent que l'utilisateur soit un administrateur authentifié
router.use(authenticateAdmin);

// Middleware personnalisé pour vérifier si l'utilisateur possède l'une des permissions nécessaires pour la lecture
const requireReadOrManageNotifications = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(new AppError('Accès non autorisé. Authentification requise.', 401));
  }
  
  const role = user.role.toUpperCase();
  if (role === 'SUPER ADMIN') {
    return next();
  }

  const permissions = user.permissions || [];
  if (permissions.includes('read:notifications') || permissions.includes('manage:notifications')) {
    return next();
  }

  return next(
    new AppError('Accès interdit. Vous ne possédez pas les permissions requises.', 403)
  );
};

/**
 * @route   GET /api/v1/admin-notifications
 * @desc    Récupérer toutes les notifications (paginées, filtrées)
 * @access  Admin (read:notifications ou manage:notifications)
 */
router.get(
  '/',
  requireReadOrManageNotifications,
  validate(notificationQuerySchema),
  AdminNotificationController.getNotifications
);

/**
 * @route   GET /api/v1/admin-notifications/unread
 * @desc    Récupérer toutes les notifications non lues
 * @access  Admin (read:notifications ou manage:notifications)
 */
router.get(
  '/unread',
  requireReadOrManageNotifications,
  AdminNotificationController.getUnreadNotifications
);

/**
 * @route   GET /api/v1/admin-notifications/stats
 * @desc    Obtenir les statistiques des notifications
 * @access  Admin (read:notifications ou manage:notifications)
 */
router.get(
  '/stats',
  requireReadOrManageNotifications,
  AdminNotificationController.getStats
);

/**
 * @route   PATCH /api/v1/admin-notifications/:id/read
 * @desc    Marquer une notification comme lue
 * @access  Admin (manage:notifications)
 */
router.patch(
  '/:id/read',
  requirePermissions('manage:notifications'),
  validate(markReadSchema),
  auditTrail({ action: 'notification_mark_read', entity: 'AdminNotification' }),
  AdminNotificationController.markAsRead
);

/**
 * @route   PATCH /api/v1/admin-notifications/read-all
 * @desc    Marquer toutes les notifications comme lues
 * @access  Admin (manage:notifications)
 */
router.patch(
  '/read-all',
  requirePermissions('manage:notifications'),
  auditTrail({ action: 'notification_mark_all_read', entity: 'AdminNotification' }),
  AdminNotificationController.markAllAsRead
);

/**
 * @route   DELETE /api/v1/admin-notifications/cleanup/read
 * @desc    Nettoyer (supprimer) toutes les notifications lues
 * @access  Admin (manage:notifications)
 */
router.delete(
  '/cleanup/read',
  requirePermissions('manage:notifications'),
  auditTrail({ action: 'notification_cleanup_read', entity: 'AdminNotification' }),
  AdminNotificationController.cleanupReadNotifications
);

/**
 * @route   DELETE /api/v1/admin-notifications/:id
 * @desc    Supprimer une notification spécifique par ID
 * @access  Admin (manage:notifications)
 */
router.delete(
  '/:id',
  requirePermissions('manage:notifications'),
  validate(deleteNotificationSchema),
  auditTrail({ action: 'notification_delete', entity: 'AdminNotification' }),
  AdminNotificationController.deleteNotification
);

export default router;

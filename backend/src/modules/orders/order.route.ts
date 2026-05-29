import { Router } from 'express';
import { OrderController } from './order.controller';
import { validate } from '../../middlewares/validate';
import { createOrderSchema, updateOrderStatusSchema, orderQuerySchema } from './order.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// Toutes les routes de commandes nécessitent d'être connecté
router.use(authenticate);

// Routes statistiques de ventes (réservé aux administrateurs)
router.get('/stats/sales', requirePermissions('read:orders'), OrderController.getSalesStatistics);

// Routes clients (Voir ses propres commandes, Créer et Annuler)
router.post('/', validate(createOrderSchema), OrderController.createOrder);
router.get('/my-orders', OrderController.getMyOrders);
router.post('/:id/cancel', OrderController.cancelOrder);

// Routes administratives (Consulter et Mettre à jour les statuts)
router.get('/', requirePermissions('read:orders'), validate(orderQuerySchema), OrderController.getAllOrders);
router.get('/:id', OrderController.getOrderById);
router.patch('/:id/status', requirePermissions('write:orders'), validate(updateOrderStatusSchema), OrderController.updateStatus);

export default router;

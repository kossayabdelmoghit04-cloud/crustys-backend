import { Router } from 'express';
import { ReservationController } from './reservation.controller';
import { validate } from '../../middlewares/validate';
import { createReservationSchema, updateReservationSchema, reservationQuerySchema } from './reservation.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// 🟢 Route PUBLIQUE - Créer une réservation
router.post('/', validate(createReservationSchema), ReservationController.createReservation);

// 🔒 Routes Protégées - Réservé aux administrateurs avec permissions associées
router.use(authenticate);

router.get(
  '/',
  requirePermissions('read:reservations'),
  validate(reservationQuerySchema),
  ReservationController.getReservations
);

router.get(
  '/:id',
  requirePermissions('read:reservations'),
  ReservationController.getReservation
);

router.patch(
  '/:id',
  requirePermissions('write:reservations'),
  validate(updateReservationSchema),
  ReservationController.updateReservation
);

router.delete(
  '/:id',
  requirePermissions('write:reservations'),
  ReservationController.deleteReservation
);

export default router;

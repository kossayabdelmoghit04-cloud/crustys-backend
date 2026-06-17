import { Router } from 'express';
import { ReservationController } from './reservation.controller';
import { validate } from '../../middlewares/validate';
import { createReservationSchema, updateReservationSchema, reservationQuerySchema } from './reservation.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';
import { auditTrail } from '../audit/audit.middleware';

const router = Router();

// 🟢 Route PUBLIQUE - Créer une réservation
router.post('/', validate(createReservationSchema), auditTrail({ action: 'reservation_create', entity: 'Reservation' }), ReservationController.createReservation);

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
  auditTrail({ action: 'reservation_update', entity: 'Reservation' }),
  ReservationController.updateReservation
);

router.delete(
  '/:id',
  requirePermissions('write:reservations'),
  auditTrail({ action: 'reservation_delete', entity: 'Reservation' }),
  ReservationController.deleteReservation
);

export default router;

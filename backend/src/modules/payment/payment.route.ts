import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { validate } from '../../middlewares/validate';
import { createPaymentIntentSchema, refundPaymentSchema, paymentQuerySchema } from './payment.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// 🟢 Point d'entrée Webhook Stripe - Doit être public et parsé en RAW
router.post(
  '/webhook',
  // Note: le parsing express.raw() sera appliqué directement dans app.ts avant le body parser global
  PaymentController.handleWebhook
);

// 🔒 Routes Privées (Authentification requise)
router.use(authenticate);

// 💳 Création d'un PaymentIntent Stripe pour le client
router.post('/create-intent', validate(createPaymentIntentSchema), PaymentController.createPaymentIntent);

// 📊 Routes Administrateurs (Consulter l'historique et rembourser)
router.get('/', requirePermissions('read:payments'), validate(paymentQuerySchema), PaymentController.getPayments);
router.get('/:id', requirePermissions('read:payments'), PaymentController.getPayment);
router.post('/:id/refund', requirePermissions('write:payments'), validate(refundPaymentSchema), PaymentController.refundPayment);

export default router;
export { router as paymentRouter };

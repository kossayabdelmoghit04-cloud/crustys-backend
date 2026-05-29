import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { validate } from '../../middlewares/validate';
import { analyticsQuerySchema } from './analytics.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// Toutes les routes d'analytics nécessitent une authentification et la permission 'read:analytics'
router.use(authenticate);
router.use(requirePermissions('read:analytics'));

// 📊 Tableau de bord principal
router.get('/dashboard', validate(analyticsQuerySchema), AnalyticsController.getDashboard);

// 💰 Finances & Revenus
router.get('/revenue', validate(analyticsQuerySchema), AnalyticsController.getRevenueAnalytics);

// 📦 Volumes de commandes
router.get('/orders', validate(analyticsQuerySchema), AnalyticsController.getOrderAnalytics);

// 🍔 Palmarès produits
router.get('/products', validate(analyticsQuerySchema), AnalyticsController.getProductAnalytics);

// 👥 Fidélité & Comportement client
router.get('/customers', validate(analyticsQuerySchema), AnalyticsController.getCustomerAnalytics);

export default router;
export { router as analyticsRouter };

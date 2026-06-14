import { Router } from 'express';
import { MetricsController } from './metrics.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const metricsRouter = Router();

/**
 * @route   GET /api/v1/metrics
 * @desc    Expose Prometheus metrics for scraping
 * @access  Private (Admin only)
 */
metricsRouter.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  MetricsController.getMetrics
);

export default metricsRouter;

import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';
import { logger } from '../../utils/logger';

export class MetricsController {
  /**
   * GET handler for retrieving Prometheus format metrics
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await MetricsService.getPrometheusMetrics();
      res.setHeader('Content-Type', MetricsService.getContentType());
      res.status(200).send(metrics);
    } catch (error: any) {
      logger.error(`[MetricsController Error] Failed to retrieve metrics: ${error.message}`);
      next(error);
    }
  }
}

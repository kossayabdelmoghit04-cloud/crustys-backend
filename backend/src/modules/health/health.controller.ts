import { Request, Response, NextFunction } from 'express';
import { HealthService } from './health.service';
import { env } from '../../config/env';

export class HealthController {
  /**
   * @route   GET /health
   * @desc    Retrieve overall health status and service connectivity metrics
   * @access  Public
   */
  static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbOk = await HealthService.checkDatabase();
      const redisOk = await HealthService.checkRedis();
      
      const isHealthy = dbOk && redisOk;
      
      res.status(200).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: HealthService.getUptime(),
        environment: env.NODE_ENV,
        version: HealthService.getAppVersion(),
        services: {
          database: dbOk ? 'up' : 'down',
          redis: redisOk ? 'up' : 'down'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /ready
   * @desc    Readiness probe for Railway/Kubernetes to check database & redis status
   * @access  Public
   */
  static async getReady(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbOk = await HealthService.checkDatabase();
      const redisOk = await HealthService.checkRedis();
      
      if (!dbOk || !redisOk) {
        res.status(503).json({
          status: 'unavailable',
          timestamp: new Date().toISOString(),
          services: {
            database: dbOk ? 'up' : 'down',
            redis: redisOk ? 'up' : 'down'
          }
        });
        return;
      }
      
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /live
   * @desc    Liveness probe to check if the Node.js process is active
   * @access  Public
   */
  static async getLive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        status: 'alive'
      });
    } catch (error) {
      next(error);
    }
  }
}

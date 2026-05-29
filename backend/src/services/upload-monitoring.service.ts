import { UploadMetricsTracker } from '../metrics/upload.metrics';
import { QueueMetricsTracker } from '../metrics/queue.metrics';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface IMonitoringDashboard {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uploads: {
    successCount: number;
    failureCount: number;
    successRate: number;
    averageProcessingDuration: number;
    averageCdnUploadTime: number;
    averageCompressionRatio: number;
    totalRetryCount: number;
  };
  queues: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
    latencyMs: number;
  };
  database: {
    failedUploadsRegistered: number;
    recentLogsCount: number;
  };
  environment: {
    nodeVersion: string;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
    pid: number;
  };
}

export class UploadMonitoringService {
  /**
   * Synthétise un dashboard de diagnostic complet pour le monitoring de l'infrastructure média.
   */
  static async getDashboardMetrics(): Promise<IMonitoringDashboard> {
    try {
      const [uploadStats, queueStats, failedDbCount, recentLogsCount] = await Promise.all([
        UploadMetricsTracker.getReport(),
        QueueMetricsTracker.getReport(),
        (prisma as any).failedUpload.count(),
        (prisma as any).mediaProcessingLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Logs des dernières 24h
            },
          },
        }),
      ]);

      // Déduction de la santé globale de l'infra
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (queueStats.failed > 20 || uploadStats.successRate < 80) {
        status = 'degraded';
      }
      if (queueStats.paused || uploadStats.successRate < 50) {
        status = 'unhealthy';
      }

      return {
        timestamp: new Date().toISOString(),
        status,
        uploads: uploadStats,
        queues: queueStats,
        database: {
          failedUploadsRegistered: failedDbCount,
          recentLogsCount,
        },
        environment: {
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          pid: process.pid,
        },
      };
    } catch (err) {
      logger.error('[MONITORING SERVICE ERROR] Échec de la compilation des métriques de monitoring :', err);
      throw err;
    }
  }

  /**
   * Enregistre un log d'étape de traitement en base de données pour un tracing fin.
   */
  static async logStep(
    jobId: string,
    fileName: string,
    step: 'VALIDATION' | 'PROCESSING' | 'UPLOADING' | 'SUCCESS' | 'FAILED',
    duration: number,
    message: string
  ): Promise<void> {
    try {
      await (prisma as any).mediaProcessingLog.create({
        data: {
          jobId,
          fileName,
          step,
          duration,
          message,
        },
      });
    } catch (err) {
      logger.error(`[MONITORING SERVICE ERROR] Impossible de persister le log d'étape en base de données :`, err);
    }
  }
}

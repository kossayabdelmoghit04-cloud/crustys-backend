import { UploadMonitoringService, IMonitoringDashboard } from '../services/upload-monitoring.service';
import { logger } from '../utils/logger';

/**
 * Job d'agrégation et de monitoring des performances médias.
 */
export class UploadMetricsJob {
  static async run(): Promise<IMonitoringDashboard> {
    logger.info('[METRICS JOB] Génération du rapport de performance et santé média...');
    try {
      const metrics = await UploadMonitoringService.getDashboardMetrics();
      logger.info(`[METRICS JOB SUCCESS] Rapport consolidé généré avec succès.`);
      return metrics;
    } catch (err) {
      logger.error('[METRICS JOB FAILURE] Échec lors de la génération du rapport :', err);
      throw err;
    }
  }
}

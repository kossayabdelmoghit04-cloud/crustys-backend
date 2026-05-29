import Redis from 'ioredis';
import { redisConfig } from '../queues/queue.config';
import { logger } from '../utils/logger';

export interface IUploadMetricsReport {
  successCount: number;
  failureCount: number;
  successRate: number;
  averageProcessingDuration: number;
  averageCdnUploadTime: number;
  averageCompressionRatio: number;
  totalRetryCount: number;
}

export class UploadMetricsTracker {
  private static redis = new Redis({
    host: (redisConfig as any).host,
    port: (redisConfig as any).port,
    password: (redisConfig as any).password,
  });
  private static prefix = 'metrics:upload:';

  /**
   * Incrémente le compteur de succès, ajoute la durée et le taux de compression.
   */
  static async recordSuccess(
    processingDuration: number,
    cdnUploadDuration: number,
    compressionRatio: number
  ): Promise<void> {
    try {
      const p = this.prefix;
      await this.redis.multi()
        .incr(`${p}success`)
        .incrby(`${p}total_processing_duration`, processingDuration)
        .incrby(`${p}total_cdn_upload_duration`, cdnUploadDuration)
        .incrby(`${p}total_compression_ratio`, Math.round(compressionRatio * 100)) // Stocké en centièmes
        .exec();
    } catch (err) {
      logger.error('[METRICS TRACKER ERROR] Échec de l\'enregistrement du succès :', err);
    }
  }

  /**
   * Incrémente le compteur d'échecs.
   */
  static async recordFailure(): Promise<void> {
    try {
      await this.redis.incr(`${this.prefix}failure`);
    } catch (err) {
      logger.error('[METRICS TRACKER ERROR] Échec de l\'enregistrement de l\'échec :', err);
    }
  }

  /**
   * Enregistre un retry.
   */
  static async recordRetry(): Promise<void> {
    try {
      await this.redis.incr(`${this.prefix}retries`);
    } catch (err) {
      logger.error('[METRICS TRACKER ERROR] Échec de l\'enregistrement du retry :', err);
    }
  }

  /**
   * Récupère le rapport consolidé de l'ensemble des métriques d'uploads.
   */
  static async getReport(): Promise<IUploadMetricsReport> {
    try {
      const p = this.prefix;
      const [
        successStr,
        failureStr,
        totProcStr,
        totCdnStr,
        totCompStr,
        retriesStr,
      ] = await Promise.all([
        this.redis.get(`${p}success`),
        this.redis.get(`${p}failure`),
        this.redis.get(`${p}total_processing_duration`),
        this.redis.get(`${p}total_cdn_upload_duration`),
        this.redis.get(`${p}total_compression_ratio`),
        this.redis.get(`${p}retries`),
      ]);

      const success = parseInt(successStr || '0', 10);
      const failure = parseInt(failureStr || '0', 10);
      const total = success + failure;
      
      const successRate = total > 0 ? Number(((success / total) * 100).toFixed(2)) : 100;
      const averageProcessingDuration = success > 0 ? Number((parseInt(totProcStr || '0', 10) / success).toFixed(2)) : 0;
      const averageCdnUploadTime = success > 0 ? Number((parseInt(totCdnStr || '0', 10) / success).toFixed(2)) : 0;
      const averageCompressionRatio = success > 0 ? Number((parseInt(totCompStr || '0', 10) / success / 100).toFixed(2)) : 0;
      const totalRetryCount = parseInt(retriesStr || '0', 10);

      return {
        successCount: success,
        failureCount: failure,
        successRate,
        averageProcessingDuration,
        averageCdnUploadTime,
        averageCompressionRatio,
        totalRetryCount,
      };
    } catch (err) {
      logger.error('[METRICS TRACKER ERROR] Échec de la génération du rapport de métriques :', err);
      return {
        successCount: 0,
        failureCount: 0,
        successRate: 100,
        averageProcessingDuration: 0,
        averageCdnUploadTime: 0,
        averageCompressionRatio: 0,
        totalRetryCount: 0,
      };
    }
  }
}

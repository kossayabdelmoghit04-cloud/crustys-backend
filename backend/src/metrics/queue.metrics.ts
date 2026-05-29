import { Queue } from 'bullmq';
import { redisConfig } from '../queues/queue.config';
import { logger } from '../utils/logger';

export interface IQueueMetricsReport {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  latencyMs: number;
}

export class QueueMetricsTracker {
  private static imageQueue: Queue | null = null;

  /**
   * Enregistre l'instance de la queue d'images principale pour en inspecter l'état.
   */
  static registerQueue(queue: Queue): void {
    this.imageQueue = queue;
  }

  /**
   * Génère un rapport de santé complet de la queue BullMQ.
   */
  static async getReport(): Promise<IQueueMetricsReport> {
    if (!this.imageQueue) {
      // Fallback si la queue n'a pas été enregistrée directement, on l'instancie brièvement
      try {
        this.imageQueue = new Queue('image-processing', { connection: redisConfig });
      } catch (err) {
        logger.error('[QUEUE METRICS ERROR] Impossible d\'instancier la queue de métriques :', err);
        return this.emptyReport();
      }
    }

    try {
      const q = this.imageQueue;
      const [
        waiting,
        active,
        completed,
        failed,
        delayed,
        isPaused,
        jobs,
      ] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getCompletedCount(),
        q.getFailedCount(),
        q.getDelayedCount(),
        q.isPaused(),
        q.getJobs(['active'], 0, 1),
      ]);

      // Calcul approximatif de la latence de file (temps d'attente moyen avant traitement)
      let latencyMs = 0;
      if (jobs.length > 0) {
        const firstJob = jobs[0];
        if (firstJob.processedOn && firstJob.timestamp) {
          latencyMs = firstJob.processedOn - firstJob.timestamp;
        }
      }

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
        latencyMs,
      };
    } catch (err) {
      logger.error('[QUEUE METRICS ERROR] Échec de récupération des métriques BullMQ :', err);
      return this.emptyReport();
    }
  }

  private static emptyReport(): IQueueMetricsReport {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: false,
      latencyMs: 0,
    };
  }
}

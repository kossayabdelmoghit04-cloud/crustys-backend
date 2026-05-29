import { prisma } from '../utils/prisma';
import { imageQueue } from '../queues/image.queue';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appError';

export interface IFailedUploadInfo {
  id: string;
  jobId: string;
  originalName: string;
  prefix: string;
  errorReason: string;
  attempts: number;
  createdAt: Date;
}

export class FailedUploadsJob {
  /**
   * Récupère la liste de tous les uploads définitivement échoués (Dead Letter Queue logique).
   */
  static async getFailedUploads(): Promise<IFailedUploadInfo[]> {
    try {
      return await (prisma as any).failedUpload.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      logger.error('[FAILED UPLOADS JOB] Échec de la récupération des archives d\'échecs :', err);
      return [];
    }
  }

  /**
   * Relance manuellement une tâche d'upload depuis Redis.
   */
  static async retryFailedJob(jobId: string): Promise<boolean> {
    try {
      const job = await imageQueue.getJob(jobId);
      if (!job) {
        throw new AppError('La tâche spécifiée est introuvable ou a été archivée.', 404);
      }

      await job.retry();
      
      // Supprimer l'échec consigné en base de données
      await (prisma as any).failedUpload.deleteMany({
        where: { jobId },
      });

      logger.info(`[FAILED UPLOADS JOB] Job #${jobId} relancé avec succès.`);
      return true;
    } catch (err) {
      logger.error(`[FAILED UPLOADS JOB] Échec du relancement de la tâche #${jobId} :`, err);
      throw err;
    }
  }
}

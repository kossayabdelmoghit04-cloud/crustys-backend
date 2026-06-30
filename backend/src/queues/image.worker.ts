import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import * as Sentry from '@sentry/node';
import { redisConfig } from './queue.config';
import { logger } from '../utils/logger';
import { ImageProcessingJob } from '../jobs/image-processing.job';
import { prisma } from '../utils/prisma';
import { UploadMetricsTracker } from '../metrics/upload.metrics';
import { UploadMonitoringService } from '../services/upload-monitoring.service';
import { UploadAuditLogger } from '../logs/upload.audit';
import { IImageJobPayload } from './image.queue';

// Initialisation du worker d'images arrière-plan avec une concurrence configurée sur 3
export const imageWorker = new Worker<IImageJobPayload>(
  'image-processing',
  async (job: Job<IImageJobPayload>) => {
    const startTime = Date.now();
    const { tempFilePath, originalname, prefix, fingerprint, ipAddress, tracingId } = job.data;

    logger.info(`[WORKER] [STARTED] Traitement du Job #${job.id} (${originalname}) démarré. Tracing ID: ${tracingId}`);
    
    // Log d'audit de démarrage du traitement en arrière-plan
    UploadAuditLogger.logEvent({
      action: 'WORKER_STARTED',
      tracingId,
      fileName: originalname,
      prefix,
      ipAddress,
      metadata: { jobId: job.id },
    });

    await UploadMonitoringService.logStep(
      job.id || 'unknown',
      originalname,
      'PROCESSING',
      0,
      'Démarrage du traitement par le background worker.'
    );

    // 1. Vérifier la présence physique du fichier temporaire
    if (!fs.existsSync(tempFilePath)) {
      logger.error(`[WORKER FAILURE] Fichier temporaire introuvable à l'adresse : "${tempFilePath}"`);
      throw new Error(`Le fichier temporaire à l'adresse ${tempFilePath} a expiré ou a été supprimé.`);
    }

    try {
      // 2. Délégation au Job de traitement d'image
      const result = await ImageProcessingJob.run(job);

      // 3. Nettoyage du fichier temporaire après succès
      await cleanTempFile(tempFilePath);

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur inconnue dans le worker.';
      logger.error(`[WORKER EXCEPTION] Job #${job.id} en échec :`, err);

      await UploadMonitoringService.logStep(
        job.id || 'unknown',
        originalname,
        'FAILED',
        Date.now() - startTime,
        `Erreur d'exécution : ${errorMsg}`
      );

      // Nettoie aussi le fichier temporaire en cas de rejet définitif ou d'erreur critique
      await cleanTempFile(tempFilePath);

      throw err; // Relancer pour que BullMQ gère les retries automatiques
    }
  },
  {
    connection: redisConfig,
    concurrency: 3, // Permet le traitement de 3 images en parallèle sur la boucle d'événements
    limiter: {
      max: 10,
      duration: 1000, // Limite globale de sécurité pour éviter la saturation du thread Sharp
    },
  }
);

// Écouteur global pour enregistrer les échecs définitifs (Dead Letter Queue Strategy)
imageWorker.on('failed', async (job, err) => {
  if (!job) return;

  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts || 3;
  const queueName = 'image-processing';
  const jobId = job.id || 'unknown';

  logger.warn(`[WORKER ALERT] Échec de la tâche Job #${jobId} (Tentative ${attemptsMade}/${maxAttempts}). Raison: ${err.message}`);
  
  await UploadMetricsTracker.recordFailure();

  // Capture job failure in Sentry
  Sentry.captureException(err, {
    tags: {
      queueName,
      jobId,
      type: 'job-failure',
      attemptsMade: String(attemptsMade),
      maxAttempts: String(maxAttempts),
    },
    extra: {
      jobData: job.data,
      attemptsMade,
      maxAttempts,
    },
  });

  // En cas d'épuisement total des essais (Dead Letter Queue logique)
  if (attemptsMade >= maxAttempts) {
    logger.error(`[WORKER CRITICAL] Job #${jobId} a épuisé toutes ses tentatives. Transfert vers la table des échecs permanents.`);

    // Capture retries exhausted event in Sentry
    Sentry.captureMessage(`[BullMQ] Tâche ${jobId} sur ${queueName} a épuisé ses tentatives (${attemptsMade}/${maxAttempts}).`, {
      level: 'error',
      tags: {
        queueName,
        jobId,
        type: 'retries-exhausted',
      },
      extra: {
        attemptsMade,
        maxAttempts,
        error: err.message,
      },
    });
    
    try {
      await (prisma as any).failedUpload.create({
        data: {
          jobId: job.id || 'unknown',
          originalName: job.data.originalname,
          prefix: job.data.prefix,
          errorReason: err.message || 'Tentatives épuisées sans motif explicite.',
          attempts: attemptsMade,
          stackTrace: err.stack || null,
        },
      });
      
      UploadAuditLogger.logEvent({
        action: 'FAILED_UPLOAD',
        tracingId: job.data.tracingId,
        fileName: job.data.originalname,
        attempts: attemptsMade,
        error: err.message,
        metadata: { jobId: job.id, maxAttempts },
      });
    } catch (dbErr) {
      logger.error(`[WORKER CRITICAL ERROR] Impossible de sauvegarder l'échec de la tâche en base :`, dbErr);
    }
  } else {
    // Tâche réenregistrée pour retry ultérieur (exponential backoff)
    await UploadMetricsTracker.recordRetry();
    UploadAuditLogger.logEvent({
      action: 'RETRY_ATTEMPT',
      tracingId: job.data.tracingId,
      fileName: job.data.originalname,
      attempts: attemptsMade,
      metadata: { jobId: job.id, nextAttempt: attemptsMade + 1 },
    });
  }
});

// Aide à la suppression sécurisée
async function cleanTempFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`[WORKER] Fichier temporaire nettoyé avec succès : "${filePath}"`);
    }
  } catch (cleanErr) {
    logger.error(`[WORKER WARNING] Échec du nettoyage du fichier temporaire "${filePath}" :`, cleanErr);
  }
}

import { QueueEvents } from 'bullmq';
import { redisConfig } from './queue.config';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/node';
import { UploadAuditLogger } from '../logs/upload.audit';

/**
 * Configure les écouteurs d'événements globaux pour la file BullMQ spécifiée.
 * Offre une observabilité instantanée des états d'attente, de traitement, de réussite et d'échec.
 * 
 * @param queueName Nom de la file d'attente à observer (ex: 'image-processing')
 */
export const registerQueueEvents = (queueName: string): QueueEvents => {
  const queueEvents = new QueueEvents(queueName, { connection: redisConfig });

  queueEvents.on('waiting', ({ jobId }) => {
    logger.info(`[QUEUE EVENT] [WAITING] Tâche ${jobId} en attente de traitement.`);
  });

  queueEvents.on('active', ({ jobId }) => {
    logger.info(`[QUEUE EVENT] [ACTIVE] Tâche ${jobId} prise en charge par un worker.`);
  });

  queueEvents.on('completed', ({ jobId }) => {
    logger.info(`[QUEUE EVENT] [COMPLETED] Tâche ${jobId} exécutée avec succès.`);
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger.error(`[QUEUE EVENT] [FAILED] Tâche ${jobId} a échoué. Motif : "${failedReason}"`);
    
    // Log d'audit pour des raisons de conformité et de monitoring de sécurité
    UploadAuditLogger.logEvent({
      action: 'FAILED_UPLOAD',
      tracingId: jobId,
      error: failedReason,
      metadata: { queueName },
    });
  });

  queueEvents.on('stalled', ({ jobId }) => {
    logger.warn(`[QUEUE EVENT] [STALLED] Tâche ${jobId} est bloquée (Stalled). Elle sera relancée par le gestionnaire.`);
  });

  queueEvents.on('error', (err) => {
    logger.error(`[QUEUE EVENT] [ERROR] Erreur système sur la file d'événements :`, err);
    Sentry.captureException(err, {
      tags: {
        queueName,
        type: 'queue-system-error',
      },
    });
  });

  logger.info(`[QUEUE EVENTS] Écouteurs d'événements globaux enregistrés pour la file "${queueName}"`);
  return queueEvents;
};

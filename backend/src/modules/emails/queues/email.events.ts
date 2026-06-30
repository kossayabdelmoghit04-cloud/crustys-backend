import { emailWorker } from './email.worker';
import * as Sentry from '@sentry/node';
import { logger } from '../../../utils/logger';

// Metrics variables for health check monitoring
export const queueMetrics = {
  sentCount: 0,
  failedCount: 0,
  retriesCount: 0,
  stalledCount: 0,
};

/**
 * Register Event Listeners on the Worker instance to monitor queue health and status.
 */

// 1. Emitted when a job starts processing
emailWorker.on('active', (job) => {
  logger.info(`[Email Worker Event] Job ${job.id} of template '${job.name}' is now ACTIVE.`);
});

// 2. Emitted when a job completes successfully
emailWorker.on('completed', (job, result) => {
  queueMetrics.sentCount += 1;
  const startedAt = job.processedOn;
  const duration = startedAt ? Date.now() - startedAt : 0;
  
  logger.info(
    `[Email Worker Event] Job ${job.id} COMPLETED. Duration: ${duration}ms | Provider: ${result?.provider || 'unknown'}`
  );
});

// 3. Emitted when a job fails (either permanently or for a retry attempt)
emailWorker.on('failed', (job, err) => {
  queueMetrics.failedCount += 1;
  const queueName = 'emailQueue';
  
  if (job) {
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;
    const jobId = job.id || 'unknown';

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
    
    if (attemptsMade < maxAttempts) {
      queueMetrics.retriesCount += 1;
      logger.warn(
        `[Email Worker Event] Job ${jobId} FAILED (Attempt ${attemptsMade}/${maxAttempts}). Will retry. Reason: ${err.message}`
      );
    } else {
      logger.error(
        `[Email Worker Event] Job ${jobId} FAILED PERMANENTLY after ${attemptsMade} attempts. Reason: ${err.message}`
      );

      // Capture retries exhausted in Sentry
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
    }
  } else {
    logger.error(`[Email Worker Event] A job failed but job object was undefined. Reason: ${err.message}`);
    Sentry.captureException(err, { tags: { queueName, type: 'job-failure-undefined-job' } });
  }
});

// 4. Emitted when a job stalls (active worker crashes or goes offline)
emailWorker.on('stalled', (jobId) => {
  queueMetrics.stalledCount += 1;
  logger.warn(`[Email Worker Event] Job ${jobId} has STALLED. It will be reclaimed and retried by another worker.`);
  Sentry.captureMessage(`[BullMQ] Tâche ${jobId} sur emailQueue est bloquée (stalled).`, {
    level: 'warning',
    tags: { queueName: 'emailQueue', jobId, type: 'job-stalled' },
  });
});

// 5. Emitted when worker encounters a general operational error
emailWorker.on('error', (err) => {
  logger.error(`[Email Worker Event Error] General worker operational failure: ${err.message}`);
  Sentry.captureException(err, { tags: { queueName: 'emailQueue', type: 'worker-error' } });
});

logger.info('[Email Worker Events] Listeners attached to email worker instance');
export default emailWorker;

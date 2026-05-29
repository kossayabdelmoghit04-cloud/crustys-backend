import { emailWorker } from './email.worker';
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
  
  if (job) {
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;
    
    if (attemptsMade < maxAttempts) {
      queueMetrics.retriesCount += 1;
      logger.warn(
        `[Email Worker Event] Job ${job.id} FAILED (Attempt ${attemptsMade}/${maxAttempts}). Will retry. Reason: ${err.message}`
      );
    } else {
      logger.error(
        `[Email Worker Event] Job ${job.id} FAILED PERMANENTLY after ${attemptsMade} attempts. Reason: ${err.message}`
      );
    }
  } else {
    logger.error(`[Email Worker Event] A job failed but job object was undefined. Reason: ${err.message}`);
  }
});

// 4. Emitted when a job stalls (active worker crashes or goes offline)
emailWorker.on('stalled', (jobId) => {
  queueMetrics.stalledCount += 1;
  logger.warn(`[Email Worker Event] Job ${jobId} has STALLED. It will be reclaimed and retried by another worker.`);
});

// 5. Emitted when worker encounters a general operational error
emailWorker.on('error', (err) => {
  logger.error(`[Email Worker Event Error] General worker operational failure: ${err.message}`);
});

logger.info('[Email Worker Events] Listeners attached to email worker instance');
export default emailWorker;

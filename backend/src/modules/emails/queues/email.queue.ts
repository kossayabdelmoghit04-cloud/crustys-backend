import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../../../config/redis';
import { logger } from '../../../utils/logger';
import { DIAGNOSTIC_CONFIG } from '../../../config/diagnostics';

// Queue Name Constant
export const EMAIL_QUEUE_NAME = 'emailQueue';

/**
 * BullMQ Email Queue Initialization
 */
export const emailQueue = DIAGNOSTIC_CONFIG.enableBullMQ
  ? new Queue(EMAIL_QUEUE_NAME, {
      connection: redisConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // Starts at 2s, then 4s, then 8s
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs in Redis
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs for debugging
        },
      },
    })
  : ({
      add: async (name: string, data: any) => {
        logger.info(`[Email Queue Stub] ADD job ${name} with data: ${JSON.stringify(data)}`);
        return { id: 'stub-job-id', data };
      },
      getJobCounts: async () => {
        return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
      },
    } as unknown as Queue);

if (DIAGNOSTIC_CONFIG.enableBullMQ) {
  logger.info(`[Email Queue] Queue '${EMAIL_QUEUE_NAME}' initialized successfully`);
} else {
  logger.info(`[Email Queue] Queue '${EMAIL_QUEUE_NAME}' STUB initialized`);
}

import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../../../config/redis';
import { logger } from '../../../utils/logger';

// Queue Name Constant
export const EMAIL_QUEUE_NAME = 'emailQueue';

/**
 * BullMQ Email Queue Initialization
 */
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
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
});

logger.info(`[Email Queue] Queue '${EMAIL_QUEUE_NAME}' initialized successfully`);

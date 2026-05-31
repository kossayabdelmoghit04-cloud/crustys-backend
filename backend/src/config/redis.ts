import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

import { DIAGNOSTIC_CONFIG } from './diagnostics';

/**
 * Shared Redis connection options for BullMQ Queue and Worker instances.
 * Note: BullMQ requires maxRetriesPerRequest to be null.
 */
export const redisConnectionOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    // Exponential backoff strategy with cap at 10 seconds
    const delay = Math.min(times * 100, 10000);
    logger.warn(`[Redis] Connection attempt #${times}. Reconnecting in ${delay}ms...`);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Reconnect when a readonly error occurs (e.g. failover)
      return true;
    }
    return false;
  }
};

/**
 * Factory to create safe standalone Redis clients
 */
export function createRedisClient(): Redis {
  const client = new Redis({
    ...redisConnectionOptions,
    // Standalone client does NOT need maxRetriesPerRequest to be null
    maxRetriesPerRequest: 20
  });

  client.on('connect', () => {
    logger.info(`[Redis] Connection established successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  });

  client.on('error', (err) => {
    logger.error(`[Redis Error] Socket connection failed: ${err.message}`);
  });

  client.on('close', () => {
    logger.warn('[Redis] Connection closed');
  });

  return client;
}

// Standalone client instance for general purpose key-value usage or health checks
export const redisClient = DIAGNOSTIC_CONFIG.enableStandaloneRedis
  ? createRedisClient()
  : ({
      on: () => {},
      quit: async () => {},
    } as any);

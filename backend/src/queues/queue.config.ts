import { ConnectionOptions } from 'bullmq';
import { logger } from '../utils/logger';

// Configuration de la connexion Redis basée sur les variables d'environnement
export const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Requis par BullMQ pour éviter les plantages lors des interruptions
  enableReadyCheck: false,
};

logger.info(`[QUEUE CONFIG] Connexion Redis configurée sur ${redisConfig.host}:${redisConfig.port}`);

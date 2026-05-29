import { Queue } from 'bullmq';
import { redisConfig } from './queue.config';
import { logger } from '../utils/logger';
import { QueueMetricsTracker } from '../metrics/queue.metrics';

export interface IImageJobPayload {
  tempFilePath: string;
  originalname: string;
  mimetype: string;
  prefix: string;
  fingerprint: string;
  ipAddress: string;
  tracingId: string;
}

// Déclaration de la file d'attente principale BullMQ pour le traitement asynchrone des images
export const imageQueue = new Queue<IImageJobPayload>('image-processing', {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Ré-essaye jusqu'à 3 fois en cas d'erreur
    backoff: {
      type: 'exponential', // Attente exponentielle progressive (ex: 5s, 10s, 20s...)
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Conserve l'historique des succès pendant 24 heures
      count: 1000, // Limite à 1000 tâches terminées stockées dans Redis
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Conserve l'historique des échecs pendant 7 jours pour débugger
      count: 5000,
    },
  },
});

// Enregistrement de la file dans le tracker pour le calcul des statistiques de santé en temps réel
QueueMetricsTracker.registerQueue(imageQueue);

logger.info('[QUEUE SYSTEM] File d\'attente "image-processing" initialisée avec succès.');

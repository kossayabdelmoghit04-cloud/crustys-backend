import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import './modules/emails/queues/email.events';

// Initialisation du worker d'images arrière-plan, des écouteurs d'événements et des tâches récurrentes Cron
import './queues/image.worker';
import { registerQueueEvents } from './queues/queue.events';
import { initMediaCronJobs } from './cron/cleanup.cron';

registerQueueEvents('image-processing');
initMediaCronJobs();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('💥 Unhandled Rejection! Shutting down...');
  logger.error(err.message, { stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('💥 Uncaught Exception! Shutting down...');
  logger.error(err.message, { stack: err.stack });
  process.exit(1);
});

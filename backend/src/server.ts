import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { DIAGNOSTIC_CONFIG } from './config/diagnostics';

console.log('⚡ [Server] Bootstrapping server instance...');
console.log('   Configured Port:', env.PORT);

// Conditionally load Group B background services to isolate potential Redis/BullMQ timeouts
if (DIAGNOSTIC_CONFIG.enableBullMQ) {
  console.log('⚡ [Server] Loading background queues, workers, and events...');
  
  // Register email queue events
  import('./modules/emails/queues/email.events').then(() => {
    logger.info('[Email Queues] Event listeners registered.');
  });
  
  // Load background image worker
  import('./queues/image.worker').then(() => {
    logger.info('[Image Queues] Background worker started.');
  });
  
  // Register image queue events
  const { registerQueueEvents } = require('./queues/queue.events');
  registerQueueEvents('image-processing');
} else {
  console.log('⚡ [Server] Group B BullMQ and Background Workers are STUBBED/DISABLED.');
}

// Conditionally load Media Cron Maintenance
if (DIAGNOSTIC_CONFIG.enableCron) {
  console.log('⚡ [Server] Loading Cron Jobs...');
  const { initMediaCronJobs } = require('./cron/cleanup.cron');
  initMediaCronJobs();
} else {
  console.log('⚡ [Server] Group B Media Cron Jobs are STUBBED/DISABLED.');
}

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  console.log('🚀 Server successfully bound and listening.');
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

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { Express } from 'express';
import { env } from './env';
import { logger } from '../utils/logger';
import { AdminNotificationService } from '../modules/admin-notifications/admin-notification.service';

// Global state for health endpoints
export const sentryState = {
  lastErrorTimestamp: null as string | null,
};

// Update last error timestamp
export const recordSentryErrorTimestamp = () => {
  sentryState.lastErrorTimestamp = new Date().toISOString();
};

/**
 * Initialize Sentry on the Express application
 */
export function initializeSentry(app: Express): void {
  const dsn = env.SENTRY_DSN;
  const environment = env.SENTRY_ENVIRONMENT;
  const tracesSampleRate = env.SENTRY_TRACES_SAMPLE_RATE;
  const profilesSampleRate = env.SENTRY_PROFILES_SAMPLE_RATE;

  logger.info(`🔌 [Sentry] Initializing Sentry for environment: ${environment}`);

  try {
    Sentry.init({
      dsn,
      environment,
      tracesSampleRate,
      profilesSampleRate,
      release: process.env.npm_package_version || '1.0.0',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
        new ProfilingIntegration(),
      ],
    });

    logger.info('✅ [Sentry] Sentry initialized successfully.');
  } catch (error: any) {
    logger.error(`❌ [Sentry Error] Failed to initialize Sentry: ${error.message}`);
    // Non-test environments must fail to start if Sentry variables are invalid
    if (env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

/**
 * Critical failure helper: reports to Sentry and triggers an Admin Notification
 */
export async function reportCriticalFailure(
  error: Error,
  type: 'DATABASE_DOWN' | 'REDIS_FAILURE' | 'STRIPE_FAILURE' | 'SECURITY_ALERT',
  title: string,
  message: string,
  extraContext: Record<string, any> = {}
): Promise<string> {
  recordSentryErrorTimestamp();
  
  // Capture in Sentry
  const eventId = Sentry.captureException(error, {
    level: 'fatal',
    tags: { critical: 'true', failureType: type },
    extra: extraContext,
  });

  // Trigger Admin Notification
  try {
    await AdminNotificationService.createNotification({
      title,
      message: `${message} (Sentry Event: ${eventId})`,
      type: 'SECURITY_ALERT',
      metadata: { ...extraContext, sentryEventId: eventId, failureType: type },
    });
  } catch (err: any) {
    logger.error(`[Sentry Config] Failed to create critical failure notification: ${err.message}`);
  }

  return eventId;
}

/**
 * Performance monitoring SLA checker helper
 */
export function checkPerformanceSLA(
  durationMs: number,
  type: 'API' | 'Prisma' | 'Redis' | 'Stripe',
  name: string,
  extra: Record<string, any> = {}
): void {
  const thresholds = {
    API: 2000,     // > 2 sec
    Prisma: 1000,  // > 1 sec
    Redis: 500,    // > 500 ms
    Stripe: 3000,  // > 3 sec
  };

  const limit = thresholds[type];
  if (durationMs > limit) {
    const message = `⚠️ SLA Violé [${type}]: ${name} a pris ${durationMs}ms (Seuil: ${limit}ms)`;
    logger.warn(message);

    Sentry.captureMessage(message, {
      level: 'warning',
      tags: { performance_sla: 'true', metric_type: type },
      extra: { ...extra, durationMs, thresholdMs: limit },
    });
  }
}

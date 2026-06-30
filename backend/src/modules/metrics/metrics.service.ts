import client from 'prom-client';
import { prisma } from '../../utils/prisma';
import { redisClient } from '../../config/redis';
import { DIAGNOSTIC_CONFIG } from '../../config/diagnostics';
import { securityMetrics } from '../../metrics/security.metrics';
import { UploadMetricsTracker } from '../../metrics/upload.metrics';
import { QueueMetricsTracker } from '../../metrics/queue.metrics';
import { env } from '../../config/env';
import { sentryState } from '../../config/sentry';

export class MetricsService {
  public static readonly registry = new client.Registry();

  static initialize(): void {
    // 1. Collect default Node.js metrics with 'crustys_' prefix
    client.collectDefaultMetrics({
      register: this.registry,
      prefix: 'crustys_',
    });

    // 2. Register custom metrics
    this.registerDatabaseMetrics();
    this.registerRedisMetrics();
    this.registerSecurityMetrics();
    this.registerUploadMetrics();
    this.registerQueueMetrics();
    this.registerSentryMetrics();
  }

  private static registerDatabaseMetrics(): void {
    const dbResponseTime = new client.Gauge({
      name: 'crustys_database_response_time_ms',
      help: 'Database query response time in milliseconds',
      registers: [this.registry],
    });

    new client.Gauge({
      name: 'crustys_database_connected',
      help: 'Database connection status (1 = Connected, 0 = Disconnected)',
      registers: [this.registry],
      async collect() {
        const start = Date.now();
        try {
          await prisma.$queryRaw`SELECT 1`;
          this.set(1);
          dbResponseTime.set(Date.now() - start);
        } catch {
          this.set(0);
          dbResponseTime.set(0);
        }
      }
    });
  }

  private static registerRedisMetrics(): void {
    const redisResponseTime = new client.Gauge({
      name: 'crustys_redis_response_time_ms',
      help: 'Redis ping response time in milliseconds',
      registers: [this.registry],
    });

    new client.Gauge({
      name: 'crustys_redis_connected',
      help: 'Redis connection status (1 = Connected, 0 = Disconnected)',
      registers: [this.registry],
      async collect() {
        if (!DIAGNOSTIC_CONFIG.enableStandaloneRedis) {
          // If standalone Redis is disabled in diagnostics, we mock the success
          this.set(1);
          redisResponseTime.set(0);
          return;
        }

        const start = Date.now();
        try {
          if (typeof redisClient.ping === 'function') {
            const response = await redisClient.ping();
            if (response === 'PONG') {
              this.set(1);
              redisResponseTime.set(Date.now() - start);
            } else {
              this.set(0);
              redisResponseTime.set(0);
            }
          } else {
            this.set(0);
            redisResponseTime.set(0);
          }
        } catch {
          this.set(0);
          redisResponseTime.set(0);
        }
      }
    });
  }

  private static registerSecurityMetrics(): void {
    const securitySuspicious = new client.Gauge({
      name: 'crustys_security_suspicious_requests_total',
      help: 'Total number of suspicious requests detected',
      registers: [this.registry],
    });
    const securityBruteForce = new client.Gauge({
      name: 'crustys_security_brute_force_attempts_total',
      help: 'Total number of brute force attempts',
      registers: [this.registry],
    });
    const securityRateLimit = new client.Gauge({
      name: 'crustys_security_rate_limit_triggers_total',
      help: 'Total number of rate limit triggers',
      registers: [this.registry],
    });
    const securityTokenFails = new client.Gauge({
      name: 'crustys_security_token_failures_total',
      help: 'Total number of JWT/token verification failures',
      registers: [this.registry],
    });
    const securityScanners = new client.Gauge({
      name: 'crustys_security_scanners_detected_total',
      help: 'Total number of request scanners detected',
      registers: [this.registry],
    });
    const securityBots = new client.Gauge({
      name: 'crustys_security_bots_detected_total',
      help: 'Total number of malicious bots detected',
      registers: [this.registry],
    });
    const securityHoneypot = new client.Gauge({
      name: 'crustys_security_honeypot_triggers_total',
      help: 'Total number of honeypot triggers',
      registers: [this.registry],
    });
    const securityAttacksByCategory = new client.Gauge({
      name: 'crustys_security_attacks_by_category',
      help: 'Security attacks grouped by OWASP category',
      labelNames: ['category'],
      registers: [this.registry],
    });
    new client.Gauge({
      name: 'crustys_security_blocked_requests_total',
      help: 'Total number of blocked malicious requests',
      registers: [this.registry],
      collect() {
        const report = securityMetrics.getReport();
        this.set(report.blockedRequests);
        securitySuspicious.set(report.suspiciousRequests);
        securityBruteForce.set(report.bruteForceAttempts);
        securityRateLimit.set(report.rateLimitTriggers);
        securityTokenFails.set(report.tokenFailures);
        securityScanners.set(report.scannersDetected);
        securityBots.set(report.botsDetected);
        securityHoneypot.set(report.honeypotTriggers);

        if (report.attacksByCategory) {
          for (const [category, count] of Object.entries(report.attacksByCategory)) {
            securityAttacksByCategory.set({ category }, count);
          }
        }
      }
    });
  }

  private static registerUploadMetrics(): void {
    const uploadFailure = new client.Gauge({
      name: 'crustys_upload_failure_count',
      help: 'Total number of failed media uploads',
      registers: [this.registry],
    });
    const uploadSuccessRate = new client.Gauge({
      name: 'crustys_upload_success_rate',
      help: 'Upload success rate percentage',
      registers: [this.registry],
    });
    const uploadAvgDuration = new client.Gauge({
      name: 'crustys_upload_average_processing_duration_ms',
      help: 'Average processing duration of media uploads in ms',
      registers: [this.registry],
    });
    const uploadAvgCdn = new client.Gauge({
      name: 'crustys_upload_average_cdn_upload_time_ms',
      help: 'Average CDN upload time in ms',
      registers: [this.registry],
    });
    const uploadAvgComp = new client.Gauge({
      name: 'crustys_upload_average_compression_ratio',
      help: 'Average compression ratio achieved',
      registers: [this.registry],
    });
    const uploadRetries = new client.Gauge({
      name: 'crustys_upload_total_retry_count',
      help: 'Total retry operations on upload tasks',
      registers: [this.registry],
    });

    new client.Gauge({
      name: 'crustys_upload_success_count',
      help: 'Total number of successful media uploads',
      registers: [this.registry],
      async collect() {
        const report = await UploadMetricsTracker.getReport();
        this.set(report.successCount);
        uploadFailure.set(report.failureCount);
        uploadSuccessRate.set(report.successRate);
        uploadAvgDuration.set(report.averageProcessingDuration);
        uploadAvgCdn.set(report.averageCdnUploadTime);
        uploadAvgComp.set(report.averageCompressionRatio);
        uploadRetries.set(report.totalRetryCount);
      }
    });
  }

  private static registerQueueMetrics(): void {
    const queueActive = new client.Gauge({
      name: 'crustys_queue_active_count',
      help: 'Number of active jobs processing in BullMQ queue',
      registers: [this.registry],
    });
    const queueCompleted = new client.Gauge({
      name: 'crustys_queue_completed_count',
      help: 'Number of completed jobs in BullMQ queue',
      registers: [this.registry],
    });
    const queueFailed = new client.Gauge({
      name: 'crustys_queue_failed_count',
      help: 'Number of failed jobs in BullMQ queue',
      registers: [this.registry],
    });
    const queueDelayed = new client.Gauge({
      name: 'crustys_queue_delayed_count',
      help: 'Number of delayed jobs in BullMQ queue',
      registers: [this.registry],
    });
    const queuePaused = new client.Gauge({
      name: 'crustys_queue_paused',
      help: 'BullMQ queue pause status (1 = Paused, 0 = Active)',
      registers: [this.registry],
    });
    const queueLatency = new client.Gauge({
      name: 'crustys_queue_latency_ms',
      help: 'Approximate queue processing latency in milliseconds',
      registers: [this.registry],
    });

    new client.Gauge({
      name: 'crustys_queue_waiting_count',
      help: 'Number of jobs waiting in BullMQ processing queue',
      registers: [this.registry],
      async collect() {
        const report = await QueueMetricsTracker.getReport();
        this.set(report.waiting);
        queueActive.set(report.active);
        queueCompleted.set(report.completed);
        queueFailed.set(report.failed);
        queueDelayed.set(report.delayed);
        queuePaused.set(report.paused ? 1 : 0);
        queueLatency.set(report.latencyMs);
      }
    });
  }

  private static registerSentryMetrics(): void {
    new client.Gauge({
      name: 'crustys_sentry_connected',
      help: 'Sentry connection status (1 = Active/DSN set, 0 = Inactive)',
      registers: [this.registry],
      collect() {
        this.set(env.SENTRY_DSN ? 1 : 0);
      }
    });

    new client.Gauge({
      name: 'crustys_sentry_info',
      help: 'Sentry environment information',
      labelNames: ['environment'],
      registers: [this.registry],
      collect() {
        this.set({ environment: env.SENTRY_ENVIRONMENT || 'unknown' }, 1);
      }
    });

    new client.Gauge({
      name: 'crustys_sentry_last_error_timestamp_seconds',
      help: 'UNIX timestamp in seconds of the last captured error',
      registers: [this.registry],
      collect() {
        if (sentryState.lastErrorTimestamp) {
          const seconds = Math.floor(new Date(sentryState.lastErrorTimestamp).getTime() / 1000);
          this.set(seconds);
        } else {
          this.set(0);
        }
      }
    });
  }

  static async getPrometheusMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  static getContentType(): string {
    return this.registry.contentType;
  }
}

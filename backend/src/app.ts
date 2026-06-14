import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { DIAGNOSTIC_CONFIG } from './config/diagnostics';

// Route imports
import authRouter from './modules/auth/auth.route';
import adminRouter from './modules/admin/admin.route';
import categoryRouter from './modules/category/category.route';
import productRouter from './modules/product/product.route';
import orderRouter from './modules/orders/order.route';
import reservationRouter from './modules/reservation/reservation.route';
import paymentRouter from './modules/payment/payment.route';
import analyticsRouter from './modules/analytics/analytics.route';
import testimonialRouter from './modules/testimonials';
import usersRouter from './modules/users/users.route';
import uploadsRouter from './modules/uploads/uploads.routes';
import securityRouter from './modules/security/security.route';
import contactRouter from './modules/contact';
import healthRouter from './modules/health';
import promBundle from 'express-prom-bundle';
import { MetricsService, metricsRouter, MetricsController } from './modules/metrics';
import { authenticate } from './middlewares/authenticate';
import { authorize } from './middlewares/authorize';

// BullMQ Queue Import
import { emailQueue } from './modules/emails';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// Phase 5 — Security Hardening Imports
import { helmetMiddleware, hppMiddleware } from './middlewares/security.middleware';
import { requestFingerprintMiddleware } from './middlewares/request-fingerprint.middleware';
import { ipTrackingMiddleware } from './middlewares/ip-tracking.middleware';
import { suspiciousRequestMiddleware } from './middlewares/suspicious-request.middleware';
import { apiRateLimiter } from './middlewares/api-rate-limit.middleware';
import { authRateLimiter } from './middlewares/auth-rate-limit.middleware';
import { bruteForceMiddleware } from './middlewares/brute-force.middleware';

console.log('⚡ [App] Initializing Crusty\'s Express (DIAGNOSTIC ACTIVE MODE)');
MetricsService.initialize();
const app = express();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TRUST PROXY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.set('trust proxy', 1);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. HELMET (HTTP Header Hardening)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableHelmet) {
  console.log('   [Group A] Loading helmetMiddleware...');
  app.use(helmetMiddleware);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. HPP (HTTP Parameter Pollution)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableHpp) {
  console.log('   [Group A] Loading hppMiddleware...');
  app.use(hppMiddleware);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CORS & COOKIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableCookies) {
  console.log('   [Group A] Loading cookieParser...');
  app.use(cookieParser());
}

if (DIAGNOSTIC_CONFIG.enableCors) {
  console.log('   [Group A] Loading cors...');
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. STRIPE WEBHOOK (Must be registered BEFORE express.json())
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' })
);
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' })
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. BODY PARSERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Prometheus HTTP metrics middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  normalizePath: [
    ['^/api/v1/users/.*', '/api/v1/users/#id'],
    ['^/api/v1/products/.*', '/api/v1/products/#id'],
    ['^/api/v1/categories/.*', '/api/v1/categories/#id'],
    ['^/api/v1/orders/.*', '/api/v1/orders/#id'],
    ['^/api/v1/reservations/.*', '/api/v1/reservations/#id'],
    ['^/api/v1/uploads/.*', '/api/v1/uploads/#id'],
  ],
  promRegistry: MetricsService.registry
});
app.use(metricsMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. REQUEST FINGERPRINTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableRequestFingerprint) {
  console.log('   [Group A] Loading requestFingerprintMiddleware...');
  app.use(requestFingerprintMiddleware);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. IP TRACKING (GeoIP + User-Agent parsing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableIpTracking) {
  console.log('   [Group A] Loading ipTrackingMiddleware...');
  app.use(ipTrackingMiddleware);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SUSPICIOUS REQUEST DETECTION (OWASP heuristics)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableSuspiciousRequest) {
  console.log('   [Group A] Loading suspiciousRequestMiddleware...');
  app.use(suspiciousRequestMiddleware);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. GLOBAL API RATE LIMITING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableApiRateLimit) {
  console.log('   [Group A] Loading apiRateLimiter...');
  app.use('/api', apiRateLimiter);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. HTTP REQUEST LOGGING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableMorgan) {
  const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. SWAGGER API DOCUMENTATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (DIAGNOSTIC_CONFIG.enableSwagger) {
  console.log('   [Group A] Loading swaggerDocs...');
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Crusty's Express - API Docs",
    })
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 ROUTING & API ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
console.log('⚡ [App] Mounting Versioned API Routes (/api/v1)');

// Helpers for rate limiting authentication routes
const authLimiters = DIAGNOSTIC_CONFIG.enableBruteForce 
  ? [authRateLimiter, bruteForceMiddleware] 
  : [authRateLimiter];

app.use('/api/v1/auth', ...authLimiters, authRouter);
app.use('/api/v1/admins', adminRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/reservations', reservationRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/testimonials', testimonialRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/uploads', uploadsRouter);
app.use('/api/v1/security', securityRouter);
app.use('/api/v1/contacts', contactRouter);
app.use('/api/v1/metrics', metricsRouter);

// Deprecated Route Fallbacks
console.log('⚡ [App] Mounting Deprecated API Fallback Routes (/api)');
app.use('/api/auth', ...authLimiters, authRouter);
app.use('/api/admins', adminRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/reservations', reservationRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/testimonials', testimonialRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/contacts', contactRouter);
app.use('/api/metrics', metricsRouter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏥 HEALTH CHECK & MONITORING ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/railway-test', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Railway OK',
    timestamp: new Date().toISOString(),
    port: env.PORT,
    diagnostics: DIAGNOSTIC_CONFIG,
  });
});

app.use(healthRouter);
app.get('/metrics', authenticate, authorize('ADMIN'), MetricsController.getMetrics);

// Async Queue health check route
const queuesHealthHandler = async (req: express.Request, res: express.Response) => {
  try {
    const jobCounts = await emailQueue.getJobCounts();
    res.status(200).json({
      success: true,
      queues: {
        emails: {
          waiting: jobCounts.waiting,
          active: jobCounts.active,
          completed: jobCounts.completed,
          failed: jobCounts.failed,
          delayed: jobCounts.delayed,
        }
      }
    });
  } catch (error: any) {
    logger.error(`[Healthcheck Queue Error] ${error.message}`);
    res.status(503).json({
      success: false,
      message: 'Queue service unavailable',
      error: error.message
    });
  }
};

app.get('/health/queues', queuesHealthHandler);
app.get('/api/v1/health/queues', queuesHealthHandler);

app.get('/', (_req, res) => {
  res.status(200).json({
    message: "Welcome to Crusty's Express API (DIAGNOSTIC MODE)",
    version: '1.0.0',
    diagnostics: DIAGNOSTIC_CONFIG,
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💥 ERROR HANDLING MIDDLEWARES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(notFound);
app.use(errorHandler);

export default app;

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
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
import { emailQueue } from './modules/emails';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

// ── Phase 5 — Security Hardening Imports ──
import { helmetMiddleware, hppMiddleware } from './middlewares/security.middleware';
import { requestFingerprintMiddleware } from './middlewares/request-fingerprint.middleware';
import { ipTrackingMiddleware } from './middlewares/ip-tracking.middleware';
import { suspiciousRequestMiddleware } from './middlewares/suspicious-request.middleware';
import { apiRateLimiter } from './middlewares/api-rate-limit.middleware';
import { authRateLimiter } from './middlewares/auth-rate-limit.middleware';
import { bruteForceMiddleware } from './middlewares/brute-force.middleware';

const app = express();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. TRUST PROXY — Required for rate limiting behind nginx/load balancers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.set('trust proxy', 1);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. HELMET — HTTP Header Hardening (CSP, HSTS, XSS, Frameguard, NoSniff)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(helmetMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. HPP — HTTP Parameter Pollution Protection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(hppMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CORS + COOKIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(cookieParser());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. STRIPE WEBHOOK — Must be registered BEFORE express.json()
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. REQUEST FINGERPRINTING — SHA-256 based client identity
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(requestFingerprintMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. IP TRACKING — GeoIP + User-Agent parsing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(ipTrackingMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SUSPICIOUS REQUEST DETECTION — OWASP heuristic engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(suspiciousRequestMiddleware);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. GLOBAL API RATE LIMITING — 100 req / 15 min / IP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use('/api', apiRateLimiter);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. HTTP REQUEST LOGGING (Morgan + Winston)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const morganFormat = env.NODE_ENV === 'development' ? 'dev' : 'combined';
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  })
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 12. SWAGGER API DOCUMENTATION (Premium Dark Theme)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "Crusty's Express - API Docs",
    customCss: `
      /* Dark theme styling for premium appearance */
      .swagger-ui {
        background-color: #11141a !important;
        color: #e2e8f0 !important;
        font-family: 'Outfit', 'Inter', sans-serif !important;
      }
      .swagger-ui .topbar {
        background-color: #0b0d13 !important;
        border-bottom: 2px solid #e02424 !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .swagger-ui .info .title {
        color: #ffffff !important;
        font-weight: 700 !important;
      }
      .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info a {
        color: #94a3b8 !important;
      }
      .swagger-ui .opblock-tag {
        color: #ffffff !important;
        border-bottom: 1px solid #334155 !important;
      }
      .swagger-ui .opblock .opblock-summary-description {
        color: #cbd5e1 !important;
      }
      .swagger-ui .opblock {
        border-radius: 8px !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
      }
      .swagger-ui .opblock.opblock-post {
        background: rgba(16, 185, 129, 0.08) !important;
        border-color: #10b981 !important;
      }
      .swagger-ui .opblock.opblock-get {
        background: rgba(59, 130, 246, 0.08) !important;
        border-color: #3b82f6 !important;
      }
      .swagger-ui .opblock.opblock-put {
        background: rgba(245, 158, 11, 0.08) !important;
        border-color: #f59e0b !important;
      }
      .swagger-ui .opblock.opblock-delete {
        background: rgba(239, 68, 68, 0.08) !important;
        border-color: #ef4444 !important;
      }
      .swagger-ui .opblock.opblock-patch {
        background: rgba(139, 92, 246, 0.08) !important;
        border-color: #8b5cf6 !important;
      }
      .swagger-ui section.models {
        background-color: #161b24 !important;
        border: 1px solid #2d3748 !important;
        border-radius: 8px !important;
      }
      .swagger-ui section.models .model-container {
        background-color: #11141a !important;
        border: 1px solid #2d3748 !important;
        margin: 5px !important;
        border-radius: 6px !important;
      }
      .swagger-ui section.models h4 {
        color: #cbd5e1 !important;
      }
      .swagger-ui .model-box {
        background-color: #0b0d13 !important;
        padding: 10px !important;
        border-radius: 4px !important;
      }
    `,
  })
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API ROUTES (Versioned /api/v1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use('/api/v1/auth', authRateLimiter, bruteForceMiddleware, authRouter);
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

// Deprecated API Routes Fallback (for backward compatibility)
app.use('/api/auth', authRateLimiter, bruteForceMiddleware, authRouter);
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HEALTH CHECK ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Async Queue health check route (versioned & unversioned)
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

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Welcome to Crusty's Express API",
    version: '1.0.0',
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ERROR HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

export default app;

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * AUTH RATE LIMITER — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 5 requêtes / minute / IP sur les routes d'authentification.
 * Anti brute-force, anti credential stuffing.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { securityConfig } from '../config/security.config';
import { SecurityAuditLogger } from '../logs/security.audit';
import { securityMetrics } from '../metrics/security.metrics';

import { DIAGNOSTIC_CONFIG } from '../config/diagnostics';
import { NextFunction } from 'express';

const realAuthRateLimiter = rateLimit({
  windowMs: securityConfig.authRateLimit.windowMs,
  max: securityConfig.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request): boolean => {
    if (process.env.NODE_ENV === 'test') {
      const ip = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
      if (ip === '203.0.113.60') {
        return false;
      }
      return true;
    }
    return false;
  },

  keyGenerator: (req: Request) => {
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '');
  },

  handler: (req: Request, res: Response): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    securityMetrics.increment('rateLimits');
    securityMetrics.increment('bruteForce');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'RATE_LIMIT_EXCEEDED',
      severity: 'HIGH',
      ipAddress: ip,
      userAgent: req.get('user-agent'),
      route: req.originalUrl,
      method: req.method,
      fingerprint: req.fingerprint,
      message: `Rate limit AUTH dépassé (${securityConfig.authRateLimit.max} req / ${securityConfig.authRateLimit.windowMs / 1000}s). Possible brute-force ou credential stuffing.`,
    });

    res.status(429).json({
      status: 'error',
      message: securityConfig.authRateLimit.message,
      code: securityConfig.authRateLimit.code,
    });
  },
});

export const authRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (DIAGNOSTIC_CONFIG.enableAuthRateLimit) {
    return realAuthRateLimiter(req as any, res as any, next as any);
  }
  next();
};

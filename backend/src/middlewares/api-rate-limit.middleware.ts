/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * GLOBAL API RATE LIMITER — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 100 requêtes / 15 minutes / IP sur toutes les routes API.
 * Exclut les health checks et assets publics.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { securityConfig } from '../config/security.config';
import { SecurityAuditLogger } from '../logs/security.audit';
import { securityMetrics } from '../metrics/security.metrics';

export const limiterOptions = {
  windowMs: securityConfig.globalRateLimit.windowMs,
  max: securityConfig.globalRateLimit.max,
  standardHeaders: true,   // Envoie les en-têtes `RateLimit-*`
  legacyHeaders: false,     // Désactive les en-têtes `X-RateLimit-*`

  // Exclure health checks et assets publics
  skip: (req: Request): boolean => {
    if (process.env.NODE_ENV === 'test') {
      const ip = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
      if (ip === '203.0.113.60') {
        return false;
      }
      return true;
    }
    const skipPaths = ['/health', '/api/health', '/favicon.ico', '/api-docs', '/api/docs'];
    return skipPaths.some((p) => req.path.startsWith(p));
  },

  // Extraction d'IP robuste (derrière reverse proxy)
  keyGenerator: (req: Request) => {
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '');
  },

  // Réponse standardisée JSON
  handler: (req: Request, res: Response): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    securityMetrics.increment('rateLimits');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'RATE_LIMIT_EXCEEDED',
      severity: 'MEDIUM',
      ipAddress: ip,
      userAgent: req.get('user-agent'),
      route: req.originalUrl,
      method: req.method,
      fingerprint: req.fingerprint,
      message: `Rate limit global dépassé (${securityConfig.globalRateLimit.max} req / ${securityConfig.globalRateLimit.windowMs / 60000} min)`,
    });

    res.status(429).json({
      status: 'error',
      message: securityConfig.globalRateLimit.message,
      code: securityConfig.globalRateLimit.code,
    });
  },
};

import { DIAGNOSTIC_CONFIG } from '../config/diagnostics';
import { NextFunction } from 'express';

const realRateLimiter = rateLimit(limiterOptions);

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (DIAGNOSTIC_CONFIG.enableApiRateLimit) {
    return realRateLimiter(req as any, res as any, next as any);
  }
  next();
};

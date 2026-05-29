/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BRUTE FORCE MIDDLEWARE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Vérifie si l'IP est bannie avant d'autoriser l'accès
 * aux routes d'authentification critiques.
 */

import { Request, Response, NextFunction } from 'express';
import { BruteForceService } from '../security/brute-force.service';
import { SecurityAuditLogger } from '../logs/security.audit';
import { securityMetrics } from '../metrics/security.metrics';

export const bruteForceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { banned, remainingMs } = BruteForceService.isBanned(ip);

  if (banned) {
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    securityMetrics.increment('blocked');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'BLOCKED_REQUEST',
      severity: 'HIGH',
      ipAddress: ip,
      userAgent: req.get('user-agent'),
      route: req.originalUrl,
      method: req.method,
      fingerprint: req.fingerprint,
      message: `IP bannie — tentative d'accès bloquée. Déblocage dans ${remainingMinutes} min.`,
      metadata: { remainingMs, remainingMinutes },
    });

    res.status(429).json({
      status: 'error',
      message: `Votre adresse IP est temporairement bloquée suite à de trop nombreuses tentatives échouées. Réessayez dans ${remainingMinutes} minute(s).`,
      code: 'IP_TEMPORARILY_BANNED',
      retryAfter: remainingMinutes,
    });
    return;
  }

  next();
};

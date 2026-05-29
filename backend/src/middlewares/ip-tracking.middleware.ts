/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * IP TRACKING MIDDLEWARE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Enregistre IP, géolocalisation, User-Agent,
 * device, route et utilisateur authentifié.
 */

import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import useragent from 'useragent';
import { logger } from '../utils/logger';
import { securityConfig } from '../config/security.config';

// Étend l'interface Request pour le tracking
declare global {
  namespace Express {
    interface Request {
      geoLocation?: {
        country: string;
        city: string;
        region: string;
        timezone: string;
        coordinates: [number, number] | null;
      };
      parsedUA?: {
        browser: string;
        browserVersion: string;
        os: string;
        device: string;
      };
    }
  }
}

export const ipTrackingMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (!securityConfig.ipTracking.enabled) {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // ── Géolocalisation ──
  if (securityConfig.ipTracking.logGeoLocation) {
    // Nettoyer le préfixe IPv6-mapped IPv4
    const cleanIP = ip.replace(/^::ffff:/, '');
    const geo = geoip.lookup(cleanIP);

    req.geoLocation = {
      country: geo?.country || 'UNKNOWN',
      city: geo?.city || 'UNKNOWN',
      region: geo?.region || 'UNKNOWN',
      timezone: geo?.timezone || 'UNKNOWN',
      coordinates: geo?.ll || null,
    };
  }

  // ── User-Agent parsing ──
  if (securityConfig.ipTracking.logUserAgent) {
    const rawUA = req.get('user-agent') || '';
    const agent = useragent.parse(rawUA);

    req.parsedUA = {
      browser: agent.family,
      browserVersion: agent.toVersion(),
      os: agent.os.toString(),
      device: agent.device.family,
    };
  }

  // ── Log structuré (non-bloquant) ──
  const logData = {
    ip,
    method: req.method,
    route: req.originalUrl,
    fingerprint: req.fingerprint || 'N/A',
    country: req.geoLocation?.country,
    city: req.geoLocation?.city,
    browser: req.parsedUA?.browser,
    os: req.parsedUA?.os,
    device: req.parsedUA?.device,
    userId: (req as any).user ? (req as any).user.id : undefined,
    timestamp: new Date().toISOString(),
  };

  logger.info(`[IP TRACKING] ${JSON.stringify(logData)}`);

  next();
};

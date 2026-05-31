/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * IP TRACKING MIDDLEWARE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Enregistre IP, géolocalisation, User-Agent,
 * device, route et utilisateur authentifié.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { securityConfig } from '../config/security.config';
import { DIAGNOSTIC_CONFIG } from '../config/diagnostics';

// Lazy loader/stub for geoip-lite to prevent expensive file parsing on import when disabled
const getGeoIP = () => {
  if (DIAGNOSTIC_CONFIG.enableGeoIP) {
    try {
      return require('geoip-lite');
    } catch (err: any) {
      logger.error(`[GeoIP Lazy Load Error] ${err.message}`);
    }
  }
  return {
    lookup: () => ({
      country: 'CA',
      city: 'Montreal',
      region: 'QC',
      timezone: 'America/Toronto',
      ll: [45.5, -73.6]
    })
  };
};

// Lazy loader/stub for useragent to prevent performance bottlenecks when disabled
const getUserAgent = () => {
  if (DIAGNOSTIC_CONFIG.enableUserAgent) {
    try {
      return require('useragent');
    } catch (err: any) {
      logger.error(`[UserAgent Lazy Load Error] ${err.message}`);
    }
  }
  return {
    parse: () => ({
      family: 'Chrome',
      toVersion: () => '120.0.0',
      os: {
        toString: () => 'Windows 11'
      },
      device: {
        family: 'Desktop'
      }
    })
  };
};

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
    const geo = getGeoIP().lookup(cleanIP);

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
    const agent = getUserAgent().parse(rawUA);

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

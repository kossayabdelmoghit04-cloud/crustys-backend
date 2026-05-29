/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * REQUEST FINGERPRINT MIDDLEWARE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Génère un fingerprint unique par client basé sur
 * IP, User-Agent, headers, langue et timezone.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Étend l'interface Request pour ajouter le fingerprint
declare global {
  namespace Express {
    interface Request {
      fingerprint?: string;
      fingerprintComponents?: {
        ip: string;
        userAgent: string;
        acceptLanguage: string;
        acceptEncoding: string;
        connection: string;
      };
    }
  }
}

export const requestFingerprintMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const components = {
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent') || 'unknown',
    acceptLanguage: req.get('accept-language') || 'unknown',
    acceptEncoding: req.get('accept-encoding') || 'unknown',
    connection: req.get('connection') || 'unknown',
  };

  const raw = `${components.ip}|${components.userAgent}|${components.acceptLanguage}|${components.acceptEncoding}|${components.connection}`;

  req.fingerprint = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
  req.fingerprintComponents = components;

  next();
};

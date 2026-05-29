/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SECURITY MIDDLEWARE (Helmet + HPP) — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import helmet from 'helmet';
import hpp from 'hpp';
import { RequestHandler } from 'express';
import { securityConfig } from '../config/security.config';

/**
 * Helmet — hardening des en-têtes HTTP.
 * Configure CSP, HSTS, XSS-Protection, Frameguard,
 * Referrer-Policy, DNS-Prefetch-Control, NoSniff.
 */
export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: securityConfig.csp.directives,
  },
  crossOriginEmbedderPolicy: false, // Compatibilité avec Cloudinary et Swagger
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Images Cloudinary
  hsts: {
    maxAge: 31536000,  // 1 an
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  dnsPrefetchControl: { allow: false },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
}) as RequestHandler;

/**
 * HPP — protection contre le HTTP Parameter Pollution.
 * Whitelist les paramètres de pagination et filtrage.
 */
export const hppMiddleware: RequestHandler = hpp({
  whitelist: securityConfig.hppWhitelist as unknown as string[],
});

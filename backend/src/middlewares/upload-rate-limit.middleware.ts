import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { ApiErrorResponse } from '../types/api-response.types';

/**
 * Limiteur de débit (Rate Limiter) spécifique pour les endpoints de téléversement (uploads).
 * Restreint chaque adresse IP à un maximum de 10 uploads par minute.
 * 
 * Objectifs :
 * - Empêcher les attaques par déni de service (DoS/DDoS) sur l'upload d'images
 * - Empêcher la saturation de la RAM (Memory Abuse) causée par le stockage en mémoire de Multer
 * - Logger proactivement les abus suspects
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // Fenêtre de 1 minute
  max: 10, // Limite à 10 requêtes par minute par IP
  message: {
    status: 'fail',
    message: 'Trop de requêtes de téléversement d\'images. Veuillez patienter une minute avant de réessayer.',
  } as ApiErrorResponse,
  standardHeaders: true, // Renvoie les en-têtes standard RateLimit-*
  legacyHeaders: false, // Désactive les anciens en-têtes X-RateLimit-*
  handler: (req, res, next, options) => {
    logger.warn(
      `[SECURITY - UPLOAD RATE LIMIT EXCEEDED] IP ${req.ip} a dépassé la limite d'uploads autorisés sur ${req.method} ${req.originalUrl}`
    );
    res.status(options.statusCode).json(options.message);
  },
});

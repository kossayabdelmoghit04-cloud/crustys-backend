import rateLimit from 'express-rate-limit';
import { logger } from '../../utils/logger';

/**
 * Middleware spécifique limitant la soumission des témoignages clients
 * Limitation : 5 requêtes par IP sur une fenêtre de 15 minutes
 */
export const testimonialRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite à 5 requêtes
  message: {
    status: 'fail',
    message: 'Trop de témoignages envoyés. Veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`[SPAM DETECTED] Rate limit dépassé pour l'IP ${req.ip} sur POST /api/testimonials`);
    res.status(options.statusCode).json(options.message);
  },
});

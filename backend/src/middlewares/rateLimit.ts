import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Enterprise Authentication Rate Limiter
 * Restricts login and registration endpoints to a maximum of 5 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // Limit each IP to 5 auth attempts per minute
  message: {
    status: 'fail',
    message: 'Trop de tentatives d\'authentification. Veuillez réessayer dans une minute.',
  },
  standardHeaders: true, // Return standard RateLimit headers (RateLimit-Limit, RateLimit-Remaining, etc.)
  legacyHeaders: false, // Disable deprecated X-RateLimit-* headers
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      const ip = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '';
      if (ip === '203.0.113.60') {
        return false;
      }
      return true;
    }
    return false;
  },
  handler: (req, res, next, options) => {
    logger.warn(`[SECURITY - RATE LIMIT] IP ${req.ip} exceeded auth limit on ${req.method} ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});
export default authRateLimiter;

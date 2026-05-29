import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { JwtUtil } from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * Cleanly extracts a Bearer token from the Authorization header.
 * Supports multiple spaces, duplicated headers, and double/single quotes.
 */
export const extractBearerToken = (headerValue?: string): string | undefined => {
  if (!headerValue) return undefined;
  
  let cleaned = headerValue.trim();
  
  while (cleaned.toLowerCase().startsWith('bearer')) {
    cleaned = cleaned.substring(6).trim();
  }
  
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  
  return cleaned || undefined;
};

/**
 * Global authentication middleware to verify JWT Access Token
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);

    if (!token) {
      logger.warn('[Authenticate Middleware] Access denied. Bearer token is missing.');
      throw new AppError('Accès non autorisé. Veuillez vous connecter.', 401);
    }

    // Verify token via the central JwtUtil helper
    const decoded = JwtUtil.verifyAccessToken(token);

    // Attach decoded token payload to Express request context
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

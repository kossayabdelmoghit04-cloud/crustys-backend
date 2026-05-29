import { Request, Response, NextFunction } from 'express';
import { sanitizeObject } from '../utils/sanitizeInput';

/**
 * Middleware d'assainissement global du corps des requêtes contre le XSS.
 * Nettoie toutes les propriétés textuelles de req.body avant la validation de schéma.
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { TokenPayload } from '../modules/auth/auth.types';

/**
 * Placeholder d'authentification pour préparer l'architecture de sécurité.
 * Simule un profil d'administrateur en développement conforme au type TokenPayload du projet.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Simule l'authentification d'un administrateur conforme au TokenPayload global
  req.user = {
    adminId: 'placeholder-admin-id',
    email: 'moderation@crustysexpress.ca',
    role: 'ADMIN',
    permissions: ['write:testimonials', 'delete:testimonials'],
  };
  next();
};

/**
 * Middleware d'autorisation basé sur les Rôles préparé pour la production.
 * Valide les accès à partir du rôle contenu dans req.user.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Accès non autorisé. Authentification requise.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Accès interdit. Rôle requis non attribué.', 403));
    }

    next();
  };
};

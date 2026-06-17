import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/appError';

// Re-export the new global middleware components to maintain perfect backward compatibility
export { authenticate, extractBearerToken } from '../../middlewares/authenticate';
export { authorize as requireRole } from '../../middlewares/authorize';

import { authenticate } from '../../middlewares/authenticate';
import { AppError } from '../../utils/appError';

/**
 * Authentication middleware that enforces JWT validation and checks that the user is an administrator
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) {
      return next(new AppError('Accès non autorisé. Authentification requise.', 401));
    }
    const role = req.user.role.toUpperCase();
    if (role !== 'ADMIN' && role !== 'SUPER ADMIN' && role !== 'SUPER_ADMIN') {
      return next(new AppError('Accès interdit. Privilèges administratifs requis.', 403));
    }
    next();
  });
};


/**
 * Module-level permissions middleware.
 * Enforces permission checks for administrator roles ('Super Admin', 'ADMIN').
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Accès non autorisé. Authentification requise.', 401));
    }

    const role = req.user.role.toUpperCase();

    // Super Admin has absolute access
    if (role === 'SUPER ADMIN') {
      return next();
    }

    if (role !== 'CUSTOMER') {
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        return next(
          new AppError('Accès interdit. Vous ne possédez pas les permissions requises.', 403)
        );
      }

      return next();
    }

    // Regular CUSTOMER accounts are denied from permission-based admin routes
    return next(
      new AppError('Accès interdit. Privilèges administratifs requis.', 403)
    );
  };
};

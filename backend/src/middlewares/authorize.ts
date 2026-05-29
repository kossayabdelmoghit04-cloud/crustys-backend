import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

/**
 * Global authorization middleware to enforce Role-Based Access Control (RBAC)
 * Supports 'ADMIN', 'CUSTOMER' roles, and maps legacy 'Super Admin' roles to 'ADMIN' for security.
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Accès non autorisé. Authentification requise.', 401));
    }

    const userRole = req.user.role;
    
    // Normalize role comparison (e.g., matching 'ADMIN' and 'CUSTOMER')
    const isAuthorized = allowedRoles.some(
      (role) => role.toUpperCase() === userRole.toUpperCase()
    ) || (userRole === 'Super Admin' && allowedRoles.map(r => r.toUpperCase()).includes('ADMIN'));

    if (!isAuthorized) {
      return next(new AppError('Accès interdit. Privilèges insuffisants pour cette action.', 403));
    }

    next();
  };
};

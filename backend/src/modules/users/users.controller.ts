import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { formatPaginatedResult } from '../../utils/queryBuilder';
import { UnauthorizedError } from '../../utils/appError';

/**
 * Enterprise Controller handling HTTP endpoints for User Management
 */
export class UsersController {
  /**
   * Fetch a paginated list of all active/non-deleted users (Admin only)
   * GET /api/users
   */
  public static getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, total, page, limit } = await UsersService.getUsers(req.query);
      const paginatedResponse = formatPaginatedResult(
        items,
        total,
        page,
        limit,
        'Utilisateurs récupérés avec succès'
      );
      return res.status(200).json(paginatedResponse);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieve profile details for a specific user ID (Admin or Account Owner only)
   * GET /api/users/:id
   */
  public static getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentification requise');
      }

      const user = await UsersService.getUserById(req.params.id, req.user);
      
      return res.status(200).json({
        success: true,
        message: 'Utilisateur récupéré avec succès',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update profile details (firstName, lastName, email) (Admin or Account Owner only)
   * PATCH /api/users/:id
   */
  public static updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentification requise');
      }

      const { firstName, lastName, email } = req.body;
      const user = await UsersService.updateUser(
        req.params.id, 
        { firstName, lastName, email }, 
        req.user
      );

      return res.status(200).json({
        success: true,
        message: 'Profil utilisateur mis à jour avec succès',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user Role (Admin only)
   * PATCH /api/users/:id/role
   */
  public static updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role } = req.body;
      const user = await UsersService.updateUserRole(req.params.id, role);

      return res.status(200).json({
        success: true,
        message: 'Rôle de l\'utilisateur mis à jour avec succès',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Activate or suspend a user account (Admin only)
   * PATCH /api/users/:id/status
   */
  public static updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isActive } = req.body;
      const user = await UsersService.updateUserStatus(req.params.id, isActive);
      
      const message = isActive 
        ? 'Compte utilisateur activé avec succès' 
        : 'Compte utilisateur suspendu avec succès (sessions révoquées)';

      return res.status(200).json({
        success: true,
        message,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Archives a user via Soft-Delete (Admin only)
   * DELETE /api/users/:id
   */
  public static deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await UsersService.softDeleteUser(req.params.id);

      return res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé (archivé) avec succès',
      });
    } catch (error) {
      next(error);
    }
  };
}

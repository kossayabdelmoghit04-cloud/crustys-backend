import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';

export class AdminController {
  /**
   * Crée un nouveau rôle
   */
  public static createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = await AdminService.createRole(req.body);
      return res.status(201).json({
        status: 'success',
        data: { role },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Crée un nouvel administrateur
   */
  public static createAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = await AdminService.createAdmin(req.body);
      return res.status(201).json({
        status: 'success',
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Récupère la liste de tous les administrateurs
   */
  public static getAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admins = await AdminService.getAdmins();
      return res.status(200).json({
        status: 'success',
        results: admins.length,
        data: { admins },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Récupère un administrateur par son ID
   */
  public static getAdminById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = await AdminService.getAdminById(req.params.id);
      return res.status(200).json({
        status: 'success',
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Modifie un administrateur
   */
  public static updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admin = await AdminService.updateAdmin(req.params.id, req.body);
      return res.status(200).json({
        status: 'success',
        data: { admin },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Supprime un administrateur
   */
  public static deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AdminService.deleteAdmin(req.params.id);
      return res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  };
}

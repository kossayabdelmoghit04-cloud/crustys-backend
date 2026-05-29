import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';

export class CategoryController {
  /**
   * @route   POST /api/categories
   * @desc    Créer une nouvelle catégorie
   * @access  Private/Admin
   */
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.create(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Catégorie créée avec succès.',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/categories
   * @desc    Récupérer toutes les catégories
   * @access  Public
   */
  static async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getAll(req.query);
      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/categories/:id
   * @desc    Récupérer une catégorie par son ID
   * @access  Public
   */
  static async getCategoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/categories/slug/:slug
   * @desc    Récupérer une catégorie par son slug SEO (utile pour le frontend)
   * @access  Public
   */
  static async getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getBySlug(req.params.slug);
      res.status(200).json({
        status: 'success',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/categories/:id
   * @desc    Modifier une catégorie existante
   * @access  Private/Admin
   */
  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.update(req.params.id, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Catégorie mise à jour avec succès.',
        data: { category },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/categories/:id
   * @desc    Supprimer une catégorie
   * @access  Private/Admin
   */
  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await CategoryService.delete(req.params.id);
      res.status(200).json({
        status: 'success',
        message: 'Catégorie supprimée avec succès.',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';

export class ProductController {
  /**
   * @route   POST /api/products
   * @desc    Créer un nouveau produit
   * @access  Private/Admin
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.create(req.body);
      res.status(201).json({
        status: 'success',
        message: 'Produit créé avec succès.',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/products
   * @desc    Récupérer les produits (avec filtrage, pagination et recherche)
   * @access  Public
   */
  static async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { products, pagination } = await ProductService.getAll(req.query);
      res.status(200).json({
        status: 'success',
        results: products.length,
        pagination,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/products/:id
   * @desc    Récupérer un produit par ID
   * @access  Public
   */
  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/products/slug/:slug
   * @desc    Récupérer un produit par son slug SEO
   * @access  Public
   */
  static async getProductBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getBySlug(req.params.slug);
      res.status(200).json({
        status: 'success',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/products/:id
   * @desc    Modifier un produit existant
   * @access  Private/Admin
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.update(req.params.id, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Produit mis à jour avec succès.',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/products/:id
   * @desc    Supprimer un produit
   * @access  Private/Admin
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.delete(req.params.id);
      res.status(200).json({
        status: 'success',
        message: 'Produit supprimé avec succès.',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

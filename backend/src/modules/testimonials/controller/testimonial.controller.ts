import { Request, Response, NextFunction } from 'express';
import { TestimonialService } from '../service/testimonial.service';
import { ITestimonialFilters } from '../types/testimonial.types';
import { detectTestimonialSpam } from '../../../utils/testimonialSpamCheck';
import { logger } from '../../../utils/logger';

export class TestimonialController {
  /**
   * @route   POST /api/testimonials
   * @desc    Soumettre un nouveau témoignage (public, soumis à modération)
   * @access  Public
   */
  static async createTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      // Validation Anti-spam et détection de doublons avancée
      await detectTestimonialSpam(req.body.customerName || '', req.body.message || '');

      const testimonial = await TestimonialService.create(req.body);

      logger.info(`[TESTIMONIAL] Nouveau témoignage soumis par "${testimonial.customerName}" (ID: ${testimonial.id})`);

      res.status(201).json({
        status: 'success',
        message: 'Votre témoignage a été soumis avec succès et est en attente de modération.',
        data: { testimonial },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/testimonials
   * @desc    Récupérer les témoignages (par défaut, uniquement approuvés pour le public)
   * @access  Public / Admin
   */
  static async getAllTestimonials(req: Request, res: Response, next: NextFunction) {
    try {
      const isApprovedQuery = req.query.isApproved;
      const ratingQuery = req.query.rating;
      const pageQuery = req.query.page;
      const limitQuery = req.query.limit;
      const searchQuery = req.query.search;

      const filters: ITestimonialFilters = {};

      if (isApprovedQuery !== undefined) {
        filters.isApproved = String(isApprovedQuery);
      } else {
        filters.isApproved = 'true';
      }

      if (ratingQuery !== undefined) {
        filters.rating = String(ratingQuery);
      }

      if (pageQuery !== undefined) {
        filters.page = String(pageQuery);
      }

      if (limitQuery !== undefined) {
        filters.limit = String(limitQuery);
      }

      if (searchQuery !== undefined) {
        filters.search = String(searchQuery);
      }

      const result = await TestimonialService.getAll(filters);
      res.status(200).json({
        status: 'success',
        results: result.testimonials.length,
        pagination: result.pagination,
        data: { testimonials: result.testimonials },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/testimonials/:id
   * @desc    Récupérer un témoignage par ID
   * @access  Private/Admin
   */
  static async getTestimonialById(req: Request, res: Response, next: NextFunction) {
    try {
      const testimonial = await TestimonialService.getById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: { testimonial },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/testimonials/:id
   * @desc    Modifier un témoignage existant
   * @access  Private/Admin
   */
  static async updateTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const testimonial = await TestimonialService.update(req.params.id, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Témoignage mis à jour avec succès.',
        data: { testimonial },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   PATCH /api/testimonials/:id/approve
   * @desc    Approuver ou rejeter un témoignage (modération)
   * @access  Private/Admin (RBAC)
   */
  static async approveTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const { isApproved } = req.body;
      const testimonial = await TestimonialService.approve(req.params.id, !!isApproved);

      logger.info(
        `[ADMIN ACTION] Témoignage ID ${testimonial.id} ${
          isApproved ? 'approuvé et publié' : 'masqué et retiré'
        } par un administrateur`
      );

      res.status(200).json({
        status: 'success',
        message: isApproved
          ? 'Témoignage approuvé et publié avec succès.'
          : 'Témoignage masqué et retiré de la publication.',
        data: { testimonial },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/testimonials/:id
   * @desc    Supprimer définitivement un témoignage
   * @access  Private/Admin (RBAC)
   */
  static async deleteTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      await TestimonialService.delete(req.params.id);

      logger.info(`[ADMIN ACTION] Témoignage ID ${req.params.id} supprimé définitivement par un administrateur`);

      res.status(200).json({
        status: 'success',
        message: 'Témoignage supprimé avec succès.',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}

import { prisma } from '../../../utils/prisma';
import { AppError } from '../../../utils/appError';
import { CreateTestimonialDTO, UpdateTestimonialDTO } from '../dto/testimonial.dto';
import { ITestimonialFilters } from '../types/testimonial.types';
import { AdminNotificationService } from '../../admin-notifications/admin-notification.service';
import { logger } from '../../../utils/logger';

export class TestimonialService {
  /**
   * Créer un nouveau témoignage (soumission publique, isApproved = false par défaut)
   */
  static async create(data: CreateTestimonialDTO) {
    const testimonial = await prisma.testimonial.create({
      data: {
        customerName: data.customerName,
        message: data.message,
        rating: data.rating,
        isApproved: false, // Modération par défaut
      },
    });

    AdminNotificationService.createNotification({
      title: "Nouveau témoignage soumis",
      message: `Témoignage de ${testimonial.customerName} (${testimonial.rating}/5 étoiles) en attente de modération`,
      type: "TESTIMONIAL_CREATED",
      metadata: {
        testimonialId: testimonial.id,
        customerName: testimonial.customerName,
        rating: testimonial.rating,
      }
    }).catch(err => {
      logger.error(`[Testimonial Service] Failed to create admin notification TESTIMONIAL_CREATED: ${err.message}`);
    });

    return testimonial;
  }

  static async getAll(filters: ITestimonialFilters) {
    const where: any = {};

    // Filtrer par statut d'approbation
    if (filters.isApproved !== undefined) {
      where.isApproved = filters.isApproved === 'true' || filters.isApproved === true;
    }

    // Filtrer par note (rating)
    if (filters.rating !== undefined) {
      where.rating = parseInt(filters.rating.toString(), 10);
    }

    // Recherche textuelle sur le nom ou le message - Insensible à la casse
    if (filters.search !== undefined && filters.search.trim() !== '') {
      where.OR = [
        {
          customerName: {
            contains: filters.search.trim(),
            mode: 'insensitive',
          },
        },
        {
          message: {
            contains: filters.search.trim(),
            mode: 'insensitive',
          },
        },
      ];
    }

    const page = filters.page ? parseInt(filters.page.toString(), 10) : 1;
    const limit = filters.limit ? parseInt(filters.limit.toString(), 10) : 10;
    const skip = (page - 1) * limit;

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.testimonial.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      testimonials,
      pagination: {
        totalResults: total,
        totalPages,
        page,
        limit,
      },
    };
  }

  /**
   * Récupérer un témoignage spécifique par son ID
   */
  static async getById(id: string) {
    const testimonial = await prisma.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      throw new AppError('Témoignage introuvable.', 404);
    }

    return testimonial;
  }

  /**
   * Mettre à jour un témoignage (champs modifiables)
   */
  static async update(id: string, data: UpdateTestimonialDTO) {
    await this.getById(id);

    return prisma.testimonial.update({
      where: { id },
      data,
    });
  }

  /**
   * Approuver ou rejeter un témoignage (Action réservée aux Admins)
   */
  static async approve(id: string, isApproved: boolean) {
    await this.getById(id);

    return prisma.testimonial.update({
      where: { id },
      data: { isApproved },
    });
  }

  /**
   * Supprimer définitivement un témoignage
   */
  static async delete(id: string) {
    await this.getById(id);

    return prisma.testimonial.delete({
      where: { id },
    });
  }
}

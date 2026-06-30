import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { ReservationStatus } from '@prisma/client';
import { CreateReservationDTO, ReservationQueryFilters, UpdateReservationDTO } from './reservation.types';
import { EmailProducer } from '../emails';
import { logger } from '../../utils/logger';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service';

export class ReservationService {
  private static MAX_RESERVATIONS_PER_SLOT = 20;

  /**
   * Valide la disponibilité d'un créneau de réservation
   */
  private static async validateAvailability(dateStr: string, timeStr: string, excludeId?: string) {
    const reservationDate = new Date(dateStr);
    reservationDate.setHours(0, 0, 0, 0); // Normaliser à minuit UTC/Local pour la comparaison pure de date

    const existingCount = await prisma.reservation.count({
      where: {
        reservationDate,
        reservationTime: timeStr,
        status: {
          not: ReservationStatus.CANCELLED,
        },
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existingCount >= this.MAX_RESERVATIONS_PER_SLOT) {
      throw new AppError('Aucune disponibilité pour cet horaire. La limite de tables réservées est atteinte.', 400);
    }
  }

  public static async createReservation(data: CreateReservationDTO, userId?: string) {
    // 1. Valider la disponibilité du créneau
    await this.validateAvailability(data.reservationDate, data.reservationTime);

    // 2. Normaliser la date à stocker (sans heures pour comparaison d'index pure)
    const normalizedDate = new Date(data.reservationDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const reservation = await prisma.reservation.create({
      data: {
        userId: userId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        reservationDate: normalizedDate,
        reservationTime: data.reservationTime,
        guestsCount: data.guestsCount,
        notes: data.notes || null,
        status: ReservationStatus.PENDING,
      },
    });

    // Créer une notification administrateur pour la nouvelle réservation
    AdminNotificationService.createNotification({
      title: "Nouvelle réservation",
      message: `Réservation pour ${reservation.customerName} (${reservation.guestsCount} personnes) le ${data.reservationDate} à ${reservation.reservationTime}`,
      type: "RESERVATION_CREATED",
      metadata: {
        reservationId: reservation.id,
        customerName: reservation.customerName,
        guestsCount: reservation.guestsCount,
      }
    }).catch(err => {
      logger.error(`[Reservation Service] Failed to create admin notification RESERVATION_CREATED: ${err.message}`);
    });

    // Fire Reservation Confirmation Email asynchronously (non-blocking)
    let emailDest = reservation.customerEmail;
    let firstName = reservation.customerName.split(' ')[0] || 'Client';

    if (!emailDest && userId) {
      prisma.user.findUnique({
        where: { id: userId },
      }).then(user => {
        if (user && user.email) {
          this.dispatchReservationEmail(user.email, user.firstName, reservation);
        }
      }).catch(err => {
        logger.error(`[Reservation Service] Failed user email lookup for ID=${userId}: ${err.message}`);
      });
    } else if (emailDest) {
      this.dispatchReservationEmail(emailDest, firstName, reservation);
    }

    return reservation;
  }

  /**
   * Helper method to dispatch reservation emails safely
   */
  private static dispatchReservationEmail(email: string, firstName: string, reservation: any) {
    const dateStr = new Date(reservation.reservationDate).toISOString().slice(0, 10);
    const timeStr = reservation.reservationTime;
    const dateTimeIso = `${dateStr}T${timeStr}:00`;

    EmailProducer.enqueueReservationConfirmationEmail(email, {
      firstName,
      date: dateTimeIso,
      guests: reservation.guestsCount,
      specialRequests: reservation.notes,
    }).catch(err => {
      logger.error(`[Reservation Service] Failed enqueuing Reservation Email to ${email}: ${err.message}`);
    });
  }

  /**
   * Récupérer toutes les réservations avec pagination, filtres et tri (Admin uniquement)
   */
  public static async getAllReservations(filters: ReservationQueryFilters) {
    const page = Math.max(1, parseInt(filters.page as string || '1', 10));
    const limit = Math.max(1, parseInt(filters.limit as string || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtrer par statut
    if (filters.status) {
      where.status = filters.status;
    }

    // Filtrer par date (Plage de dates)
    if (filters.startDate || filters.endDate) {
      where.reservationDate = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        where.reservationDate.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.reservationDate.lte = end;
      }
    }

    // Tri
    const sortBy = filters.sortBy || 'reservationDate';
    const sortOrder = filters.sortOrder || 'asc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const totalReservations = await prisma.reservation.count({ where });

    const reservations = await prisma.reservation.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        orderBy,
        { reservationTime: 'asc' }, // tri secondaire par heure
      ],
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalReservations / limit);

    return {
      reservations,
      pagination: {
        total: totalReservations,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Récupérer les détails d'une réservation par son ID
   */
  public static async getReservationById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new AppError('Réservation introuvable.', 404);
    }

    return reservation;
  }

  /**
   * Mettre à jour une réservation (Changement d'horaire, de statut ou d'informations)
   */
  public static async updateReservation(id: string, data: UpdateReservationDTO) {
    // 1. Récupérer la réservation existante
    const existing = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Réservation introuvable.', 404);
    }

    const updateData: any = { ...data };

    // 2. Si le créneau horaire ou la date change, vérifier la disponibilité sur le nouveau créneau
    const dateChanged = data.reservationDate && data.reservationDate !== existing.reservationDate.toISOString().slice(0, 10);
    const timeChanged = data.reservationTime && data.reservationTime !== existing.reservationTime;

    if (dateChanged || timeChanged) {
      const newDate = data.reservationDate || existing.reservationDate.toISOString().slice(0, 10);
      const newTime = data.reservationTime || existing.reservationTime;
      
      // On s'assure d'exclure cette réservation du calcul pour éviter qu'elle ne se bloque elle-même !
      await this.validateAvailability(newDate, newTime, id);

      const normalizedDate = new Date(newDate);
      normalizedDate.setHours(0, 0, 0, 0);
      updateData.reservationDate = normalizedDate;
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: updateData,
    });

    if (data.status === ReservationStatus.CANCELLED && existing.status !== ReservationStatus.CANCELLED) {
      AdminNotificationService.createNotification({
        title: "Réservation annulée",
        message: `La réservation pour ${updated.customerName} le ${new Date(updated.reservationDate).toISOString().slice(0, 10)} à ${updated.reservationTime} a été annulée`,
        type: "RESERVATION_CANCELLED",
        metadata: {
          reservationId: updated.id,
          customerName: updated.customerName,
        }
      }).catch(err => {
        logger.error(`[Reservation Service] Failed to create admin notification RESERVATION_CANCELLED: ${err.message}`);
      });
    }

    return updated;
  }

  /**
   * Supprimer définitivement une réservation (Admin uniquement)
   */
  public static async deleteReservation(id: string) {
    const existing = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Réservation introuvable.', 404);
    }

    return prisma.reservation.delete({
      where: { id },
    });
  }
}

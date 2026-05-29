import { Request, Response, NextFunction } from 'express';
import { ReservationService } from './reservation.service';

export class ReservationController {
  /**
   * @route   POST /api/reservations
   * @desc    Créer une nouvelle réservation de table
   * @access  Public / Client (Si connecté, on associe son ID)
   */
  public static createReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Si l'utilisateur est connecté, on associe son ID optionnel
      const userId = req.user?.adminId;

      const reservation = await ReservationService.createReservation(req.body, userId);

      return res.status(201).json({
        status: 'success',
        message: 'Réservation créée avec succès. Nous vous attendons avec impatience !',
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/reservations
   * @desc    Consulter toutes les réservations (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static getReservations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reservations, pagination } = await ReservationService.getAllReservations(req.query);

      return res.status(200).json({
        status: 'success',
        results: reservations.length,
        pagination,
        data: { reservations },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/reservations/:id
   * @desc    Détail d'une seule réservation (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static getReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservation = await ReservationService.getReservationById(req.params.id);

      return res.status(200).json({
        status: 'success',
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   PATCH /api/reservations/:id
   * @desc    Modifier une réservation ou changer son statut (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static updateReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reservation = await ReservationService.updateReservation(req.params.id, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Réservation mise à jour avec succès.',
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   DELETE /api/reservations/:id
   * @desc    Supprimer définitivement une réservation (Admin/Super Admin uniquement)
   * @access  Private (Admin / Super Admin)
   */
  public static deleteReservation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ReservationService.deleteReservation(req.params.id);

      return res.status(200).json({
        status: 'success',
        message: 'Réservation supprimée définitivement.',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}

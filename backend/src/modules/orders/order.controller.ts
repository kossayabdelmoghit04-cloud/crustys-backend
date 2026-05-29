import { Request, Response, NextFunction } from 'express';
import { OrderService } from './order.service';

export class OrderController {
  /**
   * @route   POST /api/orders
   * @desc    Créer une nouvelle commande
   * @access  Private / Public (Si connecté, on associe l'utilisateur)
   */
  public static createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Si l'utilisateur est connecté (token JWT valide), on associe son ID
      const userId = req.user?.userId || req.user?.adminId;

      const order = await OrderService.create(req.body, userId);

      return res.status(201).json({
        status: 'success',
        message: 'Commande créée avec succès.',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/orders/my-orders
   * @desc    Récupérer les commandes du client connecté
   * @access  Private (Client connecté uniquement)
   */
  public static getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId || req.user?.adminId;

      const { orders, pagination } = await OrderService.getAll({
        userId,
        page: req.query.page as string,
        limit: req.query.limit as string,
        status: req.query.status as any,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as any,
      });

      return res.status(200).json({
        status: 'success',
        results: orders.length,
        pagination,
        data: { orders },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/orders/:id
   * @desc    Récupérer les détails d'une seule commande
   * @access  Private (Propriétaire ou Admin/Manager)
   */
  public static getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id;
      const requesterUserId = req.user?.userId || req.user?.adminId;
      const requesterRole = req.user?.role;

      const order = await OrderService.getById(orderId, requesterUserId, requesterRole);

      return res.status(200).json({
        status: 'success',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/orders
   * @desc    Récupérer toutes les commandes (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orders, pagination } = await OrderService.getAll(req.query);

      return res.status(200).json({
        status: 'success',
        results: orders.length,
        pagination,
        data: { orders },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   PATCH /api/orders/:id/status
   * @desc    Mettre à jour le statut d'une commande (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id;
      const order = await OrderService.updateStatus(orderId, req.body);

      return res.status(200).json({
        status: 'success',
        message: 'Statut de la commande mis à jour avec succès.',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   POST /api/orders/:id/cancel
   * @desc    Annuler une commande (Client si PENDING, ou Admin)
   * @access  Private
   */
  public static cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id;
      const requesterUserId = req.user?.userId || req.user?.adminId;
      const requesterRole = req.user?.role;

      const order = await OrderService.cancelOrder(orderId, requesterUserId, requesterRole);

      return res.status(200).json({
        status: 'success',
        message: 'Commande annulée avec succès.',
        data: { order },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/orders/stats/sales
   * @desc    Obtenir les statistiques de vente (Admin/Super Admin uniquement)
   * @access  Private (Admin / Super Admin)
   */
  public static getSalesStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await OrderService.getStatistics();

      return res.status(200).json({
        status: 'success',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  };
}

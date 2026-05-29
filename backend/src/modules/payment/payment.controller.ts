import { Request, Response, NextFunction } from 'express';
import { PaymentService } from './payment.service';

export class PaymentController {
  /**
   * @route   POST /api/payments/create-intent
   * @desc    Créer un Stripe PaymentIntent pour une commande
   * @access  Private / Client
   */
  public static createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.adminId; // ID utilisateur ou admin connecté
      const result = await PaymentService.createPaymentIntent(req.body, userId);

      return res.status(200).json({
        status: 'success',
        message: 'PaymentIntent Stripe créé avec succès.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   POST /api/payments/webhook
   * @desc    Point d'entrée Webhook Stripe sécurisé (reçoit du JSON brut)
   * @access  Public (Stripe verification)
   */
  public static handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({
          status: 'fail',
          message: 'Signature Stripe-Signature manquante dans les en-têtes.',
        });
      }

      // Le middleware express.raw() peuple req.body avec un Buffer
      const result = await PaymentService.handleWebhook(req.body, signature);

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/payments
   * @desc    Consulter l'historique des transactions (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static getPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { payments, pagination } = await PaymentService.getPayments(req.query);

      return res.status(200).json({
        status: 'success',
        results: payments.length,
        pagination,
        data: { payments },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/payments/:id
   * @desc    Détail complet d'un paiement spécifique (Admin/Manager uniquement)
   * @access  Private (Admin / Manager)
   */
  public static getPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await PaymentService.getPaymentById(req.params.id);

      return res.status(200).json({
        status: 'success',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   POST /api/payments/:id/refund
   * @desc    Rembourser manuellement une transaction (Admin/Super Admin uniquement)
   * @access  Private (Admin / Super Admin)
   */
  public static refundPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentId = req.params.id;
      const { reason } = req.body;

      const payment = await PaymentService.refundPayment(paymentId, reason);

      return res.status(200).json({
        status: 'success',
        message: 'Transaction remboursée avec succès sur Stripe et stocks réintégrés.',
        data: { payment },
      });
    } catch (error) {
      next(error);
    }
  };
}

import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';

export class AnalyticsController {
  /**
   * @route   GET /api/analytics/dashboard
   * @desc    Résumé global des KPIs d'administration en temps réel
   * @access  Private (Admin / Manager)
   */
  public static getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await AnalyticsService.getDashboard(req.query);

      return res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/analytics/revenue
   * @desc    Détails analytiques des revenus (timeline, mode de paiement, catégories)
   * @access  Private (Admin / Manager)
   */
  public static getRevenueAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await AnalyticsService.getRevenueAnalytics(req.query);

      return res.status(200).json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/analytics/orders
   * @desc    Statistiques détaillées des volumes et statuts de commandes
   * @access  Private (Admin / Manager)
   */
  public static getOrderAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await AnalyticsService.getOrderAnalytics(req.query);

      return res.status(200).json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/analytics/products
   * @desc    Palmarès des produits vendus, rentabilité et ruptures de stocks
   * @access  Private (Admin / Manager)
   */
  public static getProductAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await AnalyticsService.getProductAnalytics(req.query);

      return res.status(200).json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * @route   GET /api/analytics/customers
   * @desc    Comportement client, Lifetime Value moyenne et top clients
   * @access  Private (Admin / Manager)
   */
  public static getCustomerAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await AnalyticsService.getCustomerAnalytics(req.query);

      return res.status(200).json({
        status: 'success',
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SECURITY METRICS ROUTE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Endpoint admin pour consulter le dashboard de sécurité.
 */

import { Router, Request, Response } from 'express';
import { securityMetrics } from '../../metrics/security.metrics';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

const securityRouter = Router();

/**
 * @route   GET /api/v1/security/metrics
 * @desc    Rapport de métriques de sécurité (dashboard admin)
 * @access  Private / Admin
 */
securityRouter.get(
  '/metrics',
  authenticate,
  authorize('ADMIN'),
  (_req: Request, res: Response) => {
    const report = securityMetrics.getReport();
    res.status(200).json({
      status: 'success',
      message: 'Rapport de sécurité généré avec succès.',
      data: {
        timestamp: new Date().toISOString(),
        ...report,
      },
    });
  }
);

/**
 * @route   POST /api/v1/security/metrics/reset
 * @desc    Réinitialiser les compteurs de sécurité
 * @access  Private / Admin
 */
securityRouter.post(
  '/metrics/reset',
  authenticate,
  authorize('ADMIN'),
  (_req: Request, res: Response) => {
    securityMetrics.reset();
    res.status(200).json({
      status: 'success',
      message: 'Compteurs de sécurité réinitialisés avec succès.',
    });
  }
);

export default securityRouter;

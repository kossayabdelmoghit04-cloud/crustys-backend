import { Router } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';

const devRouter = Router();

/**
 * @swagger
 * /dev/sentry-test:
 *   get:
 *     summary: Trigger a test error for Sentry verification
 *     description: This endpoint throws a runtime exception to test if Sentry is active and captures errors. Available only in development/testing mode.
 *     tags: [Health]
 *     responses:
 *       500:
 *         description: Internal Server Error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Sentry test"
 */
devRouter.get('/sentry-test', (req, res, next) => {
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') {
    return next(new AppError('Non autorisé en production.', 403));
  }
  throw new Error('Sentry test');
});

export default devRouter;

import { Router } from 'express';
import { UploadsController } from './uploads.controller';
import { uploadSingleImage, uploadMultipleImages } from '../../middlewares/upload.middleware';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { uploadRateLimiter } from '../../middlewares/upload-rate-limit.middleware';
import { uploadConfig } from '../../config/upload.config';

const uploadsRouter = Router();

/**
 * @route   POST /api/v1/uploads
 * @desc    Téléverser une image unique (Délégation en file d'attente asynchrone)
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  uploadRateLimiter,
  uploadSingleImage('image'),
  UploadsController.uploadSingle
);

/**
 * @route   POST /api/v1/uploads/gallery
 * @desc    Téléverser plusieurs images pour la galerie (Délégation asynchrone)
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.post(
  '/gallery',
  authenticate,
  authorize('ADMIN'),
  uploadRateLimiter,
  uploadMultipleImages('images', uploadConfig.maxFilesPerRequest),
  UploadsController.uploadGallery
);

/**
 * @route   GET /api/v1/uploads/status/:jobId
 * @desc    Consulter l'état de traitement d'une tâche asynchrone
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.get(
  '/status/:jobId',
  authenticate,
  authorize('ADMIN'),
  UploadsController.getJobStatus
);

/**
 * @route   GET /api/v1/uploads/metrics
 * @desc    Consulter les métriques et indicateurs de performance de la file d'images
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.get(
  '/metrics',
  authenticate,
  authorize('ADMIN'),
  UploadsController.getMetrics
);

/**
 * @route   DELETE /api/v1/uploads/:id
 * @desc    Supprimer définitivement un média de la base et du CDN
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  UploadsController.deleteUpload
);

/**
 * @route   POST /api/v1/uploads/retry/:jobId
 * @desc    Relancer manuellement une tâche d'upload échouée
 * @access  Private / Admin uniquement (RBAC)
 */
uploadsRouter.post(
  '/retry/:jobId',
  authenticate,
  authorize('ADMIN'),
  UploadsController.retryJob
);

export default uploadsRouter;

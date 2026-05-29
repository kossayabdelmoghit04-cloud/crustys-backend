import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma';
import { imageQueue } from '../../queues/image.queue';
import { UploadMonitoringService } from '../../services/upload-monitoring.service';
import { MediaCleanupService } from '../../services/media-cleanup.service';
import { UploadAuditLogger } from '../../logs/upload.audit';
import { ApiSuccessResponse } from '../../types/api-response.types';
import { logger } from '../../utils/logger';
import { uploadConfig } from '../../config/upload.config';
import { AppError } from '../../utils/appError';
import { IMulterSingleRequest, IMulterMultipleRequest } from './uploads.types';

export class UploadsController {
  /**
   * @route   POST /api/v1/uploads
   * @desc    Téléverser une image unique (Délégation asynchrone en arrière-plan)
   * @access  Private/Admin
   */
  static async uploadSingle(
    req: IMulterSingleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const prefix =
        typeof req.body?.prefix === 'string' && req.body.prefix.trim().length > 0
          ? req.body.prefix.trim()
          : uploadConfig.prefixes.upload;

      if (!req.file) {
        logger.warn(`[UPLOAD CONTROLLER FAILURE] Tentative d'upload sans fichier par l'utilisateur (IP: ${req.ip})`);
        throw new AppError('Aucun fichier fourni pour le téléversement.', 400);
      }

      const file = req.file;
      const tracingId = crypto.randomUUID();
      const fingerprint = crypto.createHash('sha256').update(`${req.ip}-${file.originalname}-${file.size}`).digest('hex');

      logger.info(`[UPLOAD CONTROLLER] Réception d'image unique. Fichier: "${file.originalname}" (Tracing ID: ${tracingId})`);
      
      // Log d'audit de démarrage du chargement client
      UploadAuditLogger.logEvent({
        action: 'UPLOAD_STARTED',
        tracingId,
        fileName: file.originalname,
        fileSize: file.size,
        prefix,
        ipAddress: req.ip,
      });

      // 1. Sauvegarde du buffer Multer en fichier temporaire local sécurisé
      const tempDir = path.join(process.cwd(), 'src/artifacts/temp-uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFileName = `${crypto.randomUUID()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const tempFilePath = path.join(tempDir, tempFileName);
      await fs.promises.writeFile(tempFilePath, file.buffer);

      // 2. Ajout de la tâche de traitement asynchrone à la file BullMQ
      const job = await imageQueue.add(
        'process-image',
        {
          tempFilePath,
          originalname: file.originalname,
          mimetype: file.mimetype,
          prefix,
          fingerprint,
          ipAddress: req.ip || '127.0.0.1',
          tracingId,
        },
        {
          jobId: tracingId, // Permet un tracing de bout en bout
        }
      );

      // Log d'audit de mise en file
      UploadAuditLogger.logEvent({
        action: 'UPLOAD_QUEUED',
        tracingId,
        fileName: file.originalname,
        metadata: { jobId: job.id, queue: 'image-processing' },
      });

      await UploadMonitoringService.logStep(
        job.id || tracingId,
        file.originalname,
        'VALIDATION',
        0,
        'Fichier mis en file d\'attente asynchrone.'
      );

      const response: ApiSuccessResponse<{ jobId: string; tracingId: string; statusUrl: string }> = {
        status: 'success',
        message: 'Le traitement et le téléversement de l\'image ont été délégués en arrière-plan avec succès.',
        data: {
          jobId: job.id || tracingId,
          tracingId,
          statusUrl: `/api/v1/uploads/status/${job.id}`,
        },
      };

      // 202 Accepted : Code standard d'API REST asynchrone
      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/v1/uploads/gallery
   * @desc    Téléverser plusieurs images (galerie) en arrière-plan
   * @access  Private/Admin
   */
  static async uploadGallery(
    req: IMulterMultipleRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const prefix =
        typeof req.body?.prefix === 'string' && req.body.prefix.trim().length > 0
          ? req.body.prefix.trim()
          : uploadConfig.prefixes.gallery;

      const files = Array.isArray(req.files)
        ? (req.files as Express.Multer.File[])
        : undefined;

      if (!files || files.length === 0) {
        logger.warn(`[UPLOAD CONTROLLER FAILURE] Tentative d'upload de galerie sans fichiers (IP: ${req.ip})`);
        throw new AppError('Aucun fichier fourni pour la galerie.', 400);
      }

      if (files.length > uploadConfig.maxFilesPerRequest) {
        logger.warn(`[UPLOAD CONTROLLER FAILURE] Tentative d'upload dépassant la limite (${files.length} fichiers) par l'IP ${req.ip}`);
        throw new AppError(`Le nombre maximum d'images autorisé pour la galerie est de ${uploadConfig.maxFilesPerRequest}.`, 400);
      }

      logger.info(`[UPLOAD CONTROLLER] Réception de galerie. ${files.length} fichiers en cours de sérialisation...`);

      const tempDir = path.join(process.cwd(), 'src/artifacts/temp-uploads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const queuedJobs = [];

      for (const file of files) {
        const tracingId = crypto.randomUUID();
        const fingerprint = crypto.createHash('sha256').update(`${req.ip}-${file.originalname}-${file.size}`).digest('hex');

        // Sauvegarde temporaire
        const tempFileName = `${crypto.randomUUID()}_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const tempFilePath = path.join(tempDir, tempFileName);
        await fs.promises.writeFile(tempFilePath, file.buffer);

        // Ajout queue
        const job = await imageQueue.add(
          'process-image',
          {
            tempFilePath,
            originalname: file.originalname,
            mimetype: file.mimetype,
            prefix,
            fingerprint,
            ipAddress: req.ip || '127.0.0.1',
            tracingId,
          },
          { jobId: tracingId }
        );

        UploadAuditLogger.logEvent({
          action: 'UPLOAD_QUEUED',
          tracingId,
          fileName: file.originalname,
          metadata: { jobId: job.id, gallery: true },
        });

        await UploadMonitoringService.logStep(
          job.id || tracingId,
          file.originalname,
          'VALIDATION',
          0,
          'Fichier de la galerie mis en file d\'attente.'
        );

        queuedJobs.push({
          jobId: job.id || tracingId,
          tracingId,
          originalname: file.originalname,
          statusUrl: `/api/v1/uploads/status/${job.id}`,
        });
      }

      const response: ApiSuccessResponse<{ count: number; jobs: typeof queuedJobs }> = {
        status: 'success',
        message: `${queuedJobs.length} image(s) enregistrée(s) et programmée(s) pour traitement asynchrone.`,
        data: {
          count: queuedJobs.length,
          jobs: queuedJobs,
        },
      };

      res.status(202).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/v1/uploads/status/:jobId
   * @desc    Consulter l'état de traitement d'une tâche d'upload
   * @access  Private/Admin
   */
  static async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await imageQueue.getJob(jobId);

      // Si la tâche n'est plus dans Redis (expirée ou supprimée), on recherche dans la base de données
      if (!job) {
        // Rechercher d'abord dans les échecs permanents
        const failedUpload = await (prisma as any).failedUpload.findUnique({
          where: { jobId },
        });

        if (failedUpload) {
          res.status(200).json({
            status: 'success',
            data: {
              jobId,
              state: 'failed',
              error: failedUpload.errorReason,
              attempts: failedUpload.attempts,
              createdAt: failedUpload.createdAt,
            },
          });
          return;
        }

        // Rechercher si des métadonnées de succès ont été associées à ce Tracing/Job ID
        const stepLogs = await (prisma as any).mediaProcessingLog.findMany({
          where: { jobId },
          orderBy: { createdAt: 'desc' },
        });

        if (stepLogs.length > 0) {
          const isSuccess = stepLogs.some((l: any) => l.step === 'SUCCESS');
          res.status(200).json({
            status: 'success',
            data: {
              jobId,
              state: isSuccess ? 'completed' : 'archived',
              history: stepLogs.map((l: any) => ({
                step: l.step,
                duration: l.duration,
                message: l.message,
                timestamp: l.createdAt,
              })),
            },
          });
          return;
        }

        throw new AppError('Aucune tâche correspondante n\'a pu être trouvée dans les registres actifs ou archivés.', 404);
      }

      const state = await job.getState();
      const progress = job.progress;
      const failedReason = job.failedReason;
      const result = job.returnvalue;

      res.status(200).json({
        status: 'success',
        data: {
          jobId: job.id,
          state,
          progress,
          failedReason: failedReason || null,
          result: result || null,
          attemptsMade: job.attemptsMade,
          timestamp: new Date(job.timestamp).toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   GET /api/v1/uploads/metrics
   * @desc    Consulter le rapport de monitoring et santé de la file média (Dashboard)
   * @access  Private/Admin (RBAC)
   */
  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await UploadMonitoringService.getDashboardMetrics();
      res.status(200).json({
        status: 'success',
        message: 'Rapport d\'observabilité média généré avec succès.',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   DELETE /api/v1/uploads/:id
   * @desc    Supprimer définitivement un média (Base de données + toutes ses variantes CDN)
   * @access  Private/Admin
   */
  static async deleteUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const media = await (prisma as any).mediaMetadata.findUnique({
        where: { id },
      });

      if (!media) {
        throw new AppError('Ce fichier média n\'existe pas ou a déjà été supprimé.', 404);
      }

      logger.info(`[UPLOAD CONTROLLER] Demande de suppression du média ID : ${id} ("${media.originalName}")`);

      // 1. Purge physique de toutes les variantes stockées sur Cloudinary (CDN)
      const urlsDict = media.urls as Record<string, string>;
      if (urlsDict) {
        await MediaCleanupService.deleteVariantsFromCdn(urlsDict);
      }

      // 2. Suppression logique de la base de données
      await (prisma as any).mediaMetadata.delete({
        where: { id },
      });

      logger.info(`[UPLOAD CONTROLLER SUCCESS] Média ID ${id} supprimé avec succès.`);

      res.status(200).json({
        status: 'success',
        message: 'Média et ses variantes CDN supprimés de l\'infrastructure avec succès.',
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @route   POST /api/v1/uploads/retry/:jobId
   * @desc    Relancer manuellement un téléversement asynchrone échoué (Dead Letter recovery)
   * @access  Private/Admin
   */
  static async retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await imageQueue.getJob(jobId);

      if (!job) {
        throw new AppError('Impossible de localiser la tâche dans Redis pour relancer le traitement.', 404);
      }

      const state = await job.getState();
      if (state !== 'failed') {
        throw new AppError(`Seules les tâches échouées peuvent être relancées. État actuel : ${state}`, 400);
      }

      // Relancement natif de BullMQ
      await job.retry();
      
      // Nettoyer l'archive d'échecs de la base si présente
      await (prisma as any).failedUpload.deleteMany({
        where: { jobId },
      });

      logger.info(`[UPLOAD CONTROLLER] Relancement manuel initié par admin pour le Job #${jobId}`);

      res.status(200).json({
        status: 'success',
        message: 'La tâche échouée a été réinjectée dans la file d\'attente.',
        data: {
          jobId,
          state: 'waiting',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

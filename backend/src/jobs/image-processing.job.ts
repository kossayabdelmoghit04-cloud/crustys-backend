import { Job } from 'bullmq';
import { IImageJobPayload } from '../queues/image.queue';
import { UploadsService } from '../modules/uploads/uploads.service';
import { prisma } from '../utils/prisma';
import { UploadMetricsTracker } from '../metrics/upload.metrics';
import { UploadMonitoringService } from '../services/upload-monitoring.service';
import { UploadAuditLogger } from '../logs/upload.audit';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

/**
 * Job de traitement d'image exécuté en arrière-plan.
 */
export class ImageProcessingJob {
  static async run(job: Job<IImageJobPayload>): Promise<any> {
    const startTime = Date.now();
    const { tempFilePath, originalname, mimetype, prefix, fingerprint, ipAddress, tracingId } = job.data;

    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Fichier temporaire inexistant : ${tempFilePath}`);
    }

    const fileBuffer = await fs.promises.readFile(tempFilePath);
    
    const multerFile: Express.Multer.File = {
      fieldname: 'image',
      originalname,
      encoding: '7bit',
      mimetype,
      size: fileBuffer.length,
      destination: '',
      filename: path.basename(tempFilePath),
      path: tempFilePath,
      buffer: fileBuffer,
      stream: null as any,
    };

    const uploadedResult = await UploadsService.processSingleImage(multerFile, prefix);
    
    const mediaMeta = await (prisma as any).mediaMetadata.create({
      data: {
        originalName: uploadedResult.originalName,
        format: uploadedResult.format,
        size: uploadedResult.size,
        width: uploadedResult.dimensions.width,
        height: uploadedResult.dimensions.height,
        urls: uploadedResult.urls as any,
        variants: {
          original: uploadedResult.original,
          thumbnail: uploadedResult.thumbnail,
          medium: uploadedResult.medium,
          large: uploadedResult.large,
          gallery: uploadedResult.gallery,
        } as any,
        uploadDuration: uploadedResult.uploadDuration,
        totalDuration: uploadedResult.totalDuration,
      },
    });

    const totalDuration = Date.now() - startTime;

    await UploadMetricsTracker.recordSuccess(
      uploadedResult.processingDuration,
      uploadedResult.uploadDuration,
      uploadedResult.compressionRatio
    );

    UploadAuditLogger.logEvent({
      action: 'PROCESSING_COMPLETED',
      tracingId,
      fileName: originalname,
      fileSize: uploadedResult.size,
      durationMs: totalDuration,
      metadata: { mediaMetaId: mediaMeta.id, jobId: job.id },
    });

    await UploadMonitoringService.logStep(
      job.id || 'unknown',
      originalname,
      'SUCCESS',
      totalDuration,
      `Traitement asynchrone complété. Fichier CDN créé.`
    );

    return {
      mediaMetaId: mediaMeta.id,
      urls: uploadedResult.urls,
      dimensions: uploadedResult.dimensions,
    };
  }
}

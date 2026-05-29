import { MediaCleanupService } from '../services/media-cleanup.service';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { UploadAuditLogger } from '../logs/upload.audit';

/**
 * Job de nettoyage d'images orphelines et de fichiers temporaires obsolètes.
 */
export class ImageCleanupJob {
  static async run(): Promise<{ cleanedOrphans: number }> {
    logger.info('[CLEANUP JOB] Exécution du job de nettoyage global...');
    const startTime = Date.now();

    try {
      // 1. Nettoyage des images orphelines (CDN + DB)
      const cleanedOrphans = await MediaCleanupService.cleanupOrphanImages();

      // 2. Nettoyage des fichiers temporaires disques (>2h)
      await MediaCleanupService.cleanupTemporaryFiles();

      const durationMs = Date.now() - startTime;
      logger.info(`[CLEANUP JOB SUCCESS] Exécution terminée avec succès en ${durationMs}ms.`);

      UploadAuditLogger.logEvent({
        action: 'CLEANUP_COMPLETED',
        tracingId: crypto.randomUUID(),
        durationMs,
        metadata: { cleanedOrphans },
      });

      return { cleanedOrphans };
    } catch (err) {
      logger.error('[CLEANUP JOB FAILURE] Échec critique du job de nettoyage :', err);
      throw err;
    }
  }
}

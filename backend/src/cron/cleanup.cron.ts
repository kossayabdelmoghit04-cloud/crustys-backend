import cron from 'node-cron';
import crypto from 'crypto';
import { ImageCleanupJob } from '../jobs/image-cleanup.job';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { UploadAuditLogger } from '../logs/upload.audit';

/**
 * Initialise les tâches automatisées récurrentes (Cron Jobs) du système média.
 * Par défaut, planifie un nettoyage complet toutes les nuits à minuit (00:00).
 */
export const initMediaCronJobs = (): void => {
  // Planification : Tous les jours à minuit ("0 0 * * *")
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON JOB] Lancement de la maintenance nocturne globale du système média...');
    const startTime = Date.now();

    try {
      // 1. Nettoyage des images orphelines et fichiers temporaires via le Job dédié
      const { cleanedOrphans: cleanedOrphansCount } = await ImageCleanupJob.run();

      // 3. Purge des anciens échecs d'uploads permanents vieux de plus de 30 jours
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const purgeFailedResult = await (prisma as any).failedUpload.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      // 4. Nettoyage des logs d'étape de traitement en base de données vieux de plus de 7 jours
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const purgeLogsResult = await (prisma as any).mediaProcessingLog.deleteMany({
        where: {
          createdAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      const totalDuration = Date.now() - startTime;
      logger.info(
        `[CRON SUCCESS] Maintenance nocturne complétée avec succès en ${totalDuration}ms. ` +
        `[Orphelins supprimés : ${cleanedOrphansCount}] ` +
        `[Échecs purgés (>30j) : ${purgeFailedResult.count}] ` +
        `[Logs étapes purgés (>7j) : ${purgeLogsResult.count}]`
      );

      // Audit log de maintenance réussie
      UploadAuditLogger.logEvent({
        action: 'CLEANUP_COMPLETED',
        tracingId: crypto.randomUUID(),
        durationMs: totalDuration,
        metadata: {
          cleanedOrphansCount,
          purgedFailedCount: purgeFailedResult.count,
          purgedLogsCount: purgeLogsResult.count,
        },
      });
    } catch (err) {
      logger.error('[CRON FAILURE] Une erreur critique est survenue lors de la maintenance nocturne :', err);
    }
  });

  logger.info('[CRON SYSTEM] Tâches planifiées nocturnes (Cron) enregistrées avec succès.');
};

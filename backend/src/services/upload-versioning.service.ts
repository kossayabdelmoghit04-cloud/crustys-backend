import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export class UploadVersioningService {
  /**
   * Versionne une URL CDN pour forcer le rafraîchissement du cache (cache-busting).
   * Si une version existe déjà pour cette ressource, elle est incrémentée.
   * Sinon, une nouvelle entrée de versioning est créée.
   * 
   * @param resourceId Identifiant unique de la ressource concernée (ex: productId, categoryId)
   * @param originalUrl L'URL de base Cloudinary de la variante originale
   * @returns L'URL décorée avec son tag de versioning (?v=X)
   */
  static async getVersionedUrl(resourceId: string, originalUrl: string): Promise<string> {
    try {
      const existing = await (prisma as any).uploadVersion.findFirst({
        where: { resourceId },
      });

      if (existing) {
        const nextVersion = existing.version + 1;
        const updated = await (prisma as any).uploadVersion.update({
          where: { id: existing.id },
          data: {
            version: nextVersion,
            originalUrl,
            activeUrl: `${originalUrl}?v=${nextVersion}`,
          },
        });
        logger.info(`[VERSION SYSTEM] Version incrémentée pour la ressource ${resourceId}: v${nextVersion}`);
        return updated.activeUrl;
      }

      const created = await (prisma as any).uploadVersion.create({
        data: {
          resourceId,
          version: 1,
          originalUrl,
          activeUrl: `${originalUrl}?v=1`,
        },
      });

      logger.info(`[VERSION SYSTEM] Nouvelle version générée pour la ressource ${resourceId}: v1`);
      return created.activeUrl;
    } catch (err) {
      logger.error(`[VERSION SYSTEM ERROR] Impossible d'effectuer le versioning pour la ressource ${resourceId} :`, err);
      // Fallback résilient en retournant l'URL brute
      return originalUrl;
    }
  }

  /**
   * Récupère la version actuellement active pour une ressource donnée.
   */
  static async getActiveVersion(resourceId: string): Promise<number> {
    try {
      const entry = await (prisma as any).uploadVersion.findFirst({
        where: { resourceId },
      });
      return entry ? entry.version : 0;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Supprime l'historique de versioning d'une ressource.
   */
  static async removeVersionHistory(resourceId: string): Promise<void> {
    try {
      await (prisma as any).uploadVersion.deleteMany({
        where: { resourceId },
      });
      logger.info(`[VERSION SYSTEM] Historique de versioning purgé pour la ressource : ${resourceId}`);
    } catch (err) {
      logger.error(`[VERSION SYSTEM ERROR] Échec de la purge de versioning pour la ressource ${resourceId} :`, err);
    }
  }
}

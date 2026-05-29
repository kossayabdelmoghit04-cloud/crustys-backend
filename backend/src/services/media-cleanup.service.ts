import { cloudinary } from '../config/cloudinary.config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export class MediaCleanupService {
  /**
   * Extrait le public_id de Cloudinary à partir d'une URL CDN.
   * Format typique : https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.webp?v=1
   */
  static extractPublicId(url: string): string | null {
    try {
      if (!url || !url.includes('cloudinary.com')) return null;
      
      const uploadAnchor = '/image/upload/';
      const parts = url.split(uploadAnchor);
      if (parts.length < 2) return null;

      // Retire le tag de version "v[chiffres]/" si présent
      let rawPath = parts[1].replace(/^v\d+\//, '');
      
      // Enlève l'extension de fichier à la fin (ex: .webp)
      const lastDot = rawPath.lastIndexOf('.');
      if (lastDot !== -1) {
        rawPath = rawPath.substring(0, lastDot);
      }

      // Enlève les paramètres de requête éventuels (ex: ?v=2)
      return rawPath.split('?')[0];
    } catch (err) {
      logger.error(`[CLEANUP SERVICE ERROR] Extraction de public_id échouée pour "${url}" :`, err);
      return null;
    }
  }

  /**
   * Supprime définitivement une ressource du CDN Cloudinary par son URL ou son public_id.
   */
  static async deleteFromCdn(urlOrPublicId: string): Promise<boolean> {
    const publicId = urlOrPublicId.includes('http')
      ? this.extractPublicId(urlOrPublicId)
      : urlOrPublicId;

    if (!publicId) {
      logger.warn(`[CLEANUP SERVICE WARNING] Impossible d'extraire le public_id de l'URL : "${urlOrPublicId}"`);
      return false;
    }

    try {
      const res = await cloudinary.uploader.destroy(publicId);
      const isSuccess = res.result === 'ok' || res.result === 'not_found';
      
      logger.info(`[CLEANUP CDN] Suppression CDN de "${publicId}" : ${res.result} (${isSuccess ? 'SUCCÈS' : 'ÉCHEC'})`);
      return isSuccess;
    } catch (err) {
      logger.error(`[CLEANUP SERVICE ERROR] Échec de la suppression CDN pour "${publicId}" :`, err);
      return false;
    }
  }

  /**
   * Supprime un ensemble complet de variantes d'images du CDN.
   * 
   * @param urls Objet contenant le dictionnaire de variantes et leurs URLs associées
   */
  static async deleteVariantsFromCdn(urls: Record<string, string>): Promise<void> {
    const promises = Object.values(urls).map((url) => this.deleteFromCdn(url));
    await Promise.all(promises);
    logger.info(`[CLEANUP CDN] ${promises.length} variantes d'images purgées du CDN.`);
  }

  /**
   * Analyse et nettoie toutes les images "orphelines" de l'infrastructure.
   * Une image est orpheline si elle est enregistrée dans MediaMetadata mais qu'aucune table métier
   * (Product, ProductImage, Category, Testimonial, SiteContent) n'y fait référence.
   * 
   * @returns Nombre d'images orphelines nettoyées
   */
  static async cleanupOrphanImages(): Promise<number> {
    logger.info('[CLEANUP ORPHANS] Démarrage du scan relationnel des images orphelines...');
    const startTime = Date.now();

    try {
      // 1. Récupération de tous les enregistrements MediaMetadata
      const allMedia = await (prisma as any).mediaMetadata.findMany({
        select: { id: true, urls: true },
      });

      if (allMedia.length === 0) {
        logger.info('[CLEANUP ORPHANS] Aucune métadonnée d\'image enregistrée en base. Scan annulé.');
        return 0;
      }

      // 2. Récupération de toutes les images utilisées par le métier
      const [products, productImages, categories, testimonials, siteContents] = await Promise.all([
        prisma.product.findMany({ select: { image: true }, where: { image: { not: null } } }),
        prisma.productImage.findMany({ select: { imageUrl: true } }),
        prisma.category.findMany({ select: { image: true }, where: { image: { not: null } } }),
        prisma.testimonial.findMany({ select: { message: true } }), // Les avatars ne sont pas en base ou simulés, nettoyons si non utilisés
        prisma.siteContent.findMany({ select: { imageUrl: true }, where: { imageUrl: { not: null } } }),
      ]);

      // Set d'images actuellement utilisées en production pour un look-up en O(1)
      const activeUrls = new Set<string>();
      
      products.forEach((p) => p.image && activeUrls.add(p.image));
      productImages.forEach((pi) => activeUrls.add(pi.imageUrl));
      categories.forEach((c) => c.image && activeUrls.add(c.image));
      siteContents.forEach((sc) => sc.imageUrl && activeUrls.add(sc.imageUrl));

      // 3. Identification des orphelins (MediaMetadata dont l'original n'est pas actif)
      const orphans = allMedia.filter((media: any) => {
        const urls = media.urls as Record<string, string>;
        // Si l'une des variantes n'est plus liée à aucune entité active, elle est qualifiée d'orpheline
        const originalUrl = urls?.original;
        return originalUrl && !activeUrls.has(originalUrl);
      });

      if (orphans.length === 0) {
        logger.info(`[CLEANUP ORPHANS] Fin du scan. 0 image orpheline détectée (Scan en ${Date.now() - startTime}ms).`);
        return 0;
      }

      logger.info(`[CLEANUP ORPHANS] ${orphans.length} images orphelines détectées. Lancement de la purge...`);

      let deletedCount = 0;
      for (const orphan of orphans) {
        const urls = orphan.urls as Record<string, string>;
        if (urls) {
          // Purge physique CDN des variantes
          await this.deleteVariantsFromCdn(urls);
        }
        // Purge logique de la base de données
        await (prisma as any).mediaMetadata.delete({ where: { id: orphan.id } });
        deletedCount++;
      }

      const duration = Date.now() - startTime;
      logger.info(`[CLEANUP ORPHANS SUCCESS] Purge complétée en ${duration}ms. ${deletedCount} images orphelines et toutes leurs variantes supprimées.`);
      return deletedCount;
    } catch (err) {
      logger.error('[CLEANUP ORPHANS FAILURE] Erreur lors du nettoyage des images orphelines :', err);
      return 0;
    }
  }

  /**
   * Nettoie les fichiers temporaires locaux restants en cas de plantage des workers.
   */
  static async cleanupTemporaryFiles(): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'src/artifacts/temp-uploads');

    if (!fs.existsSync(tempDir)) return;

    try {
      const files = fs.readdirSync(tempDir);
      let count = 0;
      const now = Date.now();
      const ageThreshold = 2 * 60 * 60 * 1000; // Supprimer les fichiers vieux de plus de 2 heures

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > ageThreshold) {
          fs.unlinkSync(filePath);
          count++;
        }
      }
      if (count > 0) {
        logger.info(`[CLEANUP TEMPORARY] ${count} fichiers temporaires orphelins supprimés du disque.`);
      }
    } catch (err) {
      logger.error('[CLEANUP TEMPORARY FAILURE] Échec du nettoyage des fichiers temporaires :', err);
    }
  }
}

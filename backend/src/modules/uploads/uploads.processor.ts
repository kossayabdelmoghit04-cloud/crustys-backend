import sharp from 'sharp';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import { uploadConfig } from '../../config/upload.config';
import { IImageVariantBuffer, IProcessingResult } from './uploads.types';

export class UploadsProcessor {
  /**
   * Valide les dimensions de l'image et génère les différentes variantes responsives en parallèle.
   * Utilise Sharp pour convertir en WebP, compresser à 80%, et supprimer les métadonnées.
   * 
   * @param buffer Le buffer de l'image d'origine
   * @param originalName Nom original pour le logging
   * @returns Un objet contenant les métadonnées et buffers de toutes les variantes générées
   */
  static async processImage(buffer: Buffer, originalName: string): Promise<IProcessingResult> {
    const startTime = Date.now();
    logger.info(`[SHARP PROCESSOR] Début du traitement de l'image : "${originalName}"`);

    try {
      // 1. Extraction et validation des métadonnées
      const metadata = await sharp(buffer).metadata();
      const { width, height, format } = metadata;

      if (!width || !height) {
        logger.error(`[SHARP PROCESSOR FAILURE] Fichier corrompu ou format non supporté: "${originalName}"`);
        throw new AppError('Le fichier image est corrompu ou son format est illisible par le processeur.', 400);
      }

      // 2. Validation des dimensions minimales et maximales
      const { minWidth, minHeight, maxWidth, maxHeight } = uploadConfig.validation;
      if (width < minWidth || height < minHeight) {
        logger.warn(`[SHARP PROCESSOR REJECTED] Image trop petite: ${width}x${height} (Min requis: ${minWidth}x${minHeight})`);
        throw new AppError(
          `L'image est trop petite (${width}x${height}px). Les dimensions minimales requises sont de ${minWidth}x${minHeight}px.`,
          400
        );
      }

      if (width > maxWidth || height > maxHeight) {
        logger.warn(`[SHARP PROCESSOR REJECTED] Image trop grande: ${width}x${height} (Max autorisé: ${maxWidth}x${maxHeight})`);
        throw new AppError(
          `L'image est trop grande (${width}x${height}px). Les dimensions maximales autorisées sont de ${maxWidth}x${maxHeight}px.`,
          400
        );
      }

      logger.info(`[SHARP PROCESSOR] Dimensions validées : ${width}x${height}px (Format d'origine : ${format})`);

      // 3. Pipeline de base Sharp pour WebP
      const basePipeline = (w?: number, h?: number, fit: 'cover' | 'inside' = 'inside') => {
        let pipeline = sharp(buffer);
        
        // Redimensionnement si des dimensions cibles sont passées
        if (w && h) {
          pipeline = pipeline.resize(w, h, {
            fit,
            withoutEnlargement: true, // Évite d'agrandir des images plus petites que la cible
          });
        }

        // Conversion WebP, compression qualité 80 et suppression complète des EXIF/Métadonnées
        return pipeline
          .webp({ quality: uploadConfig.sharp.quality })
          .toBuffer({ resolveWithObject: true });
      };

      // 4. Génération parallèle de toutes les variantes responsives requises
      const [originalRes, thumbnailRes, mediumRes, largeRes, galleryRes] = await Promise.all([
        // Version originale optimisée en WebP
        basePipeline(),
        // Vignette (Thumbnail) - 400x400
        basePipeline(uploadConfig.variants.thumbnail.width, uploadConfig.variants.thumbnail.height, uploadConfig.variants.thumbnail.fit),
        // Moyenne (Medium) - 800x800
        basePipeline(uploadConfig.variants.medium.width, uploadConfig.variants.medium.height, uploadConfig.variants.medium.fit),
        // Grande (Large) - 1200x1200
        basePipeline(uploadConfig.variants.large.width, uploadConfig.variants.large.height, uploadConfig.variants.large.fit),
        // Galerie (Gallery HD) - 1600x900
        basePipeline(uploadConfig.variants.gallery.width, uploadConfig.variants.gallery.height, uploadConfig.variants.gallery.fit),
      ]);

      const processingDuration = Date.now() - startTime;
      const initialSize = buffer.length;
      const finalOptimizedSize = originalRes.info.size;
      const compressionRatio = Number(((initialSize - finalOptimizedSize) / initialSize * 100).toFixed(2));

      logger.info(
        `[SHARP PROCESSOR SUCCESS] Traitement terminé pour "${originalName}" en ${processingDuration}ms. ` +
        `Compression de l'original : -${compressionRatio}% (${initialSize} -> ${finalOptimizedSize} octets)`
      );

      // Regroupement des variantes
      const variants: Record<string, IImageVariantBuffer> = {
        original: {
          buffer: originalRes.data,
          width: originalRes.info.width,
          height: originalRes.info.height,
          size: originalRes.info.size,
          format: uploadConfig.sharp.format,
        },
        thumbnail: {
          buffer: thumbnailRes.data,
          width: thumbnailRes.info.width,
          height: thumbnailRes.info.height,
          size: thumbnailRes.info.size,
          format: uploadConfig.sharp.format,
        },
        medium: {
          buffer: mediumRes.data,
          width: mediumRes.info.width,
          height: mediumRes.info.height,
          size: mediumRes.info.size,
          format: uploadConfig.sharp.format,
        },
        large: {
          buffer: largeRes.data,
          width: largeRes.info.width,
          height: largeRes.info.height,
          size: largeRes.info.size,
          format: uploadConfig.sharp.format,
        },
        gallery: {
          buffer: galleryRes.data,
          width: galleryRes.info.width,
          height: galleryRes.info.height,
          size: galleryRes.info.size,
          format: uploadConfig.sharp.format,
        },
      };

      return {
        originalDimensions: { width, height },
        originalSize: initialSize,
        optimizedSize: finalOptimizedSize,
        format: uploadConfig.sharp.format,
        processingDuration,
        variantsCount: Object.keys(variants).length,
        compressionRatio,
        variants,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      logger.error(`[SHARP PROCESSOR ERROR] Erreur interne Sharp lors du traitement de "${originalName}" :`, err);
      throw new AppError('Erreur interne lors du traitement ou de la compression de l\'image.', 500);
    }
  }
}

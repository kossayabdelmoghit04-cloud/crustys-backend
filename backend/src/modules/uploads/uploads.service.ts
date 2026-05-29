import { ZodError } from 'zod';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import {
  generateSecureFilename,
  validateImageSignature,
  getCleanExtension,
  hasSuspiciousDoubleExtension,
  sanitizeOriginalFilename,
} from '../../utils/file.utils';
import { uploadConfig } from '../../config/upload.config';
import { UploadsProcessor } from './uploads.processor';
import { UploadsCloudinary } from './uploads.cloudinary';
import { IUploadedImage, IImageVariant } from './uploads.types';
import { rawFileSchema, rawFilesArraySchema } from './uploads.validation';

export class UploadsService {
  /**
   * Valide, traite (Sharp) et téléverse (Cloudinary) une seule image.
   * Génère 5 versions d'images responsives optimisées en WebP et retourne les métadonnées.
   * 
   * @param file Le fichier brut fourni par Multer
   * @param prefix Préfixe pour le nom de fichier (ex: 'product', 'user')
   * @returns Métadonnées complètes avec les URLs Cloudinary de chaque variante
   */
  static async processSingleImage(
    file: Express.Multer.File | undefined,
    prefix: string = uploadConfig.prefixes.upload
  ): Promise<IUploadedImage> {
    const startTime = Date.now();

    if (!file) {
      logger.warn(`[UPLOAD SERVICE FAILURE] Tentative de traitement d'un fichier indéfini.`);
      throw new AppError('Aucun fichier fourni pour l\'upload.', 400);
    }

    logger.info(`[UPLOAD SERVICE] Début du pipeline pour le fichier original : "${file.originalname}" (Taille : ${file.size} octets)`);

    // 1. Validation de sécurité (Double extension)
    if (hasSuspiciousDoubleExtension(file.originalname)) {
      logger.warn(`[SECURITY ALERT - SUSPICIOUS UPLOAD] Fichier avec double extension suspecte rejeté : "${file.originalname}"`);
      throw new AppError(
        'Téléversement rejeté pour des raisons de sécurité : le nom du fichier contient des extensions multiples suspectes.',
        400
      );
    }

    // 2. Validation structurelle avec Zod (MIME théorique, taille brute)
    try {
      rawFileSchema.parse(file);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn(`[UPLOAD SERVICE FAILURE] Erreur de validation structurelle : ${err.errors[0].message}`);
        throw new AppError(err.errors[0].message, 400);
      }
      throw err;
    }

    // 3. Validation de signature binaire (Magic Numbers)
    const signatureCheck = validateImageSignature(file.buffer);
    if (!signatureCheck.isValid) {
      logger.warn(`[SECURITY ALERT - SUSPICIOUS UPLOAD] Fichier avec signature binaire non autorisée rejeté : "${file.originalname}"`);
      throw new AppError(
        'Le fichier est corrompu ou son contenu binaire ne correspond pas à une image autorisée (JPEG, PNG ou WEBP).',
        400
      );
    }

    // 4. Comparaison stricte Signature vs Extension
    const cleanExt = getCleanExtension(file.originalname);
    const expectedMime = signatureCheck.mime;
    const allowedExtensions = this.getExtensionsForMime(expectedMime);

    if (!allowedExtensions.includes(cleanExt)) {
      logger.warn(
        `[SECURITY ALERT - SUSPICIOUS UPLOAD] Tentative d'upload avec extension incohérente. Fichier: "${file.originalname}" (Signature: ${expectedMime}, Extension: "${cleanExt}")`
      );
      throw new AppError(
        'Incohérence détectée : l\'extension du fichier ne correspond pas au contenu binaire réel.',
        400
      );
    }

    const sanitizedOriginalName = sanitizeOriginalFilename(file.originalname);

    // 5. Génération du nom de base sécurisé pour le stockage
    const secureBaseName = generateSecureFilename(prefix);

    // 6. Traitement d'image Sharp (Responsive variants generation + validation des dimensions)
    const processingResult = await UploadsProcessor.processImage(file.buffer, sanitizedOriginalName);
    const processingDuration = processingResult.processingDuration;

    // 7. Détermination du dossier Cloudinary cible selon le préfixe
    const targetFolder = uploadConfig.folders[prefix] || uploadConfig.folders.upload;

    // 8. Téléversement parallèle de toutes les variantes vers Cloudinary
    logger.info(`[UPLOAD SERVICE] Début du téléversement Cloudinary de ${processingResult.variantsCount} variantes en parallèle...`);
    const uploadStartTime = Date.now();

    try {
      const variantKeys = Object.keys(processingResult.variants);
      const uploadPromises = variantKeys.map(async (key) => {
        const variant = processingResult.variants[key];
        // Ajout d'un suffixe unique propre à chaque variante
        const variantFilename = `${secureBaseName}_${key}`;

        const uploadResult = await UploadsCloudinary.uploadBuffer(
          variant.buffer,
          targetFolder,
          variantFilename
        );

        return {
          key,
          url: uploadResult.secure_url,
          width: variant.width,
          height: variant.height,
          size: variant.size,
          format: variant.format,
        };
      });

      const uploadResults = await Promise.all(uploadPromises);
      const uploadDuration = Date.now() - uploadStartTime;
      const totalDuration = Date.now() - startTime;

      // Construction de la réponse finale structurée
      const variantsData: Record<string, IImageVariant> = {};
      const urlsMap: Record<string, string> = {};

      for (const res of uploadResults) {
        const variantMeta: IImageVariant = {
          url: res.url,
          width: res.width,
          height: res.height,
          size: res.size,
          format: res.format,
        };
        variantsData[res.key] = variantMeta;
        urlsMap[res.key] = res.url;
      }

      logger.info(
        `[PIPELINE MEDIA COMPLETED] Image "${sanitizedOriginalName}" entièrement traitée et publiée. ` +
        `Stats : [Total: ${totalDuration}ms] [Processing: ${processingDuration}ms] [Upload: ${uploadDuration}ms] ` +
        `[Ratio compression: -${processingResult.compressionRatio}%]`
      );

      return {
        originalName: sanitizedOriginalName,
        original: variantsData.original,
        thumbnail: variantsData.thumbnail,
        medium: variantsData.medium,
        large: variantsData.large,
        gallery: variantsData.gallery,
        urls: {
          original: urlsMap.original,
          thumbnail: urlsMap.thumbnail,
          medium: urlsMap.medium,
          large: urlsMap.large,
          gallery: urlsMap.gallery,
        },
        dimensions: processingResult.originalDimensions,
        size: processingResult.optimizedSize,
        format: processingResult.format,
        processingDuration,
        uploadDuration,
        totalDuration,
        compressionRatio: processingResult.compressionRatio,
      };
    } catch (err) {
      logger.error(`[UPLOAD SERVICE FAILURE] Échec lors du téléversement des variantes vers Cloudinary :`, err);
      if (err instanceof AppError) throw err;
      throw new AppError('Erreur lors du transfert des variantes d\'images vers le stockage distant.', 502);
    }
  }

  /**
   * Traite et téléverse un tableau d'images (galerie) en parallèle pour maximiser le débit serveur.
   * Utilise Promise.all() pour éviter le blocage de la boucle d'événements Node.js.
   * 
   * @param files Tableau de fichiers Multer
   * @param prefix Préfixe appliqué aux images
   * @returns Tableau contenant les payloads de retour pour toutes les images traitées
   */
  static async processMultipleImages(
    files: Express.Multer.File[] | undefined,
    prefix: string = uploadConfig.prefixes.gallery
  ): Promise<IUploadedImage[]> {
    const startTime = Date.now();

    if (!files || files.length === 0) {
      logger.warn(`[UPLOAD SERVICE FAILURE] Galerie : aucun fichier fourni.`);
      throw new AppError('Aucun fichier fourni pour l\'upload.', 400);
    }

    // Double validation de sécurité sur la limite de fichiers
    if (files.length > uploadConfig.maxFilesPerRequest) {
      logger.warn(`[SECURITY ALERT - SUSPICIOUS UPLOAD] Trop d'images soumises en galerie (${files.length} fichiers). Limite : ${uploadConfig.maxFilesPerRequest}`);
      throw new AppError(`Vous ne pouvez pas téléverser plus de ${uploadConfig.maxFilesPerRequest} images simultanément.`, 400);
    }

    logger.info(`[UPLOAD SERVICE] Début du traitement multi-images de la galerie. Nombre d'images : ${files.length}`);

    // 1. Validation structurelle globale Zod
    try {
      rawFilesArraySchema.parse(files);
    } catch (err) {
      if (err instanceof ZodError) {
        logger.warn(`[UPLOAD SERVICE FAILURE] Galerie : Erreur de structure : ${err.errors[0].message}`);
        throw new AppError(err.errors[0].message, 400);
      }
      throw err;
    }

    // 2. Traitement asynchrone parallèle de chaque image
    const processingPromises = files.map((file) => this.processSingleImage(file, prefix));

    try {
      const results = await Promise.all(processingPromises);
      const totalDuration = Date.now() - startTime;

      logger.info(`[PIPELINE MULTI COMPLETED] Galerie traitée avec succès en ${totalDuration}ms. ${results.length} images publiées.`);
      return results;
    } catch (err) {
      logger.error(`[UPLOAD SERVICE MULTI FAILURE] Échec lors du traitement collectif de la galerie :`, err);
      throw err; // Propager l'AppError exacte générée en interne
    }
  }

  /**
   * Retourne les extensions autorisées pour un MIME type binaire
   */
  private static getExtensionsForMime(mime?: string): string[] {
    switch (mime) {
      case 'image/png':
        return ['.png'];
      case 'image/jpeg':
        return ['.jpg', '.jpeg'];
      case 'image/webp':
        return ['.webp'];
      default:
        return [];
    }
  }
}

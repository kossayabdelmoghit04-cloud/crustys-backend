import { UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import path from 'path';
import { cloudinary } from '../../config/cloudinary.config';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';

export class UploadsCloudinary {
  /**
   * Téléverse un buffer d'image en streaming direct vers le CDN Cloudinary.
   * Ne crée aucun fichier temporaire sur le disque dur local.
   * 
   * @param buffer Buffer de l'image (déjà optimisé par Sharp)
   * @param folder Dossier de destination sur Cloudinary (ex: 'crustys-express/products')
   * @param filename Nom de fichier sécurisé pour le public_id
   * @returns Résultat de l'API de téléversement Cloudinary
   */
  static async uploadBuffer(
    buffer: Buffer,
    folder: string,
    filename: string
  ): Promise<UploadApiResponse> {
    const startTime = Date.now();
    const publicId = path.parse(filename).name; // Retirer l'extension car Cloudinary le gère nativement

    logger.info(`[CLOUDINARY STREAM] Début du streaming vers le dossier CDN : "${folder}/${publicId}"`);

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'image',
          format: 'webp', // Force l'extension webp dans le stockage Cloudinary
          overwrite: true,
          unique_filename: false,
        },
        (error, result) => {
          const duration = Date.now() - startTime;
          if (error) {
            logger.error(`[CLOUDINARY STREAM FAILURE] Échec du streaming après ${duration}ms :`, error);
            return reject(
              new AppError(
                `Échec de la publication vers le stockage Cloud (CDN) : ${error.message}`,
                502 // Bad Gateway (Erreur du serveur Cloudinary tiers)
              )
            );
          }

          if (!result) {
            logger.error(`[CLOUDINARY STREAM FAILURE] Réponse Cloudinary vide après ${duration}ms`);
            return reject(new AppError('Le serveur CDN a renvoyé une réponse vide.', 502));
          }

          logger.info(`[CLOUDINARY STREAM SUCCESS] Streaming réussi en ${duration}ms. URL : "${result.secure_url}"`);
          resolve(result);
        }
      );

      // Convertit le Buffer mémoire en flux lisible (Readable Stream) et l'injecte dans le flux de téléversement Cloudinary
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }
}

import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { uploadConfig } from '../config/upload.config';

// Utilisation du stockage en mémoire (Memory Storage) pour conserver les fichiers sous forme de Buffers
const storage = multer.memoryStorage();

// Configuration globale Multer
const multerInstance = multer({
  storage,
  limits: {
    // Taille maximale globale d'un fichier en octets (5 Mo)
    fileSize: uploadConfig.maxFileSize,
  },
  fileFilter: (req, file, callback) => {
    // Pré-validation sur le type MIME fourni par le client HTTP
    if (!uploadConfig.allowedMimes.includes(file.mimetype as any)) {
      logger.warn(`[UPLOAD SECURITY - REJECTED MIME] Type MIME non autorisé par Multer : ${file.mimetype} pour le fichier ${file.originalname}`);
      return callback(
        new AppError(
          `Type de fichier non autorisé. Formats acceptés : JPEG, PNG, WEBP.`,
          400
        )
      );
    }
    callback(null, true);
  },
});

/**
 * Middleware d'upload pour une image unique.
 * Encapsule les erreurs Multer pour renvoyer des réponses JSON d'erreurs claires et localisées.
 * 
 * @param fieldName Nom du champ du formulaire multipart (par défaut: 'image')
 */
export const uploadSingleImage = (fieldName: string = 'image') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const singleUploader = multerInstance.single(fieldName);

    singleUploader(req, res, (err: any) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            logger.warn(`[UPLOAD SECURITY - FILE SIZE EXCEEDED] Tentative de téléversement d'un fichier trop volumineux par l'IP ${req.ip}`);
            return next(
              new AppError(
                `Le fichier dépasse la limite de taille autorisée de ${uploadConfig.maxFileSize / (1024 * 1024)} Mo.`,
                400
              )
            );
          }
          logger.warn(`[UPLOAD ERROR] Erreur Multer lors du téléversement : ${err.message}`);
          return next(new AppError(`Erreur lors du téléversement du fichier : ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

/**
 * Middleware d'upload pour des images multiples (galerie).
 * Encapsule les erreurs de limites de nombre et de taille.
 * 
 * @param fieldName Nom du champ du formulaire multipart (par défaut: 'images')
 * @param maxCount Nombre maximum de fichiers (par défaut: 10)
 */
export const uploadMultipleImages = (
  fieldName: string = 'images',
  maxCount: number = uploadConfig.maxFilesPerRequest
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const arrayUploader = multerInstance.array(fieldName, maxCount);

    arrayUploader(req, res, (err: any) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            logger.warn(`[UPLOAD SECURITY - FILE SIZE EXCEEDED] Tentative de téléversement d'un fichier trop volumineux en upload multiple par l'IP ${req.ip}`);
            return next(
              new AppError(
                `Un ou plusieurs fichiers dépassent la taille maximale autorisée de ${uploadConfig.maxFileSize / (1024 * 1024)} Mo.`,
                400
              )
            );
          }
          if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            logger.warn(`[UPLOAD SECURITY - MAX FILES EXCEEDED] Tentative de téléversement de trop de fichiers par l'IP ${req.ip} (limite: ${maxCount})`);
            return next(
              new AppError(
                `Nombre maximum de fichiers dépassé. La galerie accepte au maximum ${maxCount} images.`,
                400
              )
            );
          }
          logger.warn(`[UPLOAD ERROR] Erreur Multer lors du téléversement multiple : ${err.message}`);
          return next(new AppError(`Erreur lors du téléversement multiple : ${err.message}`, 400));
        }
        return next(err);
      }
      next();
    });
  };
};

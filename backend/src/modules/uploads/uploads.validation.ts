import { z } from 'zod';
import { UPLOAD_CONSTANTS } from './uploads.constants';

/**
 * Validation Zod pour la requête d'upload d'une seule image
 */
export const singleUploadQuerySchema = z.object({
  body: z.object({
    prefix: z
      .string()
      .trim()
      .min(2, { message: 'Le préfixe doit contenir au moins 2 caractères' })
      .max(20, { message: 'Le préfixe ne doit pas dépasser 20 caractères' })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message: 'Le préfixe ne doit contenir que des lettres, chiffres, tirets et underscores',
      })
      .optional()
      .default(UPLOAD_CONSTANTS.PREFIXES.DEFAULT),
  }),
});

/**
 * Validation Zod pour la requête d'upload de la galerie (images multiples)
 */
export const galleryUploadQuerySchema = z.object({
  body: z.object({
    prefix: z
      .string()
      .trim()
      .min(2, { message: 'Le préfixe doit contenir au moins 2 caractères' })
      .max(20, { message: 'Le préfixe ne doit pas dépasser 20 caractères' })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        message: 'Le préfixe ne doit contenir que des lettres, chiffres, tirets et underscores',
      })
      .optional()
      .default(UPLOAD_CONSTANTS.PREFIXES.GALLERY),
  }),
});

/**
 * Validation Zod pour la structure de fichier brut (type Express.Multer.File)
 */
export const rawFileSchema = z.object({
  fieldname: z.string(),
  originalname: z.string().min(1, { message: "Le nom d'origine du fichier est requis" }),
  encoding: z.string(),
  mimetype: z.string().refine(
    (mime) => (UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES as readonly string[]).includes(mime),
    { message: `Type MIME non valide. Types autorisés : ${UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES.join(', ')}` }
  ),
  size: z.number().max(UPLOAD_CONSTANTS.MAX_FILE_SIZE, {
    message: `La taille de l'image dépasse la limite maximale autorisée de ${UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)} Mo`,
  }),
  buffer: z.any().refine((buf) => buf instanceof Buffer, {
    message: 'Le contenu du fichier (buffer) est invalide ou absent',
  }),
});

/**
 * Validation Zod pour un tableau de fichiers
 */
export const rawFilesArraySchema = z
  .array(rawFileSchema)
  .min(1, { message: 'Au moins une image est requise pour cet upload' })
  .max(UPLOAD_CONSTANTS.MAX_GALLERY_LIMIT, {
    message: `Le nombre d'images maximum autorisé est de ${UPLOAD_CONSTANTS.MAX_GALLERY_LIMIT}`,
  });

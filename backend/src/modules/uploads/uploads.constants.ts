// src/modules/uploads/uploads.constants.ts
/**
 * Compatibility layer – re‑exports the central upload configuration.
 * Existing code imports `UPLOAD_CONSTANTS` from this file, so we map the
 * values from the new `uploadConfig` defined in `src/config/upload.config.ts`.
 */
import { uploadConfig } from '../../config/upload.config';

export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: uploadConfig.maxFileSize,
  ALLOWED_MIME_TYPES: uploadConfig.allowedMimes,
  ALLOWED_EXTENSIONS: ['.jpeg', '.jpg', '.png', '.webp'] as const, // used for error messages only
  MAX_GALLERY_LIMIT: uploadConfig.maxFilesPerRequest,
  FIELD_NAMES: {
    SINGLE: 'image',
    MULTIPLE: 'images',
  },
  PREFIXES: {
    DEFAULT: uploadConfig.prefixes.upload,
    GALLERY: uploadConfig.prefixes.gallery,
    PRODUCT: uploadConfig.prefixes.product,
    CATEGORY: uploadConfig.prefixes.category,
    USER: uploadConfig.prefixes.user,
  },
} as const;

export type UploadConstants = typeof UPLOAD_CONSTANTS;

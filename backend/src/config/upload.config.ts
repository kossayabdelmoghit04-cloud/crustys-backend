// src/config/upload.config.ts
/**
 * Central configuration for the upload subsystem.
 * Avoid magic numbers throughout the codebase – all limits and settings are defined here.
 */
export const uploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5 MiB per file
  allowedMimes: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const,
  maxFilesPerRequest: 10,
  
  // Prefixes used by the secure filename generator
  prefixes: {
    product: 'product',
    gallery: 'gallery',
    category: 'category',
    user: 'user',
    upload: 'upload',
    testimonial: 'testimonial',
  },

  // Folder mapping for Cloudinary Cloud storage
  folders: {
    product: 'crustys-express/products',
    gallery: 'crustys-express/gallery',
    category: 'crustys-express/categories',
    testimonial: 'crustys-express/testimonials',
    user: 'crustys-express/users',
    upload: 'crustys-express/general',
  } as Record<string, string>,

  // Dimensions checks (Validation Rules)
  validation: {
    minWidth: 300,
    minHeight: 300,
    maxWidth: 5000,
    maxHeight: 5000,
  },

  // Sharp optimization parameters
  sharp: {
    format: 'webp' as const,
    quality: 80,
    lossless: false,
    stripMetadata: true, // Supprimer EXIF, GPS etc.
  },

  // Responsive Image Generation Dimensions (Variant specifications)
  variants: {
    thumbnail: { width: 400, height: 400, fit: 'cover' as const },
    medium: { width: 800, height: 800, fit: 'inside' as const },
    large: { width: 1200, height: 1200, fit: 'inside' as const },
    gallery: { width: 1600, height: 900, fit: 'inside' as const },
  } as const,
} as const;

export type AllowedUploadMime = typeof uploadConfig.allowedMimes[number];

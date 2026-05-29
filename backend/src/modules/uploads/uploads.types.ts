import { Request } from 'express';

/**
 * Représente les métadonnées d'une variante d'image optimisée
 */
export interface IImageVariant {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Version interne contenant le Buffer de l'image (utilisé en transit)
 */
export interface IImageVariantBuffer {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  format: string;
}

/**
 * Résultat complet retourné par le Sharp Processor
 */
export interface IProcessingResult {
  originalDimensions: { width: number; height: number };
  originalSize: number;
  optimizedSize: number;
  format: string;
  processingDuration: number;
  variantsCount: number;
  compressionRatio: number;
  variants: Record<string, IImageVariantBuffer>;
}

/**
 * Payloads d'une image téléversée avec tous ses formats responsives pour le client
 */
export interface IUploadedImage {
  originalName: string;
  original: IImageVariant;
  thumbnail: IImageVariant;
  medium: IImageVariant;
  large: IImageVariant;
  gallery: IImageVariant;
  urls: {
    original: string;
    thumbnail: string;
    medium: string;
    large: string;
    gallery: string;
  };
  dimensions: { width: number; height: number };
  size: number; // Taille de l'original optimisé
  format: string;
  processingDuration: number;
  uploadDuration: number;
  totalDuration: number;
  compressionRatio: number;
}

/**
 * Format de réponse standardisé pour l'upload d'image unique
 */
export interface ISingleUploadResponse {
  status: 'success';
  message: string;
  data: {
    file: IUploadedImage;
  };
}

/**
 * Format de réponse standardisé pour l'upload multiple (galerie)
 */
export interface IMultipleUploadResponse {
  status: 'success';
  message: string;
  data: {
    files: IUploadedImage[];
    count: number;
  };
}

/**
 * Requête Express typée avec un fichier unique fourni par Multer
 */
export interface IMulterSingleRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * Requête Express typée avec plusieurs fichiers fournis par Multer
 */
export interface IMulterMultipleRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

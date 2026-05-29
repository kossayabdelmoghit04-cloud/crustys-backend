import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

// Validation des variables d'environnement obligatoires pour Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  logger.error(
    '[CLOUDINARY CONFIG ERROR] Les variables d\'environnement CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET doivent être définies.'
  );
}

// Configuration globale de l'instance Cloudinary
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true, // Toujours utiliser le protocole HTTPS sécurisé
});

logger.info('[CLOUDINARY CONFIG] SDK configuré avec succès.');

export { cloudinary };

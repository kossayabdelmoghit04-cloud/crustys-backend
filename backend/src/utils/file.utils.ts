import crypto from 'crypto';
import path from 'path';

/**
 * Interface pour le résultat de la validation de signature d'image
 */
export interface ImageSignatureCheck {
  isValid: boolean;
  mime?: string;
  ext?: string;
}

/**
 * Génère un nom de fichier sécurisé et unique basé sur le format : prefix-uuid-timestamp.webp
 * Empêche les collisions, les injections de noms dangereux et le path traversal.
 * 
 * @param prefix Le préfixe de la ressource (ex: 'product', 'gallery', 'category', 'user')
 * @returns Un nom de fichier nettoyé et sécurisé se terminant par .webp
 */
export const generateSecureFilename = (prefix: string): string => {
  // Assainir le préfixe pour éviter toute injection ou path traversal
  const sanitizedPrefix = prefix
    .replace(/[^a-zA-Z0-9_-]/g, '') // Ne garder que l'alpha-numérique, tirets et underscores
    .replace(/\.\./g, '') // Empêcher spécifiquement le path traversal
    .toLowerCase();

  const uuid = crypto.randomUUID();
  const timestamp = Date.now();

  return `${sanitizedPrefix}-${uuid}-${timestamp}.webp`;
};

/**
 * Valide les magic numbers (signatures binaires) d'un buffer pour s'assurer que c'est une vraie image.
 * Protège contre les fausses extensions (ex: un script PHP renommé en .png).
 * 
 * Supporte : JPEG (JPG), PNG, WEBP
 * 
 * @param buffer Le buffer du fichier téléversé
 * @returns Un objet indiquant si le fichier est valide, son mime type et son extension correspondante
 */
export const validateImageSignature = (buffer: Buffer): ImageSignatureCheck => {
  if (!buffer || buffer.length < 12) {
    return { isValid: false };
  }

  // Signature PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, mime: 'image/png', ext: 'png' };
  }

  // Signature JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // Signature WebP: RIFF (octets 0-3) et WEBP (octets 8-11)
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50    // P
  ) {
    return { isValid: true, mime: 'image/webp', ext: 'webp' };
  }

  return { isValid: false };
};

/**
 * Assainit un nom de fichier d'origine et extrait son extension de manière sécurisée.
 * Protège contre le path traversal et les injections de caractères.
 * 
 * @param filename Nom de fichier d'origine
 * @returns Extension nettoyée en minuscules
 */
export const getCleanExtension = (filename: string): string => {
  // Supprime tout caractère de répertoire pour éviter le path traversal
  const baseName = path.basename(filename);
  const ext = path.extname(baseName).toLowerCase();
  return ext;
};

/**
 * Détecte les tentatives d'attaque par double extension (ex: image.jpg.exe, payload.png.php).
 * Un fichier sain ne doit avoir qu'un seul point délimitant son extension.
 * 
 * @param filename Le nom du fichier d'origine
 * @returns true si une double extension suspecte est présente, false sinon
 */
export const hasSuspiciousDoubleExtension = (filename: string): boolean => {
  const baseName = path.basename(filename);
  const dotsCount = (baseName.match(/\./g) || []).length;
  
  if (dotsCount > 1) {
    // Si plusieurs points sont présents, on vérifie si l'une des extensions intermédiaires ou finale est suspecte
    const parts = baseName.split('.');
    const dangerousExtensions = ['php', 'php3', 'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp', 'exe', 'sh', 'js', 'py', 'pl', 'rb', 'cgi', 'htaccess'];
    
    // Si l'une des extensions dans le nom de fichier est dans la liste rouge, c'est suspect
    return parts.some(part => dangerousExtensions.includes(part.toLowerCase()));
  }
  
  return false;
};

/**
 * Assainit complètement le nom de fichier d'origine pour enlever tout caractère dangereux,
 * accentué, ou espace, afin de prévenir les injections et les bugs d'affichage URL.
 * 
 * @param filename Nom de fichier d'origine
 * @returns Nom de fichier assaini
 */
export const sanitizeOriginalFilename = (filename: string): string => {
  const baseName = path.basename(filename);
  const parsed = path.parse(baseName);
  
  // Assainit le nom sans l'extension
  const cleanName = parsed.name
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-') // Remplace tout caractère non-alphanumérique par des tirets
    .replace(/-+/g, '-') // Évite les tirets consécutifs
    .replace(/^-|-$/g, ''); // Supprime les tirets aux extrémités
    
  return `${cleanName}${parsed.ext.toLowerCase()}`;
};

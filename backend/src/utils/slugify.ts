/**
 * Génère un slug SEO propre à partir d'une chaîne de caractères.
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Supprime les accents
    .replace(/[\u0300-\u036f]/g, '') // Enlève les marques diacritiques
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/[^\w\-]+/g, '') // Supprime les caractères spéciaux
    .replace(/\-\-+/g, '-') // Évite les doubles tirets
    .replace(/^-+/, '') // Enlève les tirets de début
    .replace(/-+$/, ''); // Enlève les tirets de fin
};

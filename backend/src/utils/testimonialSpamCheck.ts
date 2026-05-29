import { prisma } from './prisma';
import { AppError } from './appError';
import { logger } from './logger';

/**
 * Logique anti-spam professionnelle pour les témoignages
 * Empêche le spam de symboles, les messages dupliqués et les soumissions ultra-rapides d'un même utilisateur
 */
export async function detectTestimonialSpam(customerName: string, message: string): Promise<void> {
  const normalizedName = customerName.trim().replace(/\s+/g, ' ');
  const normalizedMessage = message.trim().replace(/\s+/g, ' ');

  // 1. Validation de la longueur après normalisation
  if (normalizedMessage.length < 10) {
    logger.warn(`[SPAM DETECTED] Tentative de soumission d'un message trop court par "${normalizedName}"`);
    throw new AppError('Le témoignage est trop court ou vide après nettoyage.', 400);
  }

  // 2. Détection de messages constitués uniquement de symboles ou caractères répétitifs (gibberish/spam)
  // Exige qu'au moins 40% des caractères soient alphanumériques (lettres/chiffres standards)
  const alphanumericCount = (normalizedMessage.match(/[a-zA-Z0-9À-ÿ]/g) || []).length;
  const totalLength = normalizedMessage.length;
  const alphanumericRatio = alphanumericCount / totalLength;

  if (alphanumericRatio < 0.40) {
    logger.warn(
      `[SPAM DETECTED] Tentative de spam par symboles détectée pour "${normalizedName}". Ratio alphanumérique : ${(
        alphanumericRatio * 100
      ).toFixed(1)}%`
    );
    throw new AppError('Le message contient un ratio excessif de symboles ou de caractères spéciaux.', 400);
  }

  // 3. Détection de doublons exacts de messages déjà présents dans la base de données
  const duplicateMessage = await prisma.testimonial.findFirst({
    where: { message: normalizedMessage },
  });

  if (duplicateMessage) {
    logger.warn(`[SPAM DETECTED] Message dupliqué rejeté pour "${normalizedName}"`);
    throw new AppError('Ce témoignage exact a déjà été soumis et enregistré.', 400);
  }

  // 4. Détection de soumissions trop rapprochées (Throttling / Spam rapide au niveau applicatif)
  // Bloque les soumissions consécutives du même nom d'utilisateur dans un intervalle de 2 minutes
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const recentSubmission = await prisma.testimonial.findFirst({
    where: {
      customerName: { equals: normalizedName, mode: 'insensitive' },
      createdAt: { gte: twoMinutesAgo },
    },
  });

  if (recentSubmission) {
    logger.warn(
      `[SPAM DETECTED] Soumissions trop rapprochées de la part de "${normalizedName}" (bloqué par règle des 2 min)`
    );
    throw new AppError(
      'Vous avez soumis un témoignage très récemment. Veuillez patienter 2 minutes avant de soumettre à nouveau.',
      429
    );
  }
}

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * IP REPUTATION SERVICE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Système de score de réputation par IP.
 * Chaque infraction augmente le score négatif.
 * Au-delà du seuil, l'IP est considérée hostile.
 */

import { securityConfig } from '../config/security.config';
import { logger } from '../utils/logger';

interface ReputationEntry {
  score: number;
  infractions: string[];
  lastSeen: number;
  firstSeen: number;
}

const reputationStore = new Map<string, ReputationEntry>();

export class IPReputationService {
  /**
   * Ajoute des points négatifs au score de réputation d'une IP.
   */
  static addInfraction(ip: string, points: number, reason: string): number {
    const now = Date.now();
    let entry = reputationStore.get(ip);

    if (!entry) {
      entry = { score: 0, infractions: [], lastSeen: now, firstSeen: now };
      reputationStore.set(ip, entry);
    }

    entry.score += points;
    entry.lastSeen = now;
    entry.infractions.push(`[${new Date(now).toISOString()}] +${points} — ${reason}`);

    // Limiter l'historique à 50 infractions
    if (entry.infractions.length > 50) {
      entry.infractions = entry.infractions.slice(-50);
    }

    return entry.score;
  }

  /**
   * Retourne le score de réputation actuel d'une IP.
   */
  static getScore(ip: string): number {
    return reputationStore.get(ip)?.score || 0;
  }

  /**
   * Vérifie si une IP est considérée hostile.
   */
  static isHostile(ip: string): boolean {
    return this.getScore(ip) >= securityConfig.suspiciousRequest.autobanScore;
  }

  /**
   * Vérifie si une IP doit déclencher un warning.
   */
  static isWarning(ip: string): boolean {
    const score = this.getScore(ip);
    return score >= securityConfig.suspiciousRequest.warnThreshold && score < securityConfig.suspiciousRequest.autobanScore;
  }

  /**
   * Retourne l'entrée de réputation complète.
   */
  static getReputation(ip: string): ReputationEntry | null {
    return reputationStore.get(ip) || null;
  }

  /**
   * Réinitialise la réputation d'une IP (admin action).
   */
  static resetReputation(ip: string): void {
    reputationStore.delete(ip);
    logger.info(`[IP REPUTATION] Réputation réinitialisée pour IP ${ip}`);
  }

  /**
   * Nettoie les entrées de réputation inactives depuis plus de 24h.
   */
  static cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    let cleaned = 0;

    reputationStore.forEach((entry, ip) => {
      if (now - entry.lastSeen > maxAge && entry.score < securityConfig.suspiciousRequest.warnThreshold) {
        reputationStore.delete(ip);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(`[IP REPUTATION] Nettoyage : ${cleaned} entrées inactives supprimées.`);
    }
  }
}

// Nettoyage automatique toutes les 30 minutes
const cleanupInterval = setInterval(() => IPReputationService.cleanup(), 30 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

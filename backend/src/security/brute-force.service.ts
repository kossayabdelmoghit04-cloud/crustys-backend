/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BRUTE FORCE SERVICE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Détection, escalade et gestion des attaques
 * par force brute avec cooldowns progressifs.
 */

import { securityConfig } from '../config/security.config';
import { SecurityAuditLogger } from '../logs/security.audit';
import { securityMetrics } from '../metrics/security.metrics';
import * as Sentry from '@sentry/node';
import { recordSentryErrorTimestamp } from '../config/sentry';
import { logger } from '../utils/logger';

interface BruteForceEntry {
  failedAttempts: number;
  firstAttemptAt: number;
  bannedUntil: number | null;
  banCount: number; // Nombre de bans précédents (pour l'escalade)
}

const ipStore = new Map<string, BruteForceEntry>();

export class BruteForceService {
  /**
   * Enregistre un échec d'authentification pour une IP donnée.
   */
  static recordFailure(ip: string, route: string): void {
    const now = Date.now();
    const config = securityConfig.bruteForce;
    let entry = ipStore.get(ip);

    if (!entry) {
      entry = { failedAttempts: 0, firstAttemptAt: now, bannedUntil: null, banCount: 0 };
      ipStore.set(ip, entry);
    }

    // Réinitialiser si la fenêtre a expiré
    if (now - entry.firstAttemptAt > config.windowMs) {
      entry.failedAttempts = 0;
      entry.firstAttemptAt = now;
    }

    entry.failedAttempts++;
    securityMetrics.increment('bruteForce');
    securityMetrics.trackIP(ip);

    logger.warn(`[BRUTE FORCE] Échec #${entry.failedAttempts} pour IP ${ip} sur ${route}`);

    if (entry.failedAttempts === 3) {
      const sentryEventId = Sentry.captureMessage(
        `[Brute Force] Tentatives d'authentification multiples (${entry.failedAttempts} échecs) pour l'IP ${ip} sur la route ${route}`,
        'warning'
      );
      
      try {
        const { AuditService } = require('../modules/audit/audit.service');
        AuditService.create({
          action: 'SECURITY_ALERT',
          ipAddress: ip,
          entity: 'Security',
          entityId: route,
          newValue: { reason: 'Multiple Authentication Failures', failedAttempts: entry.failedAttempts },
          sentryEventId,
        }).catch(() => {});
      } catch (e) {}

      try {
        const { AdminNotificationService } = require('../modules/admin-notifications/admin-notification.service');
        AdminNotificationService.createNotification({
          title: "Sécurité : Tentatives d'authentification multiples échouées",
          message: `3 tentatives infructueuses de connexion pour l'adresse IP ${ip} sur la route ${route}`,
          type: "SECURITY_ALERT",
          metadata: { ip, route, failedAttempts: entry.failedAttempts, sentryEventId }
        }).catch(() => {});
      } catch (err) {}
    }

    // Seuil de ban atteint
    if (entry.failedAttempts >= config.maxFailedAttempts) {
      const banDuration = Math.min(
        config.banDurationMs * Math.pow(config.escalationFactor, entry.banCount),
        config.maxBanDurationMs
      );

      entry.bannedUntil = now + banDuration;
      entry.banCount++;
      entry.failedAttempts = 0;

      const banMinutes = Math.round(banDuration / 60000);

      SecurityAuditLogger.log({
        eventType: 'IP_BANNED',
        severity: 'HIGH',
        ipAddress: ip,
        route,
        message: `IP bannie pour ${banMinutes} minutes après ${config.maxFailedAttempts} échecs (ban #${entry.banCount}).`,
        metadata: { banDuration, banCount: entry.banCount },
      });

      const sentryEventId = Sentry.captureMessage(
        `[Auto Ban] Adresse IP ${ip} bannie temporairement pour ${banMinutes} minutes après trop d'échecs de connexion sur la route ${route}`,
        'error'
      );

      try {
        const { AuditService } = require('../modules/audit/audit.service');
        AuditService.create({
          action: 'SECURITY_ALERT',
          ipAddress: ip,
          entity: 'Security',
          entityId: route,
          newValue: { reason: 'IP Temporarily Banned', banDuration, banCount: entry.banCount },
          sentryEventId,
        }).catch(() => {});
      } catch (e) {}

      try {
        const { AdminNotificationService } = require('../modules/admin-notifications/admin-notification.service');
        AdminNotificationService.createNotification({
          title: "Sécurité : Adresse IP Bloquée",
          message: `L'adresse IP ${ip} a été temporairement bloquée (bannie pour ${banMinutes} minutes) après trop d'échecs`,
          type: "SECURITY_ALERT",
          metadata: { ip, route, banDuration, banCount: entry.banCount, sentryEventId }
        }).catch(() => {});
      } catch (err) {}

      securityMetrics.increment('blocked');
    }
  }

  /**
   * Enregistre un succès d'authentification (réinitialise le compteur d'échecs).
   */
  static recordSuccess(ip: string): void {
    const entry = ipStore.get(ip);
    if (entry) {
      entry.failedAttempts = 0;
      // On ne réinitialise PAS banCount pour garder l'historique d'escalade
    }
  }

  /**
   * Vérifie si une IP est actuellement bannie.
   */
  static isBanned(ip: string): { banned: boolean; remainingMs: number } {
    const entry = ipStore.get(ip);
    if (!entry || !entry.bannedUntil) {
      return { banned: false, remainingMs: 0 };
    }

    const now = Date.now();
    if (now >= entry.bannedUntil) {
      // Ban expiré
      entry.bannedUntil = null;

      SecurityAuditLogger.log({
        eventType: 'IP_UNBANNED',
        severity: 'LOW',
        ipAddress: ip,
        message: `Ban expiré pour IP ${ip} (ban #${entry.banCount}).`,
      });

      return { banned: false, remainingMs: 0 };
    }

    return { banned: true, remainingMs: entry.bannedUntil - now };
  }

  /**
   * Retourne les statistiques de brute-force pour une IP.
   */
  static getIPStats(ip: string): BruteForceEntry | null {
    return ipStore.get(ip) || null;
  }

  /**
   * Nettoie les entrées expirées du store (appelé périodiquement).
   */
  static cleanup(): void {
    const now = Date.now();
    const config = securityConfig.bruteForce;
    let cleaned = 0;

    ipStore.forEach((entry, ip) => {
      const isExpired = now - entry.firstAttemptAt > config.windowMs;
      const isBanExpired = !entry.bannedUntil || now >= entry.bannedUntil;

      if (isExpired && isBanExpired && entry.banCount === 0) {
        ipStore.delete(ip);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.info(`[BRUTE FORCE] Nettoyage : ${cleaned} entrées expirées supprimées.`);
    }
  }
}

// Nettoyage automatique toutes les 10 minutes
const cleanupInterval = setInterval(() => BruteForceService.cleanup(), 10 * 60 * 1000);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

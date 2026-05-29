/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SECURITY METRICS TRACKER — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { logger } from '../utils/logger';

export interface SecurityMetricsReport {
  blockedRequests: number;
  suspiciousRequests: number;
  bruteForceAttempts: number;
  rateLimitTriggers: number;
  tokenFailures: number;
  scannersDetected: number;
  botsDetected: number;
  honeypotTriggers: number;
  topAbusiveIPs: Array<{ ip: string; count: number }>;
  attacksByCategory: Record<string, number>;
}

/**
 * Tracker de métriques sécurité en mémoire.
 * En production, remplacer par Redis pour la scalabilité multi-instance.
 */
class SecurityMetricsStore {
  private blocked = 0;
  private suspicious = 0;
  private bruteForce = 0;
  private rateLimits = 0;
  private tokenFails = 0;
  private scanners = 0;
  private bots = 0;
  private honeypots = 0;
  private ipCounts = new Map<string, number>();
  private attackCategories = new Map<string, number>();

  increment(metric: 'blocked' | 'suspicious' | 'bruteForce' | 'rateLimits' | 'tokenFails' | 'scanners' | 'bots' | 'honeypots'): void {
    this[metric]++;
  }

  trackIP(ip: string): void {
    this.ipCounts.set(ip, (this.ipCounts.get(ip) || 0) + 1);
  }

  trackAttackCategory(category: string): void {
    this.attackCategories.set(category, (this.attackCategories.get(category) || 0) + 1);
  }

  getReport(): SecurityMetricsReport {
    // Top 10 IPs abusives triées par nombre d'infractions
    const topIPs = Array.from(this.ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const categories: Record<string, number> = {};
    this.attackCategories.forEach((count, cat) => {
      categories[cat] = count;
    });

    return {
      blockedRequests: this.blocked,
      suspiciousRequests: this.suspicious,
      bruteForceAttempts: this.bruteForce,
      rateLimitTriggers: this.rateLimits,
      tokenFailures: this.tokenFails,
      scannersDetected: this.scanners,
      botsDetected: this.bots,
      honeypotTriggers: this.honeypots,
      topAbusiveIPs: topIPs,
      attacksByCategory: categories,
    };
  }

  /**
   * Réinitialise les compteurs (utile pour les rotations de métriques).
   */
  reset(): void {
    this.blocked = 0;
    this.suspicious = 0;
    this.bruteForce = 0;
    this.rateLimits = 0;
    this.tokenFails = 0;
    this.scanners = 0;
    this.bots = 0;
    this.honeypots = 0;
    this.ipCounts.clear();
    this.attackCategories.clear();
    logger.info('[SECURITY METRICS] Compteurs réinitialisés.');
  }
}

export const securityMetrics = new SecurityMetricsStore();

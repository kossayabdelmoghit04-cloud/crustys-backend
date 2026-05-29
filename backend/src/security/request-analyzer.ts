/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * REQUEST ANALYZER ENGINE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Moteur d'analyse heuristique des requêtes HTTP.
 * Scanne l'URL, le body, les headers et les query params
 * à travers la base de signatures d'attaques.
 */

import { ALL_ATTACK_PATTERNS, AttackPattern, AttackCategory, AttackSeverity } from './attack-patterns';

export interface AnalysisResult {
  isSuspicious: boolean;
  totalScore: number;
  matchedPatterns: Array<{
    id: string;
    category: AttackCategory;
    severity: AttackSeverity;
    description: string;
    score: number;
    matchedValue: string;
  }>;
  highestSeverity: AttackSeverity;
}

export class RequestAnalyzer {
  /**
   * Analyse une chaîne de caractères contre toute la base de signatures d'attaques.
   */
  static analyzeString(input: string): AnalysisResult {
    const matchedPatterns: AnalysisResult['matchedPatterns'] = [];
    let totalScore = 0;
    let highestSeverity: AttackSeverity = 'LOW';

    const severityOrder: Record<AttackSeverity, number> = {
      LOW: 0,
      MEDIUM: 1,
      HIGH: 2,
      CRITICAL: 3,
    };

    for (const pattern of ALL_ATTACK_PATTERNS) {
      const match = pattern.pattern.exec(input);
      if (match) {
        totalScore += pattern.score;
        matchedPatterns.push({
          id: pattern.id,
          category: pattern.category,
          severity: pattern.severity,
          description: pattern.description,
          score: pattern.score,
          matchedValue: match[0].substring(0, 100), // Tronquer pour les logs
        });

        if (severityOrder[pattern.severity] > severityOrder[highestSeverity]) {
          highestSeverity = pattern.severity;
        }
      }
    }

    return {
      isSuspicious: totalScore > 0,
      totalScore,
      matchedPatterns,
      highestSeverity,
    };
  }

  /**
   * Analyse complète d'une requête HTTP (URL + body + query + headers).
   */
  static analyzeRequest(components: {
    url: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, string | string[] | undefined>;
  }): AnalysisResult {
    const stringsToAnalyze: string[] = [];

    // URL complète
    stringsToAnalyze.push(decodeURIComponent(components.url));

    // Query parameters
    if (components.query) {
      for (const value of Object.values(components.query)) {
        if (typeof value === 'string') {
          stringsToAnalyze.push(value);
        }
      }
    }

    // Body (premier niveau uniquement pour la performance)
    if (components.body) {
      for (const value of Object.values(components.body)) {
        if (typeof value === 'string') {
          stringsToAnalyze.push(value);
        }
      }
    }

    // Headers sensibles
    if (components.headers) {
      const sensitiveHeaders = ['referer', 'x-forwarded-for', 'x-custom-header'];
      for (const header of sensitiveHeaders) {
        const val = components.headers[header];
        if (typeof val === 'string') {
          stringsToAnalyze.push(val);
        }
      }
    }

    // Concaténation et analyse unique
    const combined = stringsToAnalyze.join(' ');
    return this.analyzeString(combined);
  }
}

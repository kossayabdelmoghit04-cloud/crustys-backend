/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SUSPICIOUS REQUEST DETECTOR — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Orchestrateur central : combine l'analyse heuristique,
 * la détection de scanners, les user-agents suspects,
 * et le scoring de réputation IP.
 */

import { SCANNER_USER_AGENTS, BOT_INDICATORS } from './attack-patterns';
import { RequestAnalyzer, AnalysisResult } from './request-analyzer';
import { IPReputationService } from './ip-reputation.service';
import { securityConfig } from '../config/security.config';

export interface DetectionVerdict {
  shouldBlock: boolean;
  shouldWarn: boolean;
  isScanner: boolean;
  isBot: boolean;
  isHoneypot: boolean;
  analysis: AnalysisResult;
  reputationScore: number;
  totalThreatScore: number;
}

export class SuspiciousRequestDetector {
  /**
   * Analyse complète d'une requête et produit un verdict.
   */
  static evaluate(params: {
    ip: string;
    userAgent: string;
    url: string;
    method: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, string | string[] | undefined>;
  }): DetectionVerdict {
    const { ip, userAgent, url, body, query, headers } = params;

    // 1. Analyse heuristique du contenu
    const analysis = RequestAnalyzer.analyzeRequest({ url, body, query, headers });

    // 2. Détection de scanner
    const isScanner = SCANNER_USER_AGENTS.some((re) => re.test(userAgent));

    // 3. Détection de bot
    const isBot = BOT_INDICATORS.some((re) => re.test(userAgent));

    // 4. Détection de honeypot
    const normalizedUrl = url.split('?')[0].toLowerCase();
    const isHoneypot = securityConfig.honeypotPaths.some((hp) => normalizedUrl.includes(hp));

    // 5. Score de réputation IP
    const reputationScore = IPReputationService.getScore(ip);

    // 6. Calcul du score de menace total
    let totalThreatScore = analysis.totalScore;
    if (isScanner) totalThreatScore += 50;
    if (isBot) totalThreatScore += 10;
    if (isHoneypot) totalThreatScore += 60;
    totalThreatScore += Math.min(reputationScore, 30); // Plafond de contribution du score IP

    // 7. Mise à jour de la réputation si des patterns sont détectés
    if (analysis.totalScore > 0) {
      IPReputationService.addInfraction(ip, analysis.totalScore, `Pattern match: ${analysis.matchedPatterns.map((p) => p.id).join(', ')}`);
    }
    if (isScanner) {
      IPReputationService.addInfraction(ip, 50, 'Scanner detected');
    }
    if (isHoneypot) {
      IPReputationService.addInfraction(ip, 60, `Honeypot triggered: ${normalizedUrl}`);
    }

    // 8. Verdict
    const config = securityConfig.suspiciousRequest;
    const shouldBlock = totalThreatScore >= config.scoreThreshold || isScanner || isHoneypot || IPReputationService.isHostile(ip);
    const shouldWarn = !shouldBlock && totalThreatScore >= config.warnThreshold;

    return {
      shouldBlock,
      shouldWarn,
      isScanner,
      isBot,
      isHoneypot,
      analysis,
      reputationScore,
      totalThreatScore,
    };
  }
}

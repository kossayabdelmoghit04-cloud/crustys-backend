/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SECURITY AUDIT LOGGING — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { AttackCategory, AttackSeverity } from '../security/attack-patterns';

export type SecurityEventType =
  | 'BRUTE_FORCE_DETECTED'
  | 'IP_BANNED'
  | 'IP_UNBANNED'
  | 'SUSPICIOUS_REQUEST'
  | 'ATTACK_DETECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SCANNER_DETECTED'
  | 'BOT_DETECTED'
  | 'HONEYPOT_TRIGGERED'
  | 'BLOCKED_REQUEST'
  | 'TOKEN_FAILURE'
  | 'REQUEST_FINGERPRINT_ANOMALY';

export interface SecurityAuditPayload {
  eventId: string;
  timestamp: string;
  eventType: SecurityEventType;
  severity: AttackSeverity;
  ipAddress: string;
  userAgent?: string;
  route?: string;
  method?: string;
  attackCategory?: AttackCategory;
  patternId?: string;
  score?: number;
  fingerprint?: string;
  geoLocation?: {
    country: string;
    city: string;
  };
  userId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_LOG_PATH = path.join(process.cwd(), 'src/artifacts/logs/security-audit.log');

export class SecurityAuditLogger {
  /**
   * Enregistre un événement de sécurité structuré.
   */
  static log(event: Omit<SecurityAuditPayload, 'eventId' | 'timestamp'>): void {
    const fullEvent: SecurityAuditPayload = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    const serialized = JSON.stringify(fullEvent);

    // Log console structuré pour ingestion ELK/Datadog/CloudWatch
    if (fullEvent.severity === 'CRITICAL' || fullEvent.severity === 'HIGH') {
      logger.error(`[SECURITY AUDIT] ${serialized}`);
    } else if (fullEvent.severity === 'MEDIUM') {
      logger.warn(`[SECURITY AUDIT] ${serialized}`);
    } else {
      logger.info(`[SECURITY AUDIT] ${serialized}`);
    }

    // Écriture persistante locale
    try {
      const dir = path.dirname(AUDIT_LOG_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(AUDIT_LOG_PATH, serialized + '\n', 'utf8');
    } catch (err) {
      logger.error('[SECURITY AUDIT WRITER] Échec écriture fichier audit sécurité :', err);
    }
  }
}

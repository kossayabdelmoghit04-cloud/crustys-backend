/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SUSPICIOUS REQUEST MIDDLEWARE — Crusty's Express
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Intercepte chaque requête, exécute le moteur de détection
 * heuristique et bloque/alerte en fonction du verdict.
 */

import { Request, Response, NextFunction } from 'express';
import { SuspiciousRequestDetector } from '../security/suspicious-request.detector';
import { SecurityAuditLogger } from '../logs/security.audit';
import { securityMetrics } from '../metrics/security.metrics';
import * as Sentry from '@sentry/node';
import { recordSentryErrorTimestamp } from '../config/sentry';
import { logger } from '../utils/logger';

export const suspiciousRequestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || '';
  const url = req.originalUrl || req.url;

  const verdict = SuspiciousRequestDetector.evaluate({
    ip,
    userAgent,
    url,
    method: req.method,
    body: req.body as Record<string, unknown> | undefined,
    query: req.query as Record<string, unknown> | undefined,
    headers: req.headers as Record<string, string | string[] | undefined>,
  });

  // ── Honeypot triggered ──
  if (verdict.isHoneypot) {
    securityMetrics.increment('honeypots');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'HONEYPOT_TRIGGERED',
      severity: 'HIGH',
      ipAddress: ip,
      userAgent,
      route: url,
      method: req.method,
      fingerprint: req.fingerprint,
      geoLocation: req.geoLocation ? { country: req.geoLocation.country, city: req.geoLocation.city } : undefined,
      message: `Accès honeypot détecté : ${url}`,
      score: verdict.totalThreatScore,
    });

    const sentryEventId = Sentry.captureMessage(
      `[Honeypot Triggered] Accès suspect à la route honeypot : ${url} depuis l'IP ${ip}`,
      'error'
    );

    // Save to ActivityLog (Audit Logs)
    try {
      const { AuditService } = require('../modules/audit/audit.service');
      AuditService.create({
        action: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent,
        entity: 'Security',
        entityId: url,
        newValue: { reason: 'Honeypot Triggered', threatScore: verdict.totalThreatScore },
        sentryEventId,
      }).catch((auditErr: any) => {
        logger.error(`[Security Middleware] Failed to write audit log: ${auditErr.message}`);
      });
    } catch (auditImportErr) {}

    try {
      const { AdminNotificationService } = require('../modules/admin-notifications/admin-notification.service');
      AdminNotificationService.createNotification({
        title: "Sécurité : Accès Honeypot",
        message: `Accès suspect à la route honeypot : ${url} depuis l'IP ${ip}`,
        type: "SECURITY_ALERT",
        metadata: { ip, url, userAgent, sentryEventId }
      }).catch(() => {});
    } catch (err) {}

    res.status(403).json({
      status: 'error',
      message: 'Access denied.',
      code: 'FORBIDDEN',
    });
    return;
  }

  // ── Scanner detected ──
  if (verdict.isScanner) {
    securityMetrics.increment('scanners');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'SCANNER_DETECTED',
      severity: 'HIGH',
      ipAddress: ip,
      userAgent,
      route: url,
      method: req.method,
      fingerprint: req.fingerprint,
      message: `Scanner de vulnérabilités détecté via User-Agent : "${userAgent.substring(0, 80)}"`,
      score: verdict.totalThreatScore,
    });

    const sentryEventId = Sentry.captureMessage(
      `[Scanner Detected] Scanner de vulnérabilités détecté depuis l'IP ${ip} via l'User-Agent : "${userAgent.substring(0, 80)}"`,
      'warning'
    );

    // Save to ActivityLog (Audit Logs)
    try {
      const { AuditService } = require('../modules/audit/audit.service');
      AuditService.create({
        action: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent,
        entity: 'Security',
        entityId: url,
        newValue: { reason: 'Scanner Detected', threatScore: verdict.totalThreatScore },
        sentryEventId,
      }).catch((auditErr: any) => {
        logger.error(`[Security Middleware] Failed to write audit log: ${auditErr.message}`);
      });
    } catch (auditImportErr) {}

    try {
      const { AdminNotificationService } = require('../modules/admin-notifications/admin-notification.service');
      AdminNotificationService.createNotification({
        title: "Sécurité : Scanner de vulnérabilités",
        message: `Scanner détecté depuis l'IP ${ip} via l'User-Agent : "${userAgent.substring(0, 80)}"`,
        type: "SECURITY_ALERT",
        metadata: { ip, url, userAgent, sentryEventId }
      }).catch(() => {});
    } catch (err) {}

    res.status(403).json({
      status: 'error',
      message: 'Access denied.',
      code: 'FORBIDDEN',
    });
    return;
  }

  // ── Attack patterns matched — BLOCK ──
  if (verdict.shouldBlock) {
    securityMetrics.increment('blocked');
    securityMetrics.trackIP(ip);

    const categories = verdict.analysis.matchedPatterns.map((p) => p.category);
    categories.forEach((cat) => securityMetrics.trackAttackCategory(cat));

    SecurityAuditLogger.log({
      eventType: 'ATTACK_DETECTED',
      severity: verdict.analysis.highestSeverity,
      ipAddress: ip,
      userAgent,
      route: url,
      method: req.method,
      fingerprint: req.fingerprint,
      geoLocation: req.geoLocation ? { country: req.geoLocation.country, city: req.geoLocation.city } : undefined,
      message: `Requête bloquée — Score: ${verdict.totalThreatScore}. Patterns: ${verdict.analysis.matchedPatterns.map((p) => p.id).join(', ')}`,
      score: verdict.totalThreatScore,
      metadata: {
        matchedPatterns: verdict.analysis.matchedPatterns.map((p) => ({
          id: p.id,
          category: p.category,
          description: p.description,
        })),
      },
    });

    const isSqlInjection = categories.includes('sql-injection') || verdict.analysis.matchedPatterns.some(p => p.id.includes('sql'));
    const isXss = categories.includes('xss') || verdict.analysis.matchedPatterns.some(p => p.id.includes('xss'));
    const threatName = isSqlInjection ? 'SQL Injection' : isXss ? 'XSS Attempt' : 'Suspicious Request';

    const sentryEventId = Sentry.captureMessage(
      `[Security Alert] Attaque bloquée (${threatName}) de l'IP ${ip} sur ${url} (score de menace: ${verdict.totalThreatScore})`,
      'error'
    );

    // Save to ActivityLog (Audit Logs)
    try {
      const { AuditService } = require('../modules/audit/audit.service');
      AuditService.create({
        action: 'SECURITY_ALERT',
        ipAddress: ip,
        userAgent,
        entity: 'Security',
        entityId: url,
        newValue: {
          reason: 'Attack Blocked',
          threatName,
          threatScore: verdict.totalThreatScore,
          patterns: verdict.analysis.matchedPatterns.map((p: any) => p.id),
        },
        sentryEventId,
      }).catch((auditErr: any) => {
        logger.error(`[Security Middleware] Failed to write audit log: ${auditErr.message}`);
      });
    } catch (auditImportErr) {}

    try {
      const { AdminNotificationService } = require('../modules/admin-notifications/admin-notification.service');
      AdminNotificationService.createNotification({
        title: "Sécurité : Attaque bloquée",
        message: `Requête bloquée de l'IP ${ip} sur ${url} (score de menace: ${verdict.totalThreatScore})`,
        type: "SECURITY_ALERT",
        metadata: {
          ip,
          url,
          score: verdict.totalThreatScore,
          patterns: verdict.analysis.matchedPatterns.map((p: any) => p.id),
          sentryEventId
        }
      }).catch(() => {});
    } catch (err) {}

    res.status(403).json({
      status: 'error',
      message: 'Request blocked due to suspicious content.',
      code: 'SUSPICIOUS_REQUEST_BLOCKED',
    });
    return;
  }

  // ── Warn level — log but allow ──
  if (verdict.shouldWarn) {
    securityMetrics.increment('suspicious');
    securityMetrics.trackIP(ip);

    SecurityAuditLogger.log({
      eventType: 'SUSPICIOUS_REQUEST',
      severity: 'MEDIUM',
      ipAddress: ip,
      userAgent,
      route: url,
      method: req.method,
      fingerprint: req.fingerprint,
      message: `Requête suspecte autorisée — Score: ${verdict.totalThreatScore}`,
      score: verdict.totalThreatScore,
    });
  }

  // ── Bot detected — log only ──
  if (verdict.isBot) {
    securityMetrics.increment('bots');

    SecurityAuditLogger.log({
      eventType: 'BOT_DETECTED',
      severity: 'LOW',
      ipAddress: ip,
      userAgent,
      route: url,
      method: req.method,
      message: `Bot potentiel détecté via User-Agent : "${userAgent.substring(0, 80)}"`,
    });
  }

  next();
};

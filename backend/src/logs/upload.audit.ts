import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface IAuditPayload {
  eventId: string;
  timestamp: string;
  action:
    | 'UPLOAD_STARTED'
    | 'UPLOAD_QUEUED'
    | 'WORKER_STARTED'
    | 'PROCESSING_COMPLETED'
    | 'CLOUD_UPLOAD_COMPLETED'
    | 'RETRY_ATTEMPT'
    | 'FAILED_UPLOAD'
    | 'CLEANUP_COMPLETED'
    | 'SUSPICIOUS_ACTIVITY';
  tracingId?: string;
  ipAddress?: string;
  fileName?: string;
  prefix?: string;
  fileSize?: number;
  durationMs?: number;
  attempts?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export class UploadAuditLogger {
  private static auditLogPath = path.join(process.cwd(), 'src/artifacts/logs/upload-audit.log');

  /**
   * Enregistre un événement d'audit structuré dans la console de logging principale
   * et l'écrit de manière asynchrone dans un fichier d'audit dédié.
   * 
   * @param event L'événement d'audit structuré
   */
  static logEvent(event: Omit<IAuditPayload, 'timestamp' | 'eventId'>): void {
    const fullEvent: IAuditPayload = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Log console standard pour les outils de logs Kubernetes/Cloud
    const stringifiedEvent = JSON.stringify(fullEvent);
    
    if (event.action === 'FAILED_UPLOAD' || event.action === 'SUSPICIOUS_ACTIVITY') {
      logger.warn(`[AUDIT SECURITY] ${stringifiedEvent}`);
    } else {
      logger.info(`[AUDIT] ${stringifiedEvent}`);
    }

    // Écriture persistante dans un fichier d'audit local
    try {
      const dir = path.dirname(this.auditLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.auditLogPath, `${stringifiedEvent}\n`, 'utf8');
    } catch (err) {
      logger.error('[AUDIT LOGGER FAILURE] Impossible d\'écrire dans le fichier d\'audit local :', err);
    }
  }
}

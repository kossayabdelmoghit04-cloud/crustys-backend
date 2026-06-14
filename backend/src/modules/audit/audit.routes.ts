import { Router } from 'express';
import { AuditController } from './audit.controller';
import { validate } from '../../middlewares/validate';
import { auditQuerySchema, getAuditLogByIdSchema, exportAuditLogsSchema } from './audit.validation';
import { authenticate, requirePermissions } from '../auth/auth.middleware';

const router = Router();

// 1. Lister les logs d'audit (Requiert read:auditlogs)
router.get(
  '/',
  authenticate,
  requirePermissions('read:auditlogs'),
  validate(auditQuerySchema),
  AuditController.getAuditLogs
);

// 2. Exporter les logs d'audit (Requiert export:auditlogs)
router.get(
  '/export',
  authenticate,
  requirePermissions('export:auditlogs'),
  validate(exportAuditLogsSchema),
  AuditController.exportAuditLogs
);

// 3. Récupérer un log spécifique (Requiert read:auditlogs)
router.get(
  '/:id',
  authenticate,
  requirePermissions('read:auditlogs'),
  validate(getAuditLogByIdSchema),
  AuditController.getAuditLogById
);

export default router;

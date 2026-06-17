import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';
import * as XLSX from 'xlsx';

export class AuditController {
  /**
   * Lister les logs d'audit paginés et filtrés
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        userId: req.query.userId as string,
        action: req.query.action as string,
        entity: req.query.entity as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await AuditService.findAll(filters);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupérer un log d'audit par son ID
   */
  static async getAuditLogById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const log = await AuditService.getById(id);

      return res.status(200).json({
        status: 'success',
        data: log,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exporter les logs d'audit au format CSV, Excel (XLSX) ou JSON
   */
  static async exportAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        userId: req.query.userId as string,
        action: req.query.action as string,
        entity: req.query.entity as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const format = (req.query.format as string || 'json').toLowerCase();
      const logs = await AuditService.findAllForExport(filters);

      // Aplatir les logs pour une meilleure lisibilité dans Excel/CSV
      const flatLogs = logs.map(log => ({
        ID: log.id,
        'User ID': log.userId || 'Système / Anonyme',
        Email: log.userEmail || 'N/A',
        Role: log.role || 'N/A',
        Action: log.action,
        Entity: log.entity || 'N/A',
        'Entity ID': log.entityId || 'N/A',
        'Old Value': log.oldValue ? JSON.stringify(log.oldValue) : '',
        'New Value': log.newValue ? JSON.stringify(log.newValue) : '',
        'IP Address': log.ipAddress || 'N/A',
        'User Agent': log.userAgent || 'N/A',
        'Created At': log.createdAt.toISOString(),
      }));

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        
        if (flatLogs.length === 0) {
          return res.status(200).send('');
        }

        const headers = Object.keys(flatLogs[0]);
        const csvContent = [
          headers.join(','),
          ...flatLogs.map(row => 
            headers.map(h => {
              const val = (row as Record<string, unknown>)[h] || '';
              const escaped = String(val).replace(/"/g, '""');
              return `"${escaped}"`;
            }).join(',')
          )
        ].join('\n');

        return res.status(200).send(csvContent);
      }

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(flatLogs);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs d\'audit');
        
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.xlsx`);
        return res.status(200).send(buffer);
      }

      // Par défaut au format JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
      return res.status(200).json({
        status: 'success',
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

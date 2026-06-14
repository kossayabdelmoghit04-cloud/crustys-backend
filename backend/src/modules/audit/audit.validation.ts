import { z } from 'zod';

export const auditQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getAuditLogByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de log d\'audit invalide'),
  }),
});

export const exportAuditLogsSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    userId: z.string().optional(),
    action: z.string().optional(),
    entity: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    format: z.enum(['csv', 'xlsx', 'json']).optional().default('json'),
  }),
});

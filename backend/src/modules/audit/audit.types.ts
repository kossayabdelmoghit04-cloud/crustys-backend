export interface CreateAuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  role?: string | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogQueryFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  entity?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

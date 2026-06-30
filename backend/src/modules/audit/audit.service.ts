import { prisma } from '../../utils/prisma';
import { AppError } from '../../utils/appError';
import { CreateAuditLogInput, AuditLogQueryFilters } from './audit.types';
import { Prisma } from '@prisma/client';

export class AuditService {
  /**
   * Créer un log d'audit
   */
  static async create(data: CreateAuditLogInput) {
    return prisma.activityLog.create({
      data: {
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        role: data.role || null,
        action: data.action,
        entity: data.entity || null,
        entityId: data.entityId || null,
        oldValue: (data.oldValue ?? Prisma.DbNull) as Prisma.InputJsonValue,
        newValue: (data.newValue ?? Prisma.DbNull) as Prisma.InputJsonValue,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        sentryEventId: data.sentryEventId || null,
      },
    });
  }

  /**
   * Récupérer les logs d'audit paginés et filtrés
   */
  static async findAll(filters: AuditLogQueryFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entity) {
      where.entity = filters.entity;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      where.OR = [
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entity: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        { userAgent: { contains: filters.search, mode: 'insensitive' } },
        { userId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer les logs d'audit pour l'export (sans pagination)
   */
  static async findAllForExport(filters: Omit<AuditLogQueryFilters, 'page' | 'limit'>) {
    const where: Prisma.ActivityLogWhereInput = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entity) {
      where.entity = filters.entity;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      where.OR = [
        { userEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entity: { contains: filters.search, mode: 'insensitive' } },
        { ipAddress: { contains: filters.search, mode: 'insensitive' } },
        { userAgent: { contains: filters.search, mode: 'insensitive' } },
        { userId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    return prisma.activityLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });
  }

  /**
   * Récupérer un log d'audit par son ID
   */
  static async getById(id: string) {
    const log = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new AppError("Log d'audit introuvable.", 404);
    }

    return log;
  }
}

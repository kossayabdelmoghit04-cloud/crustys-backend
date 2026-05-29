import { UserRole } from '@prisma/client';
import { prisma } from '../../utils/prisma';
import { buildPrismaQuery } from '../../utils/queryBuilder';
import { USERS_CONSTANTS } from './users.constants';
import { SanitizedUser, TokenPayload } from '../auth/auth.types';
import { 
  ConflictError, 
  ForbiddenError, 
  AppError 
} from '../../utils/appError';
import { logger } from '../../utils/logger';

/**
 * Enterprise Service handling all User operations and security logic
 */
export class UsersService {
  /**
   * Helper to sanitize regular User objects from the DB
   */
  private static sanitizeUser(user: any): SanitizedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName} ${user.lastName}`,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Fetch a paginated, filtered, searched, and sorted list of non-deleted users (Admin only)
   */
  public static async getUsers(queryParams: any) {
    // 1. Build Prisma query using our generic builder helper
    const builderResult = buildPrismaQuery(queryParams, {
      searchableFields: USERS_CONSTANTS.SEARCHABLE_FIELDS,
      filterFields: USERS_CONSTANTS.FILTER_FIELDS,
      booleanFields: USERS_CONSTANTS.BOOLEAN_FIELDS,
    });

    // 2. Soft-Delete enforcement (Always exclude users where deletedAt is not null)
    const softDeleteCondition = { deletedAt: null };
    if (!builderResult.where.AND) {
      builderResult.where.AND = [softDeleteCondition];
    } else {
      builderResult.where.AND.push(softDeleteCondition);
    }

    logger.debug(`[Users Service] Fetching list: where=${JSON.stringify(builderResult.where)}`);

    // 3. Parallel database execution (Optimizes performance by firing counts and finds simultaneously)
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: builderResult.where,
        orderBy: builderResult.orderBy,
        skip: builderResult.skip,
        take: builderResult.take,
      }),
      prisma.user.count({
        where: builderResult.where,
      }),
    ]);

    const sanitizedUsers = users.map((u) => this.sanitizeUser(u));

    return {
      items: sanitizedUsers,
      total,
      page: builderResult.page,
      limit: builderResult.limit,
    };
  }

  /**
   * Retrieve a user by their unique ID with strict ownership validation
   */
  public static async getUserById(
    id: string,
    session: TokenPayload
  ): Promise<SanitizedUser> {
    // Ownership check: regular customers can only fetch their own profiles
    const sessionRole = session.role.toUpperCase();
    if (sessionRole !== 'ADMIN' && sessionRole !== 'SUPER ADMIN' && session.userId !== id) {
      logger.warn(`[Users Service] Security Violation: User ${session.email} tried to access profile ${id}.`);
      throw new ForbiddenError("Vous n'êtes pas autorisé à accéder aux informations de ce compte");
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      logger.warn(`[Users Service] Search Failed: Profile ${id} not found or soft-deleted.`);
      throw new AppError("Utilisateur non trouvé", 404);
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update regular user profile details with strict ownership and email duplication validation
   */
  public static async updateUser(
    id: string,
    data: { firstName?: string; lastName?: string; email?: string },
    session: TokenPayload
  ): Promise<SanitizedUser> {
    // Ownership check: customers can only modify their own details
    const sessionRole = session.role.toUpperCase();
    if (sessionRole !== 'ADMIN' && sessionRole !== 'SUPER ADMIN' && session.userId !== id) {
      logger.warn(`[Users Service] Security Violation: User ${session.email} tried to update profile ${id}.`);
      throw new ForbiddenError("Vous n'êtes pas autorisé à modifier ce compte");
    }

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError("Utilisateur non trouvé ou archivé", 404);
    }

    const updatePayload: any = {};

    // Email unique check
    if (data.email) {
      const lowerEmail = data.email.toLowerCase().trim();
      if (lowerEmail !== user.email) {
        const emailTaken = await prisma.user.findFirst({
          where: { email: lowerEmail, deletedAt: null },
        });

        if (emailTaken) {
          logger.warn(`[Users Service] Conflict: Email ${lowerEmail} is already taken.`);
          throw new ConflictError("Cette adresse email est déjà utilisée par un autre compte");
        }
        updatePayload.email = lowerEmail;
      }
    }

    if (data.firstName) updatePayload.firstName = data.firstName.trim();
    if (data.lastName) updatePayload.lastName = data.lastName.trim();

    // Recompute fullName if any name fields change
    if (data.firstName || data.lastName) {
      const fName = data.firstName ? data.firstName.trim() : user.firstName;
      const lName = data.lastName ? data.lastName.trim() : user.lastName;
      updatePayload.fullName = `${fName} ${lName}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
    });

    logger.info(`[Users Service] Profile updated successfully: ID=${id}`);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Update user Role (Admin only)
   */
  public static async updateUserRole(id: string, role: UserRole): Promise<SanitizedUser> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError("Utilisateur non trouvé ou archivé", 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    logger.info(`[Users Service] Role updated for ID=${id} to ${role}`);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Update user status (Admin only).
   * Note: Suspending a user immediately revokes their sessions by setting refreshToken to null!
   */
  public static async updateUserStatus(id: string, isActive: boolean): Promise<SanitizedUser> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError("Utilisateur non trouvé ou archivé", 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { 
        isActive,
        // If suspending account, immediately revoke their active sessions in DB
        refreshToken: isActive ? undefined : null
      },
    });

    logger.info(`[Users Service] Account status updated for ID=${id}: isActive=${isActive}`);
    return this.sanitizeUser(updatedUser);
  }

  /**
   * Performs a secure Soft-Delete by stamping deletedAt and clearing sessions (Admin only)
   */
  public static async softDeleteUser(id: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new AppError("Utilisateur non trouvé ou déjà archivé", 404);
    }

    await prisma.user.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        refreshToken: null // Immediately invalidate any active sessions
      },
    });

    logger.info(`[Users Service] Soft-deleted user and cleared sessions: ID=${id}`);
  }
}

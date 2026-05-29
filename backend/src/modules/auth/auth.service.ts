import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../utils/prisma';
import { 
  comparePassword, 
  hashPassword, 
  generateAccessToken, 
  generateRefreshToken 
} from './auth.utils';
import { 
  ConflictError, 
  UnauthorizedError, 
  AppError 
} from '../../utils/appError';
import { 
  SanitizedUser, 
  SanitizedAdmin, 
  AuthResponse, 
  TokenPayload 
} from './auth.types';
import { AUTH_CONSTANTS } from './auth.constants';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import { EmailProducer } from '../emails';

/**
 * Enterprise Authentication & Authorization Service
 */
export class AuthService {
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
   * Helper to sanitize Admin objects from the DB
   */
  private static sanitizeAdmin(admin: any): SanitizedAdmin {
    return {
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
      role: {
        name: admin.role.name,
        permissions: admin.role.permissions as string[],
      },
    };
  }

  /**
   * Register a new client / user in the database
   */
  public static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    avatar?: string | null;
  }): Promise<AuthResponse & { refreshToken: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existingUser) {
      logger.warn(`[Register Service] Email conflict: ${data.email} already registered.`);
      throw new ConflictError('Un compte avec cette adresse email existe déjà');
    }

    // Hash password with 12 rounds of bcrypt
    const hashedPassword = await hashPassword(data.password);

    // Save user inside PostgreSQL via Prisma
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
        phone: data.phone || null,
        avatar: data.avatar || null,
        isVerified: false,
        isActive: true,
      },
    });

    logger.info(`[Register Service] User created successfully: ID=${user.id}`);

    // Create JWT payloads
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store the refresh token in PostgreSQL for token rotation
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Enqueue Welcome Email asynchronously (non-blocking)
    EmailProducer.enqueueWelcomeEmail(user.email, {
      firstName: user.firstName,
      welcomeUrl: 'https://crustysexpress.com/profile'
    }).catch(err => {
      logger.error(`[Register Service] Failed enqueuing Welcome Email to ${user.email}: ${err.message}`);
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticate users (both regular Customer users and Admin administrators)
   */
  public static async login(
    email: string,
    password: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    const lowerEmail = email.toLowerCase().trim();

    // 1. Try finding in Admin table first (maintaining old admin auth)
    const admin = await prisma.admin.findUnique({
      where: { email: lowerEmail },
      include: { role: true },
    });

    if (admin) {
      const isPasswordValid = await comparePassword(password, admin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Email ou mot de passe incorrect');
      }

      logger.info(`[Login Service] Admin authenticated successfully: ${admin.email}`);

      const permissions = admin.role.permissions as string[];
      const payload: TokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role.name,
        permissions,
      };

      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ adminId: admin.id });

      return {
        admin: this.sanitizeAdmin(admin),
        accessToken,
        refreshToken,
      };
    }

    // 2. Try finding in regular User table
    const user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      logger.warn(`[Login Service] Authentication failed: ${email} not found.`);
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    // Verify if account is active
    if (!user.isActive) {
      logger.warn(`[Login Service] Account suspended: ${email}`);
      throw new AppError('Ce compte a été suspendu ou désactivé.', 403);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`[Login Service] Password mismatch for: ${email}`);
      throw new UnauthorizedError('Email ou mot de passe incorrect');
    }

    logger.info(`[Login Service] Customer authenticated successfully: ${user.email}`);

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Save refresh token in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes JWT tokens with secure rotation and reuse detection
   */
  public static async refresh(
    providedToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let decoded: any;

    try {
      decoded = jwt.verify(providedToken, AUTH_CONSTANTS.REFRESH_TOKEN_SECRET);
    } catch (error) {
      logger.warn('[Refresh Service] Invalid refresh token signature or expiration.');
      throw new UnauthorizedError('Refresh token invalide ou expiré');
    }

    // CASE 1: Customer User Refresh
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedError('Utilisateur non trouvé ou suspendu');
      }

      // TOKEN REUSE DETECTION (Automatic Invalidation)
      if (user.refreshToken !== providedToken) {
        logger.error(
          `[SECURITY WARNING] Token reuse detected for User ${user.email}. Clearing all active sessions.`
        );
        // Revoke everything for security
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
        throw new UnauthorizedError('Alerte de sécurité. Veuillez vous reconnecter.');
      }

      // Generate new pair
      const payload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken({ userId: user.id });

      // Save new rotated token
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: newRefreshToken },
      });

      return { accessToken, refreshToken: newRefreshToken };
    }

    // CASE 2: Admin User Refresh
    if (decoded.adminId) {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.adminId },
        include: { role: true },
      });

      if (!admin) {
        throw new UnauthorizedError('Administrateur non trouvé');
      }

      const permissions = admin.role.permissions as string[];
      const payload: TokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: admin.role.name,
        permissions,
      };

      const accessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken({ adminId: admin.id });

      return { accessToken, refreshToken: newRefreshToken };
    }

    throw new UnauthorizedError('Refresh token invalide');
  }

  /**
   * Log out a user session and remove their Refresh Token from the DB
   */
  public static async logout(payload: TokenPayload): Promise<void> {
    if (payload.userId) {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { refreshToken: null },
      });
      logger.info(`[Logout Service] User logged out, session cleared: ID=${payload.userId}`);
    } else {
      logger.info(`[Logout Service] Admin logged out: ID=${payload.adminId}`);
    }
  }

  /**
   * Fetch the sanitized profile of the currently logged-in user
   */
  public static async getUserProfile(payload: TokenPayload): Promise<AuthResponse> {
    if (payload.userId) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError('Profil utilisateur non trouvé', 404);
      }

      return { user: this.sanitizeUser(user), accessToken: '' };
    }

    if (payload.adminId) {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.adminId },
        include: { role: true },
      });

      if (!admin) {
        throw new AppError('Profil administrateur non trouvé', 404);
      }

      return { admin: this.sanitizeAdmin(admin), accessToken: '' };
    }

    throw new UnauthorizedError('Profil non identifié');
  }

  /**
   * Request password reset token and send transactional security email
   */
  public static async forgotPassword(email: string): Promise<void> {
    const sanitizedEmail = email.toLowerCase().trim();
    
    // Find the user in PostgreSQL
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    // Anti-user enumeration: If not found, log warn but do NOT leak account existence to client
    if (!user) {
      logger.warn(`[Forgot Password] Account search failed for: ${sanitizedEmail}. Simulating success.`);
      return;
    }

    // Generate secure random unhashed token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token to protect it at rest inside our database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Calculate expiration date (15 minutes from now)
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Save hashed token and expiration to the database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: tokenExpires,
      },
    });

    // Build absolute frontend reset password link
    const origin = env.CORS_ORIGIN || 'http://localhost:3000';
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;

    // Enqueue the security email asynchronously (fire-and-forget)
    EmailProducer.enqueueResetPasswordEmail(user.email, {
      firstName: user.firstName,
      resetUrl,
      expiresInMinutes: 15,
    }).catch(err => {
      logger.error(`[Forgot Password] Failed to enqueue reset email to ${user.email}: ${err.message}`);
    });

    logger.info(`[Forgot Password] Reset token generated and saved for User ID=${user.id}`);
  }

  /**
   * Reset user password using unhashed token
   */
  public static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Re-hash incoming token to query against hashed storage
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Retrieve active and non-expired token match
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      logger.warn(`[Reset Password] Attempt failed: invalid or expired reset token.`);
      throw new AppError('Le jeton de réinitialisation est invalide ou expiré', 400);
    }

    // Hash the new password with bcrypt
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset columns to enforce one-time usage
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    logger.info(`[Reset Password] Password reset successful for User ID=${user.id}`);
  }
}

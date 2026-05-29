import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './appError';
import { logger } from './logger';

export interface TokenPayload {
  adminId: string;
  email: string;
  role: string;
  permissions: string[];
}

/**
 * Helpers pour la gestion centralisée et sécurisée des JSON Web Tokens (JWT)
 */
export class JwtUtil {
  /**
   * Obtient un aperçu sécurisé d'une clé (premiers et derniers caractères) pour le débogage
   */
  private static getSecretPreview(secret: string): string {
    if (!secret) return 'UNDEFINED';
    if (secret.length <= 8) return '***';
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
  }

  /**
   * Génère un Access Token (durée de vie courte)
   */
  public static generateAccessToken(payload: TokenPayload): string {
    try {
      logger.debug(
        `[JWT] Génération de l'Access Token pour l'admin ${payload.email} (Rôle: ${payload.role}). Secret utilisé: ${this.getSecretPreview(env.JWT_SECRET)}`
      );

      // S'assurer qu'on n'envoie pas les champs d'expiration s'ils existaient déjà dans un payload réutilisé
      const { iat, exp, ...cleanPayload } = payload as any;

      return jwt.sign(cleanPayload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      });
    } catch (error: any) {
      logger.error(`[JWT] Échec de la génération de l'Access Token: ${error.message}`);
      throw new AppError('Erreur lors de la génération du jeton de sécurité.', 500);
    }
  }

  /**
   * Génère un Refresh Token (durée de vie longue)
   */
  public static generateRefreshToken(payload: { adminId: string }): string {
    try {
      logger.debug(
        `[JWT] Génération du Refresh Token pour l'adminId ${payload.adminId}. Secret utilisé: ${this.getSecretPreview(env.JWT_REFRESH_SECRET)}`
      );
      
      const { iat, exp, ...cleanPayload } = payload as any;

      return jwt.sign(cleanPayload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      });
    } catch (error: any) {
      logger.error(`[JWT] Échec de la génération du Refresh Token: ${error.message}`);
      throw new AppError('Erreur lors de la génération du jeton de renouvellement.', 500);
    }
  }

  /**
   * Vérifie et décode un Access Token
   */
  public static verifyAccessToken(token: string): TokenPayload {
    try {
      logger.debug(
        `[JWT] Tentative de vérification de l'Access Token (Longueur: ${token.length}). Secret de vérification: ${this.getSecretPreview(env.JWT_SECRET)}`
      );
      
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      
      logger.debug(
        `[JWT] Access Token vérifié avec succès pour l'admin ${decoded.email} (ID: ${decoded.adminId})`
      );
      return decoded;
    } catch (error: any) {
      logger.warn(
        `[JWT] Échec de la vérification de l'Access Token. Type d'erreur: ${error.name}, Message: ${error.message}`
      );
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Votre session a expiré. Veuillez vous reconnecter.', 401);
      }
      
      throw new AppError('Token de sécurité invalide.', 401);
    }
  }

  /**
   * Vérifie et décode un Refresh Token
   */
  public static verifyRefreshToken(token: string): { adminId: string } {
    try {
      logger.debug(
        `[JWT] Tentative de vérification du Refresh Token. Secret de vérification: ${this.getSecretPreview(env.JWT_REFRESH_SECRET)}`
      );
      
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { adminId: string };
      
      logger.debug(`[JWT] Refresh Token vérifié avec succès pour l'adminId ${decoded.adminId}`);
      return decoded;
    } catch (error: any) {
      logger.warn(
        `[JWT] Échec de la vérification du Refresh Token. Type d'erreur: ${error.name}, Message: ${error.message}`
      );
      
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expiré. Veuillez vous reconnecter.', 401);
      }
      
      throw new AppError('Refresh token invalide.', 401);
    }
  }
}

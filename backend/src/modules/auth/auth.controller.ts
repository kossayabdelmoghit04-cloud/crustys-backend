import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { setAuthCookies, clearAuthCookies } from './auth.utils';
import { UnauthorizedError } from '../../utils/appError';

/**
 * Enterprise Authentication & Authorization Controller
 */
export class AuthController {
  /**
   * Register a new regular customer account
   * POST /api/auth/register
   */
  public static register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, phone, avatar } = req.body;
      
      const { user, accessToken, refreshToken } = await AuthService.register({
        email,
        password,
        firstName,
        lastName,
        phone,
        avatar,
      });

      // Write secure httpOnly cookie
      setAuthCookies(res, refreshToken);

      return res.status(201).json({
        status: 'success',
        message: 'Compte créé avec succès et utilisateur connecté.',
        data: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Log in user (customer or administrator)
   * POST /api/auth/login
   */
  public static login = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      const { email, password } = req.body;
      
      const { user, admin, accessToken, refreshToken } = await AuthService.login(email, password);

      // Record success
      const { BruteForceService } = await import('../../security/brute-force.service');
      BruteForceService.recordSuccess(ip);

      // Write secure httpOnly cookie
      setAuthCookies(res, refreshToken);

      return res.status(200).json({
        status: 'success',
        message: 'Connexion réussie',
        data: {
          user,
          admin,
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      // Record failure
      try {
        const { BruteForceService } = await import('../../security/brute-force.service');
        BruteForceService.recordFailure(ip, req.originalUrl || req.url);
      } catch (err) {
        // Safe fallback if import fails
      }
      next(error);
    }
  };

  /**
   * Rotates JWT Access and Refresh tokens
   * POST /api/auth/refresh-token & POST /api/auth/refresh
   */
  public static refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Support extracting refresh token from cookie (recommended) or from request body
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token manquant. Veuillez vous reconnecter.');
      }

      const tokens = await AuthService.refresh(refreshToken);
      
      // Update secure httpOnly cookie with new rotated refresh token
      setAuthCookies(res, tokens.refreshToken);

      return res.status(200).json({
        status: 'success',
        message: 'Tokens rafraîchis avec succès',
        data: {
          accessToken: tokens.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Log out active user and clear authentication cookies
   * POST /api/auth/logout
   */
  public static logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await AuthService.logout(req.user);
      }

      // Clear cookies from client browser
      clearAuthCookies(res);

      return res.status(200).json({
        status: 'success',
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get authenticated user profile
   * GET /api/auth/profile
   */
  public static profile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Session non identifiée');
      }

      const profile = await AuthService.getUserProfile(req.user);

      return res.status(200).json({
        status: 'success',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Request password reset token
   * POST /api/auth/forgot-password
   */
  public static forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      
      await AuthService.forgotPassword(email);

      return res.status(200).json({
        success: true,
        message: "Si l'adresse email existe dans notre système, un e-mail de réinitialisation de mot de passe vous a été envoyé.",
        data: {},
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset user password using token
   * POST /api/auth/reset-password
   */
  public static resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      await AuthService.resetPassword(token, password);

      return res.status(200).json({
        success: true,
        message: 'Votre mot de passe a été réinitialisé avec succès.',
        data: {},
      });
    } catch (error) {
      next(error);
    }
  };
}

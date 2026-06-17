import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middlewares/validate';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation';
import { authenticate } from '../../middlewares/authenticate';
import { authRateLimiter } from '../../middlewares/rateLimit';
import { auditTrail } from '../audit/audit.middleware';

const router = Router();

/**
 * Public Routes - Protected by Authentication Rate Limiting
 */

// 1. Customer registration (Customer account creation)
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  auditTrail({ action: 'auth_register' }),
  AuthController.register
);

// 2. Authentication Login (Accepts both Customers & Administrators)
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  auditTrail({ action: 'auth_login' }),
  AuthController.login
);

// 3. JWT Token rotation exchange (Supports both standard path and original alias)
router.post('/refresh', AuthController.refresh);
router.post('/refresh-token', AuthController.refresh);

// 4. Request password reset email
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  AuthController.forgotPassword
);

// 5. Submit token and set new password
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  auditTrail({ action: 'auth_password_reset' }),
  AuthController.resetPassword
);

/**
 * Protected Routes - Secured by JWT Bearer Authentication
 */

// 4. Retrieve current session profile details
router.get('/profile', authenticate, AuthController.profile);

// 5. Invalidate session and log out
router.post('/logout', authenticate, auditTrail({ action: 'auth_logout' }), AuthController.logout);

export default router;

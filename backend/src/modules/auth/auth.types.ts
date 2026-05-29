import { UserRole } from '@prisma/client';

/**
 * Standard TokenPayload contained within JWT access tokens
 */
export interface TokenPayload {
  userId?: string;      // Present for customer/client accounts
  adminId?: string;     // Present for administration accounts
  email: string;
  role: string;         // E.g., 'ADMIN', 'CUSTOMER', or roles from the roles table like 'Super Admin'
  permissions?: string[];
}

/**
 * Sanitized profile interface for regular customer users
 */
export interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  avatar: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sanitized profile interface for admin users
 */
export interface SanitizedAdmin {
  id: string;
  fullName: string;
  email: string;
  role: {
    name: string;
    permissions: string[];
  };
}

/**
 * Success authentication response body
 */
export interface AuthResponse {
  user?: SanitizedUser;
  admin?: SanitizedAdmin;
  accessToken: string;
}

/**
 * Augment the Express namespace to include the decrypted token payload
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

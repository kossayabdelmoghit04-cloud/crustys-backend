import jwt from 'jsonwebtoken';
import { createAdmin, createManager, createTestUser } from './factories';

// Get secrets from environment variables (which are set in env.setup.ts)
const getAccessTokenSecret = () => process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'test-jwt-secret-key-minimum-32-chars-long!!';
const getRefreshTokenSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-min-32-chars';

export function generateAccessToken(payload: any): string {
  const { iat, exp, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, getAccessTokenSecret(), {
    expiresIn: '15m',
  });
}

export function generateRefreshToken(payload: any): string {
  const { iat, exp, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, getRefreshTokenSecret(), {
    expiresIn: '7d',
  });
}

export function generateExpiredToken(payload: any): string {
  const { iat, exp, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, getAccessTokenSecret(), {
    expiresIn: '-10s', // expired 10 seconds ago
  });
}

export async function loginAsAdmin(overrides: any = {}) {
  const admin = await createAdmin(overrides);
  const token = generateAccessToken({
    adminId: admin.id,
    email: admin.email,
    role: 'Super Admin',
    permissions: ['*'],
  });
  return { token, admin };
}

export async function loginAsManager(overrides: any = {}) {
  const manager = await createManager(overrides);
  // Get permissions from manager's role, or use default manager permissions
  const token = generateAccessToken({
    adminId: manager.id,
    email: manager.email,
    role: 'Manager',
    permissions: [
      'read:products',
      'write:products',
      'read:categories',
      'write:categories',
      'read:orders',
      'write:orders',
      'read:reservations',
      'write:reservations',
      'read:payments',
      'read:analytics',
    ],
  });
  return { token, manager };
}

export async function loginAsCustomer(overrides: any = {}) {
  const user = await createTestUser(overrides);
  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: 'CUSTOMER',
  });
  return { token, user };
}

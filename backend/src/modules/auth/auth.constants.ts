import { env } from '../../config/env';

/**
 * Enterprise Authentication Constants
 */
export const AUTH_CONSTANTS = {
  // Access Token and Refresh Token secrets with flexible environment variables support
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || env.JWT_SECRET || 'super-secret-jwt-key-change-me-in-production',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-me-in-production',
  
  // Lifespans for JSON Web Tokens
  ACCESS_TOKEN_EXPIRE: '15m',
  REFRESH_TOKEN_EXPIRE: '7d',
  
  // Security cookie configuration
  COOKIE: {
    NAME: 'refreshToken',
    MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
};

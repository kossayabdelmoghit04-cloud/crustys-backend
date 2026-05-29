import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AUTH_CONSTANTS } from './auth.constants';
import { env } from '../../config/env';

/**
 * Generates a short-lived JWT Access Token
 */
export const generateAccessToken = (payload: any): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat, exp, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, AUTH_CONSTANTS.ACCESS_TOKEN_SECRET, {
    expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Generates a long-lived JWT Refresh Token
 */
export const generateRefreshToken = (payload: any): string => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat, exp, ...cleanPayload } = payload;
  return jwt.sign(cleanPayload, AUTH_CONSTANTS.REFRESH_TOKEN_SECRET, {
    expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Hashes a plaintext password using bcryptjs with 12 rounds
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

/**
 * Compares a plaintext password with its hashed counterpart
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Configures and sets the secure, httpOnly Refresh Token cookie on the response
 */
export const setAuthCookies = (res: Response, refreshToken: string): void => {
  res.cookie(AUTH_CONSTANTS.COOKIE.NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: AUTH_CONSTANTS.COOKIE.MAX_AGE,
  });
};

/**
 * Clears the Refresh Token cookie on the response
 */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(AUTH_CONSTANTS.COOKIE.NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

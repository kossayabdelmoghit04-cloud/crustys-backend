import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../../../modules/auth/auth.utils';
import { JwtUtil } from '../../../utils/jwt';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  TokenExpiredError: class extends Error {
    constructor() {
      super('Token expired');
      this.name = 'TokenExpiredError';
    }
  },
}));

describe('AUTH MODULE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auth.utils.ts', () => {
    describe('hashPassword', () => {
      it('should hash a password using bcrypt with 12 rounds', async () => {
        const password = 'mySecurePassword123';
        const expectedHash = '$2a$12$hashedpasswordplaceholder';
        (bcrypt.hash as jest.Mock).mockResolvedValue(expectedHash);

        const result = await hashPassword(password);

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
        expect(result).toBe(expectedHash);
      });

      it('should propagate errors from bcrypt.hash', async () => {
        (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt hashing error'));

        await expect(hashPassword('password')).rejects.toThrow('Bcrypt hashing error');
      });
    });

    describe('comparePassword', () => {
      it('should return true if passwords match', async () => {
        const password = 'mySecurePassword123';
        const hash = '$2a$12$hashedpasswordplaceholder';
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await comparePassword(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(true);
      });

      it('should return false if passwords do not match', async () => {
        const password = 'wrongPassword';
        const hash = '$2a$12$hashedpasswordplaceholder';
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await comparePassword(password, hash);

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
        expect(result).toBe(false);
      });
    });

    describe('generateAccessToken', () => {
      it('should generate a short-lived access token', () => {
        const payload = { userId: 'user-123', email: 'user@example.com' };
        const expectedToken = 'jwt-access-token';
        (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

        const result = generateAccessToken(payload);

        expect(jwt.sign).toHaveBeenCalledWith(
          payload,
          expect.any(String), // Secret
          expect.objectContaining({ expiresIn: expect.any(String) })
        );
        expect(result).toBe(expectedToken);
      });

      it('should strip existing iat and exp from payload before signing', () => {
        const payload = { userId: 'user-123', email: 'user@example.com', iat: 123456, exp: 789012 };
        (jwt.sign as jest.Mock).mockReturnValue('token');

        generateAccessToken(payload);

        expect(jwt.sign).toHaveBeenCalledWith(
          { userId: 'user-123', email: 'user@example.com' },
          expect.any(String),
          expect.any(Object)
        );
      });
    });

    describe('generateRefreshToken', () => {
      it('should generate a long-lived refresh token', () => {
        const payload = { userId: 'user-123' };
        const expectedToken = 'jwt-refresh-token';
        (jwt.sign as jest.Mock).mockReturnValue(expectedToken);

        const result = generateRefreshToken(payload);

        expect(jwt.sign).toHaveBeenCalledWith(
          payload,
          expect.any(String), // Secret
          expect.objectContaining({ expiresIn: expect.any(String) })
        );
        expect(result).toBe(expectedToken);
      });
    });
  });

  describe('jwt.ts (JwtUtil)', () => {
    const payload = {
      adminId: 'admin-123',
      email: 'admin@crustys.com',
      role: 'Admin',
      permissions: ['read:orders', 'write:orders'],
    };

    describe('generateAccessToken', () => {
      it('should sign access token correctly using JwtUtil', () => {
        (jwt.sign as jest.Mock).mockReturnValue('jwt-access');
        const token = JwtUtil.generateAccessToken(payload);
        expect(token).toBe('jwt-access');
      });

      it('should throw AppError on sign failure', () => {
        (jwt.sign as jest.Mock).mockImplementation(() => {
          throw new Error('Sign failure');
        });
        expect(() => JwtUtil.generateAccessToken(payload)).toThrow('Erreur lors de la génération du jeton de sécurité.');
      });
    });

    describe('generateRefreshToken', () => {
      it('should sign refresh token correctly', () => {
        (jwt.sign as jest.Mock).mockReturnValue('jwt-refresh');
        const token = JwtUtil.generateRefreshToken({ adminId: 'admin-123' });
        expect(token).toBe('jwt-refresh');
      });

      it('should throw AppError on refresh sign failure', () => {
        (jwt.sign as jest.Mock).mockImplementation(() => {
          throw new Error('Sign failure');
        });
        expect(() => JwtUtil.generateRefreshToken({ adminId: 'admin-123' })).toThrow('Erreur lors de la génération du jeton de renouvellement.');
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify and return payload', () => {
        (jwt.verify as jest.Mock).mockReturnValue(payload);
        const decoded = JwtUtil.verifyAccessToken('valid-token');
        expect(decoded).toEqual(payload);
        expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      });

      it('should throw specific AppError on expired token', () => {
        const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });
        expect(() => JwtUtil.verifyAccessToken('expired-token')).toThrow('Votre session a expiré. Veuillez vous reconnecter.');
      });

      it('should throw general AppError on invalid token', () => {
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw new Error('Invalid signature');
        });
        expect(() => JwtUtil.verifyAccessToken('invalid-token')).toThrow('Token de sécurité invalide.');
      });
    });

    describe('verifyRefreshToken', () => {
      it('should verify and return decoded refresh payload', () => {
        (jwt.verify as jest.Mock).mockReturnValue({ adminId: 'admin-123' });
        const decoded = JwtUtil.verifyRefreshToken('valid-refresh');
        expect(decoded).toEqual({ adminId: 'admin-123' });
      });

      it('should throw specific AppError on expired refresh token', () => {
        const expiredError = new jwt.TokenExpiredError('Token expired', new Date());
        (jwt.verify as jest.Mock).mockImplementation(() => {
          throw expiredError;
        });
        expect(() => JwtUtil.verifyRefreshToken('expired-refresh')).toThrow('Refresh token expiré. Veuillez vous reconnecter.');
      });
    });
  });
});

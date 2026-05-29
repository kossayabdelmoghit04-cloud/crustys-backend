import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createTestUser } from '../helpers/factories';
import { generateExpiredToken } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new customer', async () => {
      const payload = {
        email: 'customer@test.com',
        password: 'Password123',
        firstName: 'Alice',
        lastName: 'Smith',
        phone: '5141234567',
      };

      const res = await request
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(payload.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined(); // HttpOnly cookie with refresh token
    });

    it('should fail registration with duplicate email', async () => {
      await createTestUser({ email: 'duplicate@test.com' });

      const payload = {
        email: 'duplicate@test.com',
        password: 'Password123',
        firstName: 'Alice',
        lastName: 'Smith',
      };

      const res = await request
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(409); // Or whatever duplicate conflict error status code is (400/409)

      expect(res.body.status).not.toBe('success');
    });

    it('should fail with invalid email format', async () => {
      const payload = {
        email: 'invalid-email',
        password: 'Password123',
        firstName: 'Alice',
        lastName: 'Smith',
      };

      const res = await request
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(400);

      expect(res.body.status).not.toBe('success');
    });

    it('should fail with weak password (missing number)', async () => {
      const payload = {
        email: 'weakpwd@test.com',
        password: 'Password!',
        firstName: 'Alice',
        lastName: 'Smith',
      };

      const res = await request
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(400);

      expect(res.body.status).not.toBe('success');
    });

    it('should fail when missing required fields', async () => {
      const payload = {
        email: 'missing@test.com',
        password: 'Password123',
      };

      const res = await request
        .post('/api/v1/auth/register')
        .send(payload)
        .expect(400);

      expect(res.body.status).not.toBe('success');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({ email: 'login@test.com', password: 'Password123' });
    });

    it('should successfully login user with correct credentials', async () => {
      const payload = {
        email: 'login@test.com',
        password: 'Password123',
      };

      const res = await request
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const payload = {
        email: 'login@test.com',
        password: 'WrongPassword123',
      };

      await request
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(401);
    });

    it('should fail login for non-existent email', async () => {
      const payload = {
        email: 'nonexistent@test.com',
        password: 'Password123',
      };

      await request
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should retrieve profile details when authenticated', async () => {
      const user = await createTestUser({ email: 'profile@test.com' });
      const token = jwtSign({ userId: user.id, email: user.email, role: 'CUSTOMER' });

      const res = await authRequest(token)
        .get('/api/v1/auth/profile')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe(user.email);
    });

    it('should fail profile details when missing token', async () => {
      await request
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('should fail profile details with expired token', async () => {
      const user = await createTestUser({ email: 'expired@test.com' });
      const expiredToken = generateExpiredToken({ userId: user.id, email: user.email, role: 'CUSTOMER' });

      await authRequest(expiredToken)
        .get('/api/v1/auth/profile')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should successfully rotate tokens', async () => {
      const user = await createTestUser({ email: 'refresh@test.com' });
      const initialRefreshToken = jwtSignRefresh({ userId: user.id });

      // Save token on user in db to support server-side validation if any
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: initialRefreshToken },
      });

      const res = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should fail token rotation when token is missing', async () => {
      await request
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should successfully clear auth cookies', async () => {
      const user = await createTestUser({ email: 'logout@test.com' });
      const token = jwtSign({ userId: user.id, email: user.email, role: 'CUSTOMER' });

      const res = await authRequest(token)
        .post('/api/v1/auth/logout')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.headers['set-cookie']).toBeDefined(); // Cookie clear instructions
    });
  });
});

// Helper functions for signing test JWTs locally to decouple from JwtUtil internals
import jwt from 'jsonwebtoken';
function jwtSign(payload: any): string {
  const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'test-jwt-secret-key-minimum-32-chars-long!!';
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

function jwtSignRefresh(payload: any): string {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-min-32-chars';
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

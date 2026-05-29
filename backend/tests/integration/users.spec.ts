import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createTestUser, createAdmin } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';
import { UserRole } from '@prisma/client';

describe('Users Integration Tests', () => {
  let adminToken: string;
  let adminUser: any;
  let customerToken: string;
  let customerUser: any;

  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();

    // Create default test accounts
    const adminSession = await loginAsAdmin();
    adminToken = adminSession.token;
    adminUser = adminSession.admin;

    const customerSession = await loginAsCustomer({ email: 'client@test.com' });
    customerToken = customerSession.token;
    customerUser = customerSession.user;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /api/v1/users (Admin Only)', () => {
    it('should allow admin to list users with pagination and search', async () => {
      // Seed extra users
      await createTestUser({ email: 'user1@test.com', firstName: 'Alice', role: UserRole.CUSTOMER });
      await createTestUser({ email: 'user2@test.com', firstName: 'Bob', role: UserRole.CUSTOMER });

      const res = await authRequest(adminToken)
        .get('/api/v1/users?search=Alice&page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toBeDefined();
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.meta.page).toBe(1);
    });

    it('should deny non-admin users from listing users', async () => {
      await authRequest(customerToken)
        .get('/api/v1/users')
        .expect(403);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should allow users to retrieve their own profile', async () => {
      const res = await authRequest(customerToken)
        .get(`/api/v1/users/${customerUser.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(customerUser.email);
    });

    it('should allow admin to retrieve any user profile', async () => {
      const res = await authRequest(adminToken)
        .get(`/api/v1/users/${customerUser.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customerUser.id);
    });

    it('should deny a customer from retrieving another customer profile', async () => {
      const anotherCustomer = await createTestUser({ email: 'another@test.com' });
      await authRequest(customerToken)
        .get(`/api/v1/users/${anotherCustomer.id}`)
        .expect(403);
    });

    it('should return 404 for non-existent user ID', async () => {
      await authRequest(adminToken)
        .get('/api/v1/users/non-existent-id-123')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should allow user to update their own profile fields', async () => {
      const updateData = {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
      };

      const res = await authRequest(customerToken)
        .patch(`/api/v1/users/${customerUser.id}`)
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe(updateData.firstName);
      expect(res.body.data.lastName).toBe(updateData.lastName);
    });

    it('should deny updating profile when trying to send invalid strict fields', async () => {
      const updateData = {
        firstName: 'Alice',
        role: 'ADMIN', // strict payload validation prevents extra fields
      };

      await authRequest(customerToken)
        .patch(`/api/v1/users/${customerUser.id}`)
        .send(updateData)
        .expect(400);
    });

    it('should deny another customer from updating a profile', async () => {
      const anotherCustomer = await createTestUser({ email: 'another@test.com' });
      await authRequest(customerToken)
        .patch(`/api/v1/users/${anotherCustomer.id}`)
        .send({ firstName: 'Hacker' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/users/:id (Admin Only)', () => {
    it('should allow admin to soft-delete a user', async () => {
      const res = await authRequest(adminToken)
        .delete(`/api/v1/users/${customerUser.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      // Check soft-delete in database
      const dbUser = await prisma.user.findUnique({
        where: { id: customerUser.id },
      });
      expect(dbUser?.deletedAt).not.toBeNull();
    });

    it('should deny non-admin users from deleting users', async () => {
      await authRequest(customerToken)
        .delete(`/api/v1/users/${customerUser.id}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/role (Admin Only)', () => {
    it('should allow admin to update user role', async () => {
      const res = await authRequest(adminToken)
        .patch(`/api/v1/users/${customerUser.id}/role`)
        .send({ role: UserRole.ADMIN })
        .expect(200);

      expect(res.body.success).toBe(true);
      
      const dbUser = await prisma.user.findUnique({
        where: { id: customerUser.id },
      });
      expect(dbUser?.role).toBe(UserRole.ADMIN);
    });

    it('should deny non-admin users from updating role', async () => {
      await authRequest(customerToken)
        .patch(`/api/v1/users/${customerUser.id}/role`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/users/:id/status (Admin Only)', () => {
    it('should allow admin to suspend user account status', async () => {
      const res = await authRequest(adminToken)
        .patch(`/api/v1/users/${customerUser.id}/status`)
        .send({ isActive: false })
        .expect(200);

      expect(res.body.success).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { id: customerUser.id },
      });
      expect(dbUser?.isActive).toBe(false);
    });

    it('should deny non-admin users from updating status', async () => {
      await authRequest(customerToken)
        .patch(`/api/v1/users/${customerUser.id}/status`)
        .send({ isActive: false })
        .expect(403);
    });
  });
});

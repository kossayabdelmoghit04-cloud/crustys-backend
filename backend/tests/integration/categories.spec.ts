import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createCategory } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';

describe('Categories Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();

    const adminSession = await loginAsAdmin();
    adminToken = adminSession.token;

    const customerSession = await loginAsCustomer();
    customerToken = customerSession.token;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /api/v1/categories', () => {
    it('should retrieve all active categories', async () => {
      await createCategory({ name: 'Desserts', isActive: true });
      await createCategory({ name: 'Drinks', isActive: true });

      const res = await request
        .get('/api/v1/categories')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.categories.length).toBe(2);
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    it('should retrieve a category by its ID', async () => {
      const category = await createCategory({ name: 'Burgers' });

      const res = await request
        .get(`/api/v1/categories/${category.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.category.id).toBe(category.id);
      expect(res.body.data.category.name).toBe('Burgers');
    });

    it('should return 404 if category does not exist', async () => {
      await request
        .get('/api/v1/categories/4fbf340c-255d-4f11-9a7f-689e24b74543')
        .expect(404);
    });
  });

  describe('GET /api/v1/categories/slug/:slug', () => {
    it('should retrieve a category by its slug', async () => {
      const category = await createCategory({ name: 'Pasta & Rice', slug: 'pasta-rice' });

      const res = await request
        .get('/api/v1/categories/slug/pasta-rice')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.category.id).toBe(category.id);
    });

    it('should return 404 for non-existent slug', async () => {
      await request
        .get('/api/v1/categories/slug/non-existent-slug')
        .expect(404);
    });
  });

  describe('POST /api/v1/categories', () => {
    it('should allow admin to create a category', async () => {
      const payload = {
        name: 'Sides',
        description: 'Delicious side dishes',
      };

      const res = await authRequest(adminToken)
        .post('/api/v1/categories')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.category.name).toBe('Sides');
      expect(res.body.data.category.slug).toBe('sides');
    });

    it('should fail creation with name too short', async () => {
      const payload = {
        name: 'A', // Too short, min is 2
      };

      await authRequest(adminToken)
        .post('/api/v1/categories')
        .send(payload)
        .expect(400);
    });

    it('should fail with duplicate category name', async () => {
      await createCategory({ name: 'Appetizers' });

      const payload = {
        name: 'Appetizers',
      };

      await authRequest(adminToken)
        .post('/api/v1/categories')
        .send(payload)
        .expect(400); // Unique constraint violation handled as bad request
    });

    it('should deny customer accounts from creating categories', async () => {
      const payload = {
        name: 'Salads',
      };

      await authRequest(customerToken)
        .post('/api/v1/categories')
        .send(payload)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    it('should allow admin to update category details', async () => {
      const category = await createCategory({ name: 'Drinks' });

      const res = await authRequest(adminToken)
        .patch(`/api/v1/categories/${category.id}`)
        .send({ name: 'Cold Drinks', description: 'Freshly squeezed juice and soda' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.category.name).toBe('Cold Drinks');
    });

    it('should deny customer from updating category', async () => {
      const category = await createCategory({ name: 'Desserts' });
      await authRequest(customerToken)
        .patch(`/api/v1/categories/${category.id}`)
        .send({ name: 'Hacked Desserts' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    it('should allow admin to delete a category', async () => {
      const category = await createCategory({ name: 'Wraps' });

      await authRequest(adminToken)
        .delete(`/api/v1/categories/${category.id}`)
        .expect(200);

      const dbCategory = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(dbCategory).toBeNull();
    });

    it('should deny customer from deleting a category', async () => {
      const category = await createCategory({ name: 'Soup' });
      await authRequest(customerToken)
        .delete(`/api/v1/categories/${category.id}`)
        .expect(403);
    });
  });
});

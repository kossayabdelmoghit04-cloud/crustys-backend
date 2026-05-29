import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createCategory, createProduct } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer, loginAsManager } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';

describe('Products Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let managerToken: string;

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

    const managerSession = await loginAsManager();
    managerToken = managerSession.token;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('GET /api/v1/products', () => {
    it('should retrieve a list of products', async () => {
      const category = await createCategory({ name: 'Pizza' });
      await createProduct({ categoryId: category.id, name: 'Margherita', price: 12.0 });
      await createProduct({ categoryId: category.id, name: 'Pepperoni', price: 15.0 });

      const res = await request
        .get('/api/v1/products')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.products).toBeDefined();
      expect(res.body.data.products.length).toBe(2);
    });

    it('should filter products by categoryId', async () => {
      const cat1 = await createCategory({ name: 'Burgers' });
      const cat2 = await createCategory({ name: 'Drinks' });
      await createProduct({ categoryId: cat1.id, name: 'Cheeseburger' });
      await createProduct({ categoryId: cat2.id, name: 'Coca Cola' });

      const res = await request
        .get(`/api/v1/products?categoryId=${cat1.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('Cheeseburger');
    });

    it('should search products by query text', async () => {
      await createProduct({ name: 'Garlic Bread' });
      await createProduct({ name: 'Onion Rings' });

      const res = await request
        .get('/api/v1/products?search=garlic')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].name).toBe('Garlic Bread');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should retrieve details of a specific product', async () => {
      const product = await createProduct({ name: 'Double Cheese' });

      const res = await request
        .get(`/api/v1/products/${product.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.product.id).toBe(product.id);
    });

    it('should return 404 if product does not exist', async () => {
      await request
        .get('/api/v1/products/4fbf340c-255d-4f11-9a7f-689e24b74543') // Valid UUID format
        .expect(404);
    });
  });

  describe('GET /api/v1/products/slug/:slug', () => {
    it('should retrieve a product by its unique slug', async () => {
      const product = await createProduct({ name: 'Unique Hot Dog', slug: 'unique-hot-dog' });

      const res = await request
        .get('/api/v1/products/slug/unique-hot-dog')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.product.id).toBe(product.id);
    });

    it('should return 404 if slug does not exist', async () => {
      await request
        .get('/api/v1/products/slug/non-existent-slug')
        .expect(404);
    });
  });

  describe('POST /api/v1/products', () => {
    let category: any;

    beforeEach(async () => {
      category = await createCategory();
    });

    it('should allow admin to create a new product', async () => {
      const payload = {
        categoryId: category.id,
        name: 'Veggie Pizza',
        price: 14.99,
        description: 'Fresh vegetables and mozzarella',
        stockQuantity: 20,
      };

      const res = await authRequest(adminToken)
        .post('/api/v1/products')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.product.name).toBe(payload.name);
      expect(res.body.data.product.slug).toBe('veggie-pizza');
    });

    it('should fail creation if discountPrice is greater than normal price', async () => {
      const payload = {
        categoryId: category.id,
        name: 'Spam Pizza',
        price: 10.0,
        discountPrice: 12.0, // Invalid! Discount should be less than regular price
      };

      await authRequest(adminToken)
        .post('/api/v1/products')
        .send(payload)
        .expect(400);
    });

    it('should deny customer accounts from creating products', async () => {
      const payload = {
        categoryId: category.id,
        name: 'Forbidden Fruit',
        price: 5.0,
      };

      await authRequest(customerToken)
        .post('/api/v1/products')
        .send(payload)
        .expect(403);
    });

    it('should allow manager with write:products permission to create products', async () => {
      const payload = {
        categoryId: category.id,
        name: 'Manager Special',
        price: 11.5,
      };

      await authRequest(managerToken)
        .post('/api/v1/products')
        .send(payload)
        .expect(201);
    });
  });

  describe('PATCH /api/v1/products/:id', () => {
    it('should allow admin to update product details', async () => {
      const product = await createProduct({ name: 'Old Product Name', price: 10.0 });
      const updatePayload = {
        name: 'Updated Product Name',
        price: 12.5,
      };

      const res = await authRequest(adminToken)
        .patch(`/api/v1/products/${product.id}`)
        .send(updatePayload)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.product.name).toBe(updatePayload.name);
      expect(res.body.data.product.price).toBe(updatePayload.price);
    });

    it('should fail update with negative price', async () => {
      const product = await createProduct({ name: 'Burger' });
      await authRequest(adminToken)
        .patch(`/api/v1/products/${product.id}`)
        .send({ price: -5.0 })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('should allow admin to delete a product', async () => {
      const product = await createProduct({ name: 'Temporary Product' });

      await authRequest(adminToken)
        .delete(`/api/v1/products/${product.id}`)
        .expect(200);

      const dbProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(dbProduct).toBeNull();
    });

    it('should deny customer accounts from deleting products', async () => {
      const product = await createProduct({ name: 'Valuable Product' });

      await authRequest(customerToken)
        .delete(`/api/v1/products/${product.id}`)
        .expect(403);
    });
  });
});

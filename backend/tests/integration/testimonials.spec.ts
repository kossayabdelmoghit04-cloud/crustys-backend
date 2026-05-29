import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { loginAsAdmin } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';

describe('Testimonials Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await seedTestDatabase();

    const adminSession = await loginAsAdmin();
    adminToken = adminSession.token;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('POST /api/v1/testimonials', () => {
    it('should successfully submit a testimonial', async () => {
      const payload = {
        customerName: 'Robert Plant',
        message: 'This is an absolutely amazing pizza place, loved the crust!',
        rating: 5,
      };

      const res = await request
        .post('/api/v1/testimonials')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.testimonial.id).toBeDefined();
      expect(res.body.data.testimonial.customerName).toBe(payload.customerName);
      expect(res.body.data.testimonial.isApproved).toBe(false); // Default should be unapproved (pending moderation)
    });

    it('should fail if message is too short', async () => {
      const payload = {
        customerName: 'Robert Plant',
        message: 'Too short', // Min is 10 chars
        rating: 5,
      };

      await request
        .post('/api/v1/testimonials')
        .send(payload)
        .expect(400);
    });

    it('should fail if rating is outside range 1-5', async () => {
      const payload = {
        customerName: 'Robert Plant',
        message: 'This is an absolutely amazing pizza place, loved the crust!',
        rating: 6, // Max is 5
      };

      await request
        .post('/api/v1/testimonials')
        .send(payload)
        .expect(400);
    });
  });

  describe('GET /api/v1/testimonials', () => {
    it('should retrieve list of testimonials (default filtering)', async () => {
      await prisma.testimonial.create({
        data: {
          customerName: 'Alice',
          message: 'Excellent food and service!',
          rating: 5,
          isApproved: true,
        },
      });
      await prisma.testimonial.create({
        data: {
          customerName: 'Bob',
          message: 'Not good, wait time was too long.',
          rating: 2,
          isApproved: false, // Unapproved
        },
      });

      const res = await request
        .get('/api/v1/testimonials')
        .expect(200);

      expect(res.body.status).toBe('success');
      // By default, public should only see approved testimonials
      expect(res.body.data.testimonials.length).toBe(1);
      expect(res.body.data.testimonials[0].customerName).toBe('Alice');
    });

    it('should support pagination and search query parameters', async () => {
      await prisma.testimonial.create({
        data: { customerName: 'Charlie', message: 'Fabulous location and staff.', rating: 4, isApproved: true },
      });

      const res = await request
        .get('/api/v1/testimonials?search=staff&page=1&limit=5')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.testimonials.length).toBe(1);
    });
  });

  describe('GET /api/v1/testimonials/:id (Admin Only)', () => {
    it('should retrieve a testimonial by its CUID', async () => {
      const testimonial = await prisma.testimonial.create({
        data: {
          customerName: 'David',
          message: 'Superb and fast delivery service!',
          rating: 5,
        },
      });

      const res = await authRequest(adminToken)
        .get(`/api/v1/testimonials/${testimonial.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.testimonial.id).toBe(testimonial.id);
    });

    it('should return 404 for non-existent CUID', async () => {
      await authRequest(adminToken)
        .get('/api/v1/testimonials/cjld2cyuq0000t3rx7abcde12') // Valid CUID format
        .expect(404);
    });
  });

  describe('PATCH /api/v1/testimonials/:id/approve (Admin Only)', () => {
    it('should allow admin to approve a testimonial', async () => {
      const testimonial = await prisma.testimonial.create({
        data: {
          customerName: 'Edward',
          message: 'Fantastic ambiance and cocktails!',
          rating: 4,
          isApproved: false,
        },
      });

      const res = await authRequest(adminToken)
        .patch(`/api/v1/testimonials/${testimonial.id}/approve`)
        .send({ isApproved: true })
        .expect(200);

      expect(res.body.status).toBe('success');

      const dbTestimonial = await prisma.testimonial.findUnique({ where: { id: testimonial.id } });
      expect(dbTestimonial?.isApproved).toBe(true);
    });
  });

  describe('DELETE /api/v1/testimonials/:id (Admin Only)', () => {
    it('should allow admin to delete a testimonial', async () => {
      const testimonial = await prisma.testimonial.create({
        data: {
          customerName: 'Frank',
          message: 'Terrible service, wont come back.',
          rating: 1,
        },
      });

      const res = await authRequest(adminToken)
        .delete(`/api/v1/testimonials/${testimonial.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');

      const dbTestimonial = await prisma.testimonial.findUnique({ where: { id: testimonial.id } });
      expect(dbTestimonial).toBeNull();
    });
  });
});

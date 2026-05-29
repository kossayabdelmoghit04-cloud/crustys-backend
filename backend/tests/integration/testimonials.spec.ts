import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { loginAsAdmin } from '../helpers/auth.helper';
import { expectApiResource, expectApiCollection } from '../helpers/response.helper';
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

      const testimonial = expectApiResource(res, 'testimonial');
      expect(testimonial.id).toBeDefined();
      expect(testimonial.customerName).toBe(payload.customerName);
      expect(testimonial.isApproved).toBe(false); // Default should be unapproved (pending moderation)
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

      const testimonials = expectApiCollection(res, 'testimonials');
      // By default, public should only see approved testimonials
      expect(testimonials.length).toBe(1);
      expect(testimonials[0].customerName).toBe('Alice');
    });

    it('should support pagination and search query parameters', async () => {
      await prisma.testimonial.create({
        data: { customerName: 'Charlie', message: 'Fabulous location and staff.', rating: 4, isApproved: true },
      });

      const res = await request
        .get('/api/v1/testimonials?search=staff&page=1&limit=5')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(1);
    });
  });

  // =====================================================
  // MULTI-FIELD SEARCH ENGINE TESTS
  // =====================================================
  describe('GET /api/v1/testimonials - Search Engine', () => {
    beforeEach(async () => {
      // Seed diverse testimonials for comprehensive search testing
      await prisma.testimonial.createMany({
        data: [
          {
            customerName: 'John Smith',
            message: 'The burgers here are absolutely incredible.',
            rating: 5,
            isApproved: true,
          },
          {
            customerName: 'Marie Dupont',
            message: 'Excellent staff and amazing delivery speed.',
            rating: 4,
            isApproved: true,
          },
          {
            customerName: 'Carlos Rivera',
            message: 'The pizza crust is the best in town.',
            rating: 5,
            isApproved: true,
          },
          {
            customerName: 'Sarah Jenkins',
            message: 'Loved the friendly staff and cozy atmosphere.',
            rating: 4,
            isApproved: true,
          },
          {
            customerName: 'Ahmed Hassan',
            message: 'Fast delivery and fresh ingredients every time.',
            rating: 5,
            isApproved: true,
          },
          {
            customerName: 'Unapproved User',
            message: 'This should not appear in public search results.',
            rating: 3,
            isApproved: false,
          },
        ],
      });
    });

    // --- Search by customer name ---
    it('should find testimonials by customer name', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=john')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(1);
      expect(testimonials[0].customerName).toBe('John Smith');
    });

    // --- Search by message content ---
    it('should find testimonials by message content', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=burgers')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(1);
      expect(testimonials[0].message).toContain('burgers');
    });

    // --- Case-insensitive search ---
    it('should perform case-insensitive search', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=DELIVERY')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBeGreaterThanOrEqual(2);
      testimonials.forEach((t: any) => {
        const combined = `${t.customerName} ${t.message}`.toLowerCase();
        expect(combined).toContain('delivery');
      });
    });

    // --- Partial word search ---
    it('should match partial words in search', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=staff')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(2); // Marie Dupont + Sarah Jenkins
      testimonials.forEach((t: any) => {
        expect(t.message.toLowerCase()).toContain('staff');
      });
    });

    // --- Multi-field matching (name OR message) ---
    it('should return results matching either name or message', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=carlos')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(1);
      expect(testimonials[0].customerName).toBe('Carlos Rivera');
    });

    // --- Search should respect isApproved default filter ---
    it('should not return unapproved testimonials in search results', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=unapproved')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(0);
    });

    // --- No results for non-matching query ---
    it('should return empty array for non-matching search', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=xyznonexistent')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.totalResults).toBe(0);
    });

    // --- Empty/whitespace search returns all approved ---
    it('should return all approved testimonials when search is empty', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(5); // All approved
    });

    // --- Search combined with rating filter ---
    it('should combine search with rating filter', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=staff&rating=4')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBe(2);
      testimonials.forEach((t: any) => {
        expect(t.rating).toBe(4);
        expect(t.message.toLowerCase()).toContain('staff');
      });
    });

    // --- Pagination works with search ---
    it('should paginate search results correctly', async () => {
      const res = await request
        .get('/api/v1/testimonials?search=the&page=1&limit=2')
        .expect(200);

      const testimonials = expectApiCollection(res, 'testimonials');
      expect(testimonials.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
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

      const dbTestimonial = expectApiResource(res, 'testimonial');
      expect(dbTestimonial.id).toBe(testimonial.id);
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


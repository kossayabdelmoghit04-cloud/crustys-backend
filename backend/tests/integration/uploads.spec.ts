import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';

describe('Uploads Integration Tests', () => {
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

  describe('POST /api/v1/uploads', () => {
    it('should successfully upload a single image as admin', async () => {
      const mockImageBuffer = Buffer.from('fake-image-binary-data');

      const res = await authRequest(adminToken)
        .post('/api/v1/uploads')
        .attach('image', mockImageBuffer, {
          filename: 'test-pizza.png',
          contentType: 'image/png',
        })
        .expect(202); // 202 Accepted because processing is delegated asynchronously

      expect(res.body.status).toBe('success');
      expect(res.body.data.jobId).toBeDefined();
    });

    it('should reject file upload with unauthorized MIME type', async () => {
      const mockTextBuffer = Buffer.from('hello world plain text');

      const res = await authRequest(adminToken)
        .post('/api/v1/uploads')
        .attach('image', mockTextBuffer, {
          filename: 'malicious.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      expect(res.body.status).not.toBe('success');
      expect(res.body.message).toContain('Type de fichier non autorisé');
    });

    it('should deny non-admin users from uploading files', async () => {
      const mockImageBuffer = Buffer.from('fake-image-binary-data');

      await authRequest(customerToken)
        .post('/api/v1/uploads')
        .attach('image', mockImageBuffer, {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/uploads/gallery', () => {
    it('should successfully upload multiple gallery images as admin', async () => {
      const mockImage1 = Buffer.from('img1');
      const mockImage2 = Buffer.from('img2');

      const res = await authRequest(adminToken)
        .post('/api/v1/uploads/gallery')
        .attach('images', mockImage1, { filename: 'g1.png', contentType: 'image/png' })
        .attach('images', mockImage2, { filename: 'g2.png', contentType: 'image/png' })
        .expect(202);

      expect(res.body.status).toBe('success');
      expect(res.body.data.jobs).toBeDefined();
    });

    it('should reject multiple upload if images count exceeds maximum (e.g. limit is 10)', async () => {
      const mockImage = Buffer.from('img');
      const req = authRequest(adminToken).post('/api/v1/uploads/gallery');

      // Attach 11 files (max allowed is 10)
      for (let i = 0; i < 11; i++) {
        req.attach('images', mockImage, { filename: `g${i}.png`, contentType: 'image/png' });
      }

      await req.expect(400);
    });
  });

  describe('GET /api/v1/uploads/status/:jobId', () => {
    it('should retrieve upload job status', async () => {
      // Job status routes should respond with 200 (if job exists or returns state)
      // Our mock bullmq Queue resolves job counts or status. Let's send a fake jobId
      const res = await authRequest(adminToken)
        .get('/api/v1/uploads/status/mock-job-id-123')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });
  });

  describe('GET /api/v1/uploads/metrics', () => {
    it('should allow admin to retrieve upload queue metrics', async () => {
      const res = await authRequest(adminToken)
        .get('/api/v1/uploads/metrics')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.queues.waiting).toBeDefined();
      expect(res.body.data.queues.active).toBeDefined();
    });
  });

  describe('DELETE /api/v1/uploads/:id', () => {
    it('should allow admin to delete uploaded media by metadata ID', async () => {
      const metadata = await prisma.mediaMetadata.create({
        data: {
          originalName: 'test-delete.png',
          format: 'png',
          size: 512,
          width: 200,
          height: 200,
          urls: { original: 'https://res.cloudinary.com/test-cloud/test.png' },
          variants: {},
          uploadDuration: 100,
          totalDuration: 150,
        },
      });

      const res = await authRequest(adminToken)
        .delete(`/api/v1/uploads/${metadata.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');

      const dbMeta = await prisma.mediaMetadata.findUnique({ where: { id: metadata.id } });
      expect(dbMeta).toBeNull();
    });
  });

  describe('POST /api/v1/uploads/retry/:jobId', () => {
    it('should allow admin to retry a failed job', async () => {
      await prisma.failedUpload.create({
        data: {
          jobId: 'failed-job-123',
          originalName: 'failed.png',
          prefix: 'test-retry',
          errorReason: 'Cloudinary Timeout',
          attempts: 2,
        },
      });

      const res = await authRequest(adminToken)
        .post('/api/v1/uploads/retry/failed-job-123')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('réinjectée');
    });
  });
});

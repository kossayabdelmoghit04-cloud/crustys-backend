import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { prisma } from '../../src/utils/prisma';

describe('Contacts Integration Tests', () => {
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

  describe('POST /api/v1/contacts', () => {
    it('should successfully submit a valid contact form', async () => {
      const payload = {
        fullName: 'Test User',
        email: 'TEST@example.com',
        subject: 'General Question',
        message: 'Hello, this is a valid test message of at least ten characters.',
      };

      const res = await request
        .post('/api/v1/contacts')
        .send(payload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Contact message sent successfully');
      expect(res.body.data.contact).toBeDefined();
      expect(res.body.data.contact.fullName).toBe('Test User');
      expect(res.body.data.contact.email).toBe('test@example.com'); // lowercasing check
      expect(res.body.data.contact.subject).toBe('General Question');
      expect(res.body.data.contact.message).toBe('Hello, this is a valid test message of at least ten characters.');

      // Check state in DB
      const dbContact = await prisma.contact.findUnique({
        where: { id: res.body.data.contact.id },
      });
      expect(dbContact).toBeDefined();
      expect(dbContact?.fullName).toBe('Test User');
      expect(dbContact?.email).toBe('test@example.com');
    });

    it('should fail if email format is invalid', async () => {
      const payload = {
        fullName: 'Test User',
        email: 'invalid-email',
        subject: 'General Question',
        message: 'Hello, this is a valid test message of at least ten characters.',
      };

      await request
        .post('/api/v1/contacts')
        .send(payload)
        .expect(400);
    });

    it('should fail if message is too short', async () => {
      const payload = {
        fullName: 'Test User',
        email: 'test@example.com',
        subject: 'General Question',
        message: 'Short', // Under 10 chars
      };

      await request
        .post('/api/v1/contacts')
        .send(payload)
        .expect(400);
    });

    it('should fail if fullName is too short', async () => {
      const payload = {
        fullName: 'A', // Under 2 chars
        email: 'test@example.com',
        subject: 'General Question',
        message: 'Hello, this is a valid test message of at least ten characters.',
      };

      await request
        .post('/api/v1/contacts')
        .send(payload)
        .expect(400);
    });
  });
});

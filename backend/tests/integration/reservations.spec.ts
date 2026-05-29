import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createReservation } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';
import { ReservationStatus } from '@prisma/client';

describe('Reservations Integration Tests', () => {
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

  describe('POST /api/v1/reservations', () => {
    it('should successfully create a new reservation as a public user', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const payload = {
        customerName: 'Alice Cooper',
        customerPhone: '5149876543',
        customerEmail: 'alice@example.com',
        reservationDate: dateStr,
        reservationTime: '19:00',
        guestsCount: 4,
        notes: 'Near the fireplace',
      };

      const res = await request
        .post('/api/v1/reservations')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.reservation.id).toBeDefined();
      expect(res.body.data.reservation.customerName).toBe(payload.customerName);
      expect(res.body.data.reservation.status).toBe(ReservationStatus.PENDING);
    });

    it('should fail if reservation date is in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      const payload = {
        customerName: 'Alice Cooper',
        customerPhone: '5149876543',
        reservationDate: dateStr,
        reservationTime: '19:00',
        guestsCount: 4,
      };

      const res = await request
        .post('/api/v1/reservations')
        .send(payload)
        .expect(400);

      expect(res.body.status).not.toBe('success');
    });

    it('should fail if reservation time is outside open hours (e.g. 08:00)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const payload = {
        customerName: 'Alice Cooper',
        customerPhone: '5149876543',
        reservationDate: dateStr,
        reservationTime: '08:00', // Opens at 10:00
        guestsCount: 4,
      };

      await request
        .post('/api/v1/reservations')
        .send(payload)
        .expect(400);
    });

    it('should fail to book if slot capacity is full (20 reservations)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      const reservationDate = new Date(dateStr);
      reservationDate.setHours(0, 0, 0, 0);

      // Create 20 reservations for that slot
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          prisma.reservation.create({
            data: {
              customerName: `Customer ${i}`,
              customerPhone: '5140000000',
              reservationDate,
              reservationTime: '19:00',
              guestsCount: 2,
              status: ReservationStatus.PENDING,
            },
          })
        );
      }
      await Promise.all(promises);

      const payload = {
        customerName: 'Alice Cooper',
        customerPhone: '5149876543',
        reservationDate: dateStr,
        reservationTime: '19:00',
        guestsCount: 4,
      };

      const res = await request
        .post('/api/v1/reservations')
        .send(payload)
        .expect(400);

      expect(res.body.message).toContain('limite de tables réservées est atteinte');
    });
  });

  describe('GET /api/v1/reservations (Admin Only)', () => {
    it('should allow admin to list all reservations with pagination', async () => {
      await createReservation({ customerName: 'Res 1' });
      await createReservation({ customerName: 'Res 2' });

      const res = await authRequest(adminToken)
        .get('/api/v1/reservations')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.reservations.length).toBe(2);
    });

    it('should deny customer accounts from listing reservations', async () => {
      await authRequest(customerToken)
        .get('/api/v1/reservations')
        .expect(403);
    });
  });

  describe('GET /api/v1/reservations/:id (Admin Only)', () => {
    it('should retrieve reservation details', async () => {
      const reservation = await createReservation();

      const res = await authRequest(adminToken)
        .get(`/api/v1/reservations/${reservation.id}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.reservation.id).toBe(reservation.id);
    });

    it('should return 404 for non-existent reservation ID', async () => {
      await authRequest(adminToken)
        .get('/api/v1/reservations/4fbf340c-255d-4f11-9a7f-689e24b74543')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/reservations/:id (Admin Only)', () => {
    it('should allow admin to update details and status', async () => {
      const reservation = await createReservation({ status: ReservationStatus.PENDING });

      const res = await authRequest(adminToken)
        .patch(`/api/v1/reservations/${reservation.id}`)
        .send({ status: ReservationStatus.CONFIRMED })
        .expect(200);

      expect(res.body.status).toBe('success');
      
      const dbRes = await prisma.reservation.findUnique({ where: { id: reservation.id } });
      expect(dbRes?.status).toBe(ReservationStatus.CONFIRMED);
    });
  });

  describe('DELETE /api/v1/reservations/:id (Admin Only)', () => {
    it('should allow admin to delete a reservation', async () => {
      const reservation = await createReservation();

      await authRequest(adminToken)
        .delete(`/api/v1/reservations/${reservation.id}`)
        .expect(200);

      const dbRes = await prisma.reservation.findUnique({ where: { id: reservation.id } });
      expect(dbRes).toBeNull();
    });
  });
});

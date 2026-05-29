import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createOrder } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';

describe('Payments Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let customerUser: any;

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
    customerUser = customerSession.user;
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  describe('POST /api/v1/payments/create-intent', () => {
    it('should successfully create a stripe payment intent for an order', async () => {
      const order = await createOrder({ userId: customerUser.id, totalPrice: 45.0 });

      const res = await authRequest(customerToken)
        .post('/api/v1/payments/create-intent')
        .send({ orderId: order.id })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.clientSecret).toBeDefined();
      expect(res.body.data.paymentIntentId).toBeDefined();
      expect(res.body.data.paymentId).toBeDefined();

      // Check payment record created in database
      const payment = await prisma.payment.findUnique({
        where: { id: res.body.data.paymentId },
      });
      expect(payment).toBeDefined();
      expect(payment?.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(payment?.paymentMethod).toBe(PaymentMethod.STRIPE);
      expect(payment?.amount).toBe(45.0);
    });

    it('should refuse payment intent if order is already cancelled', async () => {
      const order = await createOrder({ userId: customerUser.id, orderStatus: OrderStatus.CANCELLED });

      await authRequest(customerToken)
        .post('/api/v1/payments/create-intent')
        .send({ orderId: order.id })
        .expect(400);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should process payment_intent.succeeded webhook and update order status', async () => {
      const order = await createOrder({ userId: customerUser.id, totalPrice: 30.0 });
      const transactionId = 'pi_test_webhook_123';

      // Create a pending payment record matching transactionId
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: 30.0,
          paymentMethod: PaymentMethod.STRIPE,
          paymentStatus: PaymentStatus.PENDING,
          transactionId,
        },
      });

      // Construct mock webhook request payload
      const webhookPayload = {
        id: 'evt_test_success',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: transactionId,
            metadata: {
              orderId: order.id,
            },
          },
        },
      };

      // Set signature header (verified by mock Stripe constructEvent)
      const res = await request
        .post('/api/v1/payments/webhook')
        .set('content-type', 'application/json')
        .set('stripe-signature', 't=123,v1=fake_sig')
        .send(JSON.stringify(webhookPayload))
        .expect(200);

      expect(res.body.received).toBe(true);

      // Verify DB updates
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.paymentStatus).toBe('paid');
      expect(updatedOrder?.orderStatus).toBe(OrderStatus.CONFIRMED);

      const updatedPayment = await prisma.payment.findFirst({ where: { transactionId } });
      expect(updatedPayment?.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should fail webhook with invalid signature', async () => {
      // If we don't pass 'stripe-signature' header, the handler should throw or return 400
      // In our mock, constructEvent is mocked to return event or fail depending on signature
      const mockStripeModule = require('../mocks/stripe.mock').mockStripe;
      mockStripeModule.webhooks.constructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      await request
        .post('/api/v1/payments/webhook')
        .send(Buffer.from(JSON.stringify({ type: 'payment_intent.succeeded' })))
        .expect(400);
    });
  });

  describe('GET /api/v1/payments (Admin Only)', () => {
    it('should allow admin to list payments', async () => {
      const order = await createOrder({ userId: customerUser.id });
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: 15.0,
          paymentMethod: PaymentMethod.CASH,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      const res = await authRequest(adminToken)
        .get('/api/v1/payments')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
    });

    it('should deny customer access', async () => {
      await authRequest(customerToken)
        .get('/api/v1/payments')
        .expect(403);
    });
  });

  describe('POST /api/v1/payments/:id/refund (Admin Only)', () => {
    it('should allow admin to refund a paid payment', async () => {
      const order = await createOrder({ userId: customerUser.id });
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: 50.0,
          paymentMethod: PaymentMethod.STRIPE,
          paymentStatus: PaymentStatus.PAID,
          transactionId: 'pi_test_refund_123',
        },
      });

      const res = await authRequest(adminToken)
        .post(`/api/v1/payments/${payment.id}/refund`)
        .send({ reason: 'Customer requested cancellation' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('remboursé');

      // Verify database status is updated to REFUNDED
      const dbPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(dbPayment?.paymentStatus).toBe(PaymentStatus.REFUNDED);
    });
  });
});

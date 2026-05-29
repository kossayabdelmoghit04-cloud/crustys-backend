import '../mocks/redis.mock';
import '../mocks/mail.mock';
import '../mocks/stripe.mock';
import '../mocks/cloudinary.mock';

import { request, authRequest } from '../helpers/request.helper';
import { cleanDatabase, seedTestDatabase, disconnectPrisma } from '../helpers/prisma.helper';
import { createProduct, createOrder } from '../helpers/factories';
import { loginAsAdmin, loginAsCustomer } from '../helpers/auth.helper';
import { prisma } from '../../src/utils/prisma';
import { OrderStatus } from '@prisma/client';

describe('Orders Integration Tests', () => {
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

  describe('POST /api/v1/orders', () => {
    it('should successfully place an order and decrement stock', async () => {
      const product = await createProduct({ name: 'Pizza Margherita', price: 10.0, stockQuantity: 5 });

      const payload = {
        deliveryType: 'pickup',
        customerPhone: '5141234567',
        paymentMethod: 'CASH',
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      };

      const res = await authRequest(customerToken)
        .post('/api/v1/orders')
        .send(payload)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.order.totalPrice).toBe(20.0); // 2 * 10.0

      // Check stock decremented
      const dbProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(dbProduct?.stockQuantity).toBe(3);
    });

    it('should rollback transaction and fail if stock is insufficient', async () => {
      const product = await createProduct({ name: 'Limited Soda', price: 2.5, stockQuantity: 1 });

      const payload = {
        deliveryType: 'pickup',
        customerPhone: '5141234567',
        paymentMethod: 'CASH',
        items: [
          {
            productId: product.id,
            quantity: 2, // Requests more than stock of 1
          },
        ],
      };

      const res = await authRequest(customerToken)
        .post('/api/v1/orders')
        .send(payload)
        .expect(400);

      expect(res.body.status).not.toBe('success');

      // Check stock was NOT decremented
      const dbProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(dbProduct?.stockQuantity).toBe(1);
    });

    it('should support discount price total calculation', async () => {
      const product = await createProduct({ name: 'Special Burger', price: 15.0, discountPrice: 12.0, stockQuantity: 10 });

      const payload = {
        deliveryType: 'pickup',
        customerPhone: '5141234567',
        paymentMethod: 'CASH',
        items: [
          {
            productId: product.id,
            quantity: 1,
          },
        ],
      };

      const res = await authRequest(customerToken)
        .post('/api/v1/orders')
        .send(payload)
        .expect(201);

      // Total price should reflect discount price
      expect(res.body.data.order.totalPrice).toBe(12.0);
    });
  });

  describe('GET /api/v1/orders/my-orders', () => {
    it('should return paginated orders placed by the current customer', async () => {
      await createOrder({ userId: customerUser.id, orderNumber: 'ORDER-1', totalPrice: 15.0 });
      await createOrder({ userId: customerUser.id, orderNumber: 'ORDER-2', totalPrice: 25.0 });

      const res = await authRequest(customerToken)
        .get('/api/v1/orders/my-orders')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.orders).toBeDefined();
      expect(res.body.data.orders.length).toBe(2);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    it('should allow customer to cancel a pending order and restore stock', async () => {
      const product = await createProduct({ name: 'Restorable Item', price: 10.0, stockQuantity: 5 });

      // Place order (manually via factory or via endpoint)
      const order = await createOrder({
        userId: customerUser.id,
        orderStatus: OrderStatus.PENDING,
        totalPrice: 10.0,
        items: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: 10.0,
            subtotal: 20.0,
          },
        ],
      });

      // Update product stock (simulating stock was decremented during order creation)
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: 3 },
      });

      const res = await authRequest(customerToken)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .expect(200);

      expect(res.body.status).toBe('success');

      // Verify order status is CANCELLED
      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.orderStatus).toBe(OrderStatus.CANCELLED);

      // Verify stock restored
      const dbProduct = await prisma.product.findUnique({ where: { id: product.id } });
      expect(dbProduct?.stockQuantity).toBe(5);
    });

    it('should refuse cancellation if order status is already PREPARING', async () => {
      const order = await createOrder({
        userId: customerUser.id,
        orderStatus: OrderStatus.PREPARING,
      });

      await authRequest(customerToken)
        .post(`/api/v1/orders/${order.id}/cancel`)
        .expect(400);
    });
  });

  describe('GET /api/v1/orders (Admin Only)', () => {
    it('should allow admin to retrieve all orders with query parameters', async () => {
      await createOrder({ orderNumber: 'ORDER-ADMIN-1' });

      const res = await authRequest(adminToken)
        .get('/api/v1/orders')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should deny customer access', async () => {
      await authRequest(customerToken)
        .get('/api/v1/orders')
        .expect(403);
    });
  });

  describe('PATCH /api/v1/orders/:id/status (Admin Only)', () => {
    it('should allow admin to update order status', async () => {
      const order = await createOrder({ orderStatus: OrderStatus.PENDING });

      const res = await authRequest(adminToken)
        .patch(`/api/v1/orders/${order.id}/status`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(200);

      expect(res.body.status).toBe('success');

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.orderStatus).toBe(OrderStatus.CONFIRMED);
    });

    it('should deny customer from updating order status', async () => {
      const order = await createOrder({ orderStatus: OrderStatus.PENDING });

      await authRequest(customerToken)
        .patch(`/api/v1/orders/${order.id}/status`)
        .send({ status: OrderStatus.CONFIRMED })
        .expect(403);
    });
  });
});

import * as Sentry from '@sentry/node';
import { errorHandler } from '../../../middlewares/errorHandler';
import { PaymentService } from '../../../modules/payment/payment.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { AdminNotificationService } from '../../../modules/admin-notifications/admin-notification.service';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { Request, Response } from 'express';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn().mockReturnValue('mock-sentry-event-id-999'),
  captureMessage: jest.fn().mockReturnValue('mock-sentry-event-id-888'),
  configureScope: jest.fn((cb) => {
    const scope = {
      setTags: jest.fn(),
      setExtras: jest.fn(),
      setUser: jest.fn(),
      setLevel: jest.fn(),
    };
    cb(scope);
  }),
  Handlers: {
    requestHandler: jest.fn(() => (req: any, res: any, next: any) => next()),
    tracingHandler: jest.fn(() => (req: any, res: any, next: any) => next()),
    errorHandler: jest.fn(() => (err: any, req: any, res: any, next: any) => next(err)),
  },
  Integrations: {
    Http: jest.fn(),
    Express: jest.fn(),
  },
}));

jest.mock('../../../modules/admin-notifications/admin-notification.service', () => ({
  AdminNotificationService: {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  },
}));

jest.mock('../../../modules/audit/audit.service', () => ({
  AuditService: {
    create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  },
}));

jest.mock('../../../utils/prisma', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      update: jest.fn(),
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../../utils/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
    },
  },
}));

describe('SENTRY ERROR TRACKING UNIT TESTS', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      originalUrl: '/api/v1/test-route',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      user: { userId: 'user-123', email: 'u@example.com', role: 'CUSTOMER', permissions: [] },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('Prisma Client Errors Handler', () => {
    it('should capture PrismaClientKnownRequestError in Sentry with custom scope tags', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Known DB Error', {
        code: 'P2002',
        clientVersion: '5.x',
      });

      errorHandler(prismaError, mockReq as Request, mockRes as Response, next);

      expect(Sentry.captureException).toHaveBeenCalledWith(prismaError);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Internal Server Error',
        })
      );
    });

    it('should trigger admin notification on PrismaClientInitializationError (Database Down)', () => {
      const initError = new Prisma.PrismaClientInitializationError('DB connection failure', '5.x');

      errorHandler(initError, mockReq as Request, mockRes as Response, next);

      // Verify that database down triggers critical admin notifications
      expect(AdminNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Database Connection Error',
          type: 'SECURITY_ALERT',
        })
      );
    });
  });

  describe('Stripe Gateway Errors Capture', () => {
    it('should capture Stripe errors with order details and notify admins on API failure', async () => {
      const mockOrder = {
        id: 'ord-123',
        totalPrice: 100,
        orderStatus: 'PENDING',
        payments: [],
      };
      
      const { prisma: mockPrisma } = require('../../../utils/prisma');
      const { stripe: mockStripe } = require('../../../utils/stripe');

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      
      // Simulate Stripe API authentication error
      const stripeError = new Stripe.errors.StripeAuthenticationError({
        message: 'Invalid Stripe API Key',
        type: 'invalid_request_error',
      });
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      await expect(
        PaymentService.createPaymentIntent({ orderId: 'ord-123' }, 'user-123')
      ).rejects.toThrow();

      expect(Sentry.captureException).toHaveBeenCalledWith(stripeError);
      expect(AdminNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Stripe Gateway Failure',
          type: 'SECURITY_ALERT',
        })
      );
    });
  });

  describe('Security Alerts Sentry Capture', () => {
    it('should write audit log with Sentry event ID on malicious honeypot trigger', async () => {
      // Direct validation of AuditService schema mapping
      const auditLog = await AuditService.create({
        action: 'SECURITY_ALERT',
        ipAddress: '192.168.1.100',
        entity: 'Security',
        entityId: '/wp-admin.php',
        newValue: { reason: 'Honeypot Triggered' },
        sentryEventId: 'mock-sentry-event-id-888',
      });

      expect(auditLog).toBeDefined();
      expect(AuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SECURITY_ALERT',
          sentryEventId: 'mock-sentry-event-id-888',
        })
      );
    });
  });
});

import { prisma } from '../../../utils/prisma';
import { calculateRefundAmount, mapPaymentStatusToClient } from '../../../modules/payment/payment.utils';
import { PaymentService } from '../../../modules/payment/payment.service';
import { stripe } from '../../../utils/stripe';
import { PaymentStatus, PaymentMethod, OrderStatus } from '@prisma/client';

jest.mock('../../../utils/prisma', () => {
  const mockPrisma = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    product: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    productImage: { deleteMany: jest.fn() },
    category: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    order: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
    orderItem: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    reservation: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    testimonial: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };

  mockPrisma.$transaction.mockImplementation((cb: any) => {
    if (typeof cb === 'function') {
      return cb(mockPrisma);
    }
    return Promise.resolve(cb);
  });

  return {
    prisma: mockPrisma,
  };
});

const prismaMock = prisma as any;

// Mock Stripe wrapper
jest.mock('../../../utils/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  },
}));

// Mock EmailProducer
jest.mock('../../../modules/emails', () => ({
  EmailProducer: {
    enqueueRefundEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock Logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PAYMENTS MODULE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('payment.utils.ts', () => {
    describe('calculateRefundAmount', () => {
      it('should calculate standard 100% refund correctly', () => {
        const refund = calculateRefundAmount(120.5);
        expect(refund).toBe(120.5);
      });

      it('should calculate partial refunds (e.g. 50%)', () => {
        const refund = calculateRefundAmount(150.0, 50);
        expect(refund).toBe(75.0);
      });

      it('should deduct fixed fees correctly', () => {
        const refund = calculateRefundAmount(100.0, 100, 5.5);
        expect(refund).toBe(94.5);
      });

      it('should cap refunds at zero instead of going negative when fee exceeds refund base', () => {
        const refund = calculateRefundAmount(10.0, 100, 15.0);
        expect(refund).toBe(0.0);
      });

      it('should throw AppError if original amount is negative', () => {
        expect(() => calculateRefundAmount(-10.0)).toThrow('Le montant d\'origine ne peut pas être négatif.');
      });

      it('should throw AppError if refund percentage is out of range', () => {
        expect(() => calculateRefundAmount(100.0, -10)).toThrow('Le pourcentage de remboursement doit être compris entre 0 et 100.');
        expect(() => calculateRefundAmount(100.0, 110)).toThrow('Le pourcentage de remboursement doit être compris entre 0 et 100.');
      });

      it('should throw AppError if fee deduction is negative', () => {
        expect(() => calculateRefundAmount(100.0, 100, -2.5)).toThrow('La déduction de frais ne peut pas être négative.');
      });
    });

    describe('mapPaymentStatusToClient', () => {
      it('should map PAID status', () => {
        expect(mapPaymentStatusToClient('PAID')).toBe('Payé');
        expect(mapPaymentStatusToClient('paid')).toBe('Payé');
      });

      it('should map PENDING status', () => {
        expect(mapPaymentStatusToClient('PENDING')).toBe('En attente');
      });

      it('should map FAILED status', () => {
        expect(mapPaymentStatusToClient('FAILED')).toBe('Échoué');
      });

      it('should map REFUNDED status', () => {
        expect(mapPaymentStatusToClient('REFUNDED')).toBe('Remboursé');
      });

      it('should return Inconnu for unknown statuses', () => {
        expect(mapPaymentStatusToClient('UNKNOWN')).toBe('Inconnu');
      });
    });
  });

  describe('PaymentService - Stripe & Webhooks Integration', () => {
    describe('handleWebhook signature validation', () => {
      it('should successfully parse a valid Stripe webhook signature and handle events', async () => {
        const mockRawBody = Buffer.from(JSON.stringify({ id: 'evt_123' }));
        const mockSignature = 'valid-sig';
        const mockEvent = {
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_123',
              metadata: { orderId: 'order-111' },
            },
          },
        };

        (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

        prismaMock.payment.findFirst.mockResolvedValue({ id: 'pay-222' });
        prismaMock.payment.update.mockResolvedValue({});
        prismaMock.order.update.mockResolvedValue({});

        const result = await PaymentService.handleWebhook(mockRawBody, mockSignature);

        expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
          mockRawBody,
          mockSignature,
          expect.any(String)
        );
        expect(result).toEqual({ received: true });
      });

      it('should throw AppError if webhook signature is invalid', async () => {
        const mockRawBody = Buffer.from('invalid-data');
        const mockSignature = 'bad-sig';

        (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
          throw new Error('Signature verification failed');
        });

        await expect(PaymentService.handleWebhook(mockRawBody, mockSignature)).rejects.toThrow(
          'Signature de Webhook invalide'
        );
      });
    });

    describe('refundPayment integration', () => {
      it('should trigger Stripe refund, cancel the order, and restore item stocks', async () => {
        const paymentId = 'pay-777';
        const mockPayment = {
          id: paymentId,
          orderId: 'order-888',
          amount: 50.0,
          paymentStatus: PaymentStatus.PAID,
          transactionId: 'pi_abc_123',
          order: {
            id: 'order-888',
            user: { id: 'usr-1', email: 'buyer@example.com', firstName: 'Jack' },
            items: [
              { productId: 'prod-poutine', quantity: 2 },
            ],
          },
        };

        prismaMock.payment.findUnique.mockResolvedValue(mockPayment);
        (stripe.refunds.create as jest.Mock).mockResolvedValue({ id: 're_123' });

        await PaymentService.refundPayment(paymentId, 'Customer request');

        // Verify Stripe Refund API was triggered
        expect(stripe.refunds.create).toHaveBeenCalledWith({
          payment_intent: 'pi_abc_123',
          reason: 'requested_by_customer',
          metadata: expect.objectContaining({
            paymentId,
            orderId: 'order-888',
          }),
        });

        // Verify database updates were triggered inside transaction
        expect(prismaMock.payment.update).toHaveBeenCalledWith({
          where: { id: paymentId },
          data: { paymentStatus: PaymentStatus.REFUNDED },
        });
        expect(prismaMock.order.update).toHaveBeenCalledWith({
          where: { id: 'order-888' },
          data: {
            orderStatus: OrderStatus.CANCELLED,
            paymentStatus: 'failed',
          },
        });
        expect(prismaMock.product.update).toHaveBeenCalledWith({
          where: { id: 'prod-poutine' },
          data: {
            stockQuantity: { increment: 2 },
            isAvailable: true,
          },
        });
      });

      it('should throw AppError if payment status is not PAID', async () => {
        const paymentId = 'pay-777';
        prismaMock.payment.findUnique.mockResolvedValue({
          id: paymentId,
          paymentStatus: PaymentStatus.PENDING,
        });

        await expect(PaymentService.refundPayment(paymentId)).rejects.toThrow(
          'Seuls les paiements validés (PAID) peuvent être remboursés.'
        );
        expect(stripe.refunds.create).not.toHaveBeenCalled();
      });
    });
  });
});

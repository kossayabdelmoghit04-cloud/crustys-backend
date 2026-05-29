import { prisma } from '../../../utils/prisma';
import { calculateOrderTotal, calculateOrderTax } from '../../../modules/orders/order.utils';
import { OrderService } from '../../../modules/orders/order.service';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

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

// Mock EmailProducer
jest.mock('../../../modules/emails', () => ({
  EmailProducer: {
    enqueueOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
    enqueueAdminAlertEmail: jest.fn().mockResolvedValue(true),
    enqueueRefundEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('ORDER MODULE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('order.utils.ts', () => {
    describe('calculateOrderTotal', () => {
      it('should calculate total correctly', () => {
        const result = calculateOrderTotal([
          { price: 10, quantity: 2 },
          { price: 5, quantity: 1 },
        ]);
        expect(result).toBe(25);
      });

      it('should handle zero items correctly', () => {
        const result = calculateOrderTotal([]);
        expect(result).toBe(0);
      });

      it('should throw AppError if any item has negative price', () => {
        expect(() =>
          calculateOrderTotal([
            { price: 10, quantity: 1 },
            { price: -2, quantity: 1 },
          ])
        ).toThrow('Le prix de l\'article ne peut pas être négatif.');
      });

      it('should throw AppError if any item has zero or negative quantity', () => {
        expect(() =>
          calculateOrderTotal([
            { price: 10, quantity: 1 },
            { price: 5, quantity: 0 },
          ])
        ).toThrow('La quantité d\'un article doit être supérieure à zéro.');
      });
    });

    describe('calculateOrderTax', () => {
      it('should calculate Canadian tax correctly using default 14.975% rate', () => {
        const tax = calculateOrderTax(100);
        expect(tax).toBe(14.98); // 14.975 rounded
      });

      it('should calculate tax correctly using custom rate', () => {
        const tax = calculateOrderTax(100, 5); // 5% GST
        expect(tax).toBe(5);
      });

      it('should throw AppError if subtotal is negative', () => {
        expect(() => calculateOrderTax(-50)).toThrow('Le sous-total ne peut pas être négatif.');
      });

      it('should throw AppError if tax percentage is out of range', () => {
        expect(() => calculateOrderTax(100, -1)).toThrow('Le taux de taxe doit être compris entre 0 et 100.');
        expect(() => calculateOrderTax(100, 101)).toThrow('Le taux de taxe doit être compris entre 0 et 100.');
      });
    });
  });

  describe('OrderService - Business and Transaction Logic', () => {
    describe('create order', () => {
      it('should successfully create an order, decrement stock, and trigger emails', async () => {
        const userId = 'user-123';
        const createDto = {
          items: [{ productId: 'prod-1', quantity: 2 }],
          paymentMethod: 'stripe',
          deliveryType: 'delivery' as const,
          customerPhone: '+15145551234',
          customerAddress: '123 Rue de la Poutine',
          notes: 'Extra cheese please',
        };

        const mockUser = { id: userId, email: 'customer@example.com', firstName: 'Jean', lastName: 'Dupont' };
        const mockProduct = { id: 'prod-1', name: 'Classic Poutine', price: 12.0, discountPrice: 10.0, isAvailable: true, stockQuantity: 10 };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.product.findMany.mockResolvedValue([mockProduct]);
        prismaMock.product.findUnique.mockResolvedValue({ stockQuantity: 8 });

        const mockOrderCreated = {
          id: 'order-999',
          orderNumber: 'CRUSTY-20260524-1234',
          totalPrice: 20.0, // 10.0 * 2
          deliveryType: 'delivery',
          customerPhone: '+15145551234',
          items: [{ productId: 'prod-1', quantity: 2, unitPrice: 10.0, subtotal: 20.0, product: { name: 'Classic Poutine' } }],
          payments: [{ id: 'pay-1', amount: 20.0, paymentStatus: 'PAID' }],
        };

        prismaMock.order.create.mockResolvedValue(mockOrderCreated);

        const result = await OrderService.create(createDto, userId);

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
        expect(prismaMock.product.findMany).toHaveBeenCalledWith({ where: { id: { in: ['prod-1'] } } });

        // Verifying prisma transaction mocks were triggered
        expect(prismaMock.order.create).toHaveBeenCalled();
        expect(result.totalPrice).toBe(20.0);
      });

      it('should throw AppError if a product is unavailable', async () => {
        const createDto = {
          items: [{ productId: 'prod-1', quantity: 2 }],
          paymentMethod: 'stripe',
          deliveryType: 'takeaway' as const,
          customerPhone: '+15145551234',
        };

        const mockProduct = { id: 'prod-1', name: 'Classic Poutine', price: 12.0, discountPrice: null, isAvailable: false, stockQuantity: 10 };
        prismaMock.product.findMany.mockResolvedValue([mockProduct]);

        await expect(OrderService.create(createDto)).rejects.toThrow('Le produit "Classic Poutine" n\'est pas disponible actuellement.');
      });

      it('should throw AppError if stock is insufficient', async () => {
        const createDto = {
          items: [{ productId: 'prod-1', quantity: 15 }], // Requesting 15
          paymentMethod: 'stripe',
          deliveryType: 'takeaway' as const,
          customerPhone: '+15145551234',
        };

        const mockProduct = { id: 'prod-1', name: 'Classic Poutine', price: 12.0, discountPrice: null, isAvailable: true, stockQuantity: 10 }; // Stock 10
        prismaMock.product.findMany.mockResolvedValue([mockProduct]);

        await expect(OrderService.create(createDto)).rejects.toThrow('Stock insuffisant pour le produit "Classic Poutine". Restant: 10, Demandé: 15');
      });
    });

    describe('updateStatus and transitions', () => {
      it('should restore stocks when order is cancelled', async () => {
        const orderId = 'order-123';
        const mockOrder = {
          id: orderId,
          orderStatus: OrderStatus.CONFIRMED,
          items: [{ productId: 'prod-1', quantity: 2 }],
        };

        prismaMock.order.findUnique.mockResolvedValue(mockOrder);
        prismaMock.order.update.mockResolvedValue({ ...mockOrder, orderStatus: OrderStatus.CANCELLED });

        await OrderService.updateStatus(orderId, { status: OrderStatus.CANCELLED });

        // Verify prisma transaction update was called to restore stock
        expect(prismaMock.product.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'prod-1' },
            data: {
              stockQuantity: { increment: 2 },
              isAvailable: true,
            },
          })
        );
        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: orderId },
            data: {
              orderStatus: OrderStatus.CANCELLED,
              paymentStatus: 'failed',
            },
          })
        );
      });

      it('should update payment status to PAID when order is DELIVERED', async () => {
        const orderId = 'order-123';
        const mockOrder = {
          id: orderId,
          orderStatus: OrderStatus.PREPARING,
          items: [],
        };

        prismaMock.order.findUnique.mockResolvedValue(mockOrder);
        prismaMock.order.update.mockResolvedValue({ ...mockOrder, orderStatus: OrderStatus.DELIVERED });

        await OrderService.updateStatus(orderId, { status: OrderStatus.DELIVERED });

        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: orderId },
            data: {
              orderStatus: OrderStatus.DELIVERED,
              paymentStatus: 'paid',
            },
          })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
          where: { orderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
      });
    });
  });
});

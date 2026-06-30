import { prisma } from '../../../utils/prisma';
import { StockAlertService } from '../../../modules/stock-alerts/stock-alert.service';
import { AdminNotificationService } from '../../../modules/admin-notifications/admin-notification.service';
import { AuditService } from '../../../modules/audit/audit.service';

jest.mock('../../../utils/prisma', () => {
  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    adminNotification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return { prisma: mockPrisma };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaMock = prisma as any;

jest.mock('../../../modules/admin-notifications/admin-notification.service', () => ({
  AdminNotificationService: {
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-123' }),
  },
}));

jest.mock('../../../modules/audit/audit.service', () => ({
  AuditService: {
    create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
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

describe('STOCK ALERT SERVICE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkLowStock', () => {
    it('should trigger LOW_STOCK alert when stock <= threshold and > 0, alert is enabled, and no cooldown active', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 3,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: null,
        slug: 'burger-classic',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.adminNotification.findFirst.mockResolvedValue(null); // No existing unread alert

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOW_STOCK',
          metadata: expect.objectContaining({ productId: 'prod-1', stockQuantity: 3 }),
        })
      );
      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            lastLowStockAlertAt: expect.any(Date),
          }),
        })
      );
      expect(AuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOW_STOCK_TRIGGERED',
          entityId: 'prod-1',
        })
      );
    });

    it('should NOT trigger LOW_STOCK alert if stockAlertEnabled is false', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 3,
        lowStockThreshold: 5,
        stockAlertEnabled: false,
        lastLowStockAlertAt: null,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should NOT trigger LOW_STOCK alert if stock is above threshold', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 10,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: null,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should NOT trigger LOW_STOCK alert if cooldown is active (< 24 hours)', async () => {
      const recentlyAlertedAt = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 3,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: recentlyAlertedAt,
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should trigger LOW_STOCK alert if cooldown has passed (>= 24 hours)', async () => {
      const oldAlertedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 3,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: oldAlertedAt,
        slug: 'burger-classic',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.adminNotification.findFirst.mockResolvedValue(null);

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should NOT trigger LOW_STOCK alert if there is already an unread alert (NO_DUPLICATE_ALERT)', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 3,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: null,
        slug: 'burger-classic',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.adminNotification.findFirst.mockResolvedValue({ id: 'existing-alert' }); // Duplicate alert exists

      await StockAlertService.checkLowStock('prod-1');

      expect(AdminNotificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('checkOutOfStock', () => {
    it('should trigger OUT_OF_STOCK alert when stock === 0 and alert is enabled', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 0,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        slug: 'burger-classic',
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.adminNotification.findFirst.mockResolvedValue(null);

      await StockAlertService.checkOutOfStock('prod-1');

      expect(AdminNotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'OUT_OF_STOCK',
        })
      );
      expect(AuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OUT_OF_STOCK_TRIGGERED',
          entityId: 'prod-1',
        })
      );
    });
  });

  describe('resetAlert / RESTOCK', () => {
    it('should reset lastLowStockAlertAt to null when restocked above threshold', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 10, // Healthy stock
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: new Date(),
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await StockAlertService.resetAlert('prod-1');

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { lastLowStockAlertAt: null },
        })
      );
    });
  });

  describe('checkProductStock unifier', () => {
    it('should reset alert if stock is healthy', async () => {
      const mockProduct = {
        id: 'prod-1',
        name: 'Burger Classic',
        stockQuantity: 10,
        lowStockThreshold: 5,
        stockAlertEnabled: true,
        lastLowStockAlertAt: new Date(),
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      await StockAlertService.checkProductStock('prod-1');

      expect(prismaMock.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: { lastLowStockAlertAt: null },
        })
      );
    });
  });
});

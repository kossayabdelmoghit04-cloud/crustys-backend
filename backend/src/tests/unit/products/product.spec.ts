import { prisma } from '../../../utils/prisma';
import { calculateProductPrice, validateStock, applyDiscount, calculatePagination } from '../../../modules/product/product.utils';
import { ProductService } from '../../../modules/product/product.service';

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

// Automatically import and bind prisma mocks
describe('PRODUCT MODULE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('product.utils.ts', () => {
    describe('calculateProductPrice', () => {
      it('should return standard price when discountPrice is null', () => {
        const price = calculateProductPrice(10.99, null);
        expect(price).toBe(10.99);
      });

      it('should return discountPrice when it is valid', () => {
        const price = calculateProductPrice(12.50, 9.99);
        expect(price).toBe(9.99);
      });

      it('should throw AppError if price is negative', () => {
        expect(() => calculateProductPrice(-5, null)).toThrow('Le prix du produit ne peut pas être négatif.');
      });

      it('should throw AppError if discountPrice is negative', () => {
        expect(() => calculateProductPrice(10, -2)).toThrow('Le prix de réduction ne peut pas être négatif.');
      });

      it('should throw AppError if discountPrice exceeds standard price', () => {
        expect(() => calculateProductPrice(10, 15)).toThrow('Le prix de réduction ne peut pas être supérieur au prix initial.');
      });
    });

    describe('validateStock', () => {
      it('should return true if stock is sufficient', () => {
        const isValid = validateStock(10, 5);
        expect(isValid).toBe(true);
      });

      it('should return true if stock is exactly equal to requested quantity', () => {
        const isValid = validateStock(5, 5);
        expect(isValid).toBe(true);
      });

      it('should return false if stock is insufficient', () => {
        const isValid = validateStock(4, 5);
        expect(isValid).toBe(false);
      });

      it('should throw AppError if requested quantity is zero or negative', () => {
        expect(() => validateStock(10, 0)).toThrow('La quantité demandée doit être supérieure à zéro.');
        expect(() => validateStock(10, -1)).toThrow('La quantité demandée doit être supérieure à zéro.');
      });

      it('should throw AppError if current stock is negative', () => {
        expect(() => validateStock(-1, 5)).toThrow('Le stock actuel ne peut pas être négatif.');
      });
    });

    describe('applyDiscount', () => {
      it('should apply percentage discount correctly', () => {
        const discounted = applyDiscount(100, 20);
        expect(discounted).toBe(80);
      });

      it('should handle fractional numbers and round to 2 decimals', () => {
        const discounted = applyDiscount(10.99, 15); // 10.99 * 0.85 = 9.3415 -> 9.34
        expect(discounted).toBe(9.34);
      });

      it('should return standard price if discount is 0%', () => {
        const discounted = applyDiscount(50, 0);
        expect(discounted).toBe(50);
      });

      it('should return zero if discount is 100%', () => {
        const discounted = applyDiscount(50, 100);
        expect(discounted).toBe(0);
      });

      it('should throw AppError if price is negative', () => {
        expect(() => applyDiscount(-10, 10)).toThrow('Le prix de base ne peut pas être négatif.');
      });

      it('should throw AppError if discount percentage is out of range', () => {
        expect(() => applyDiscount(10, -5)).toThrow('Le pourcentage de réduction doit être compris entre 0 et 100.');
        expect(() => applyDiscount(10, 105)).toThrow('Le pourcentage de réduction doit être compris entre 0 et 100.');
      });
    });

    describe('calculatePagination', () => {
      it('should calculate offset correctly for first page', () => {
        const pageMetrics = calculatePagination('1', '10');
        expect(pageMetrics).toEqual({ page: 1, limit: 10, skip: 0 });
      });

      it('should calculate offset correctly for page 3', () => {
        const pageMetrics = calculatePagination('3', '20');
        expect(pageMetrics).toEqual({ page: 3, limit: 20, skip: 40 });
      });

      it('should handle undefined values gracefully using default limits', () => {
        const pageMetrics = calculatePagination(undefined, undefined);
        expect(pageMetrics).toEqual({ page: 1, limit: 10, skip: 0 });
      });

      it('should normalize invalid numeric inputs to at least 1', () => {
        const pageMetrics = calculatePagination('-5', '-10');
        expect(pageMetrics).toEqual({ page: 1, limit: 1, skip: 0 });
      });
    });
  });

  describe('ProductService.getAll (Pagination & Filtering Logic)', () => {
    it('should query products with correct skip and take pagination values', async () => {
      const mockProducts = [
        { id: '1', name: 'Poutine supreme', price: 12.99, isAvailable: true },
        { id: '2', name: 'Burger Crusty', price: 14.50, isAvailable: true },
      ];

      prismaMock.product.count.mockResolvedValue(2);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await ProductService.getAll({ page: '2', limit: '5' });

      expect(prismaMock.product.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );

      expect(result).toEqual({
        products: mockProducts,
        pagination: {
          total: 2,
          page: 2,
          limit: 5,
          totalPages: 1,
        },
      });
    });

    it('should add appropriate filters to the where clause', async () => {
      prismaMock.product.count.mockResolvedValue(0);
      prismaMock.product.findMany.mockResolvedValue([]);

      await ProductService.getAll({
        categoryId: 'cat-123',
        minPrice: '10',
        maxPrice: '30',
        search: 'Canadian',
      });

      expect(prismaMock.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-123',
            price: { gte: 10, lte: 30 },
            OR: [
              { name: { contains: 'Canadian', mode: 'insensitive' } },
              { description: { contains: 'Canadian', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });
});

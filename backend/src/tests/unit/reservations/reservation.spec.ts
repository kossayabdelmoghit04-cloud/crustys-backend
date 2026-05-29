import { prisma } from '../../../utils/prisma';
import { isReservationDateValid, isReservationTimeValid, checkCapacityLimit } from '../../../modules/reservation/reservation.utils';
import { ReservationService } from '../../../modules/reservation/reservation.service';
import { ReservationStatus } from '@prisma/client';

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
    enqueueReservationConfirmationEmail: jest.fn().mockResolvedValue(true),
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

describe('RESERVATION MODULE UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reservation.utils.ts', () => {
    describe('isReservationDateValid', () => {
      it('should return true for today\'s date', () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        expect(isReservationDateValid(todayStr)).toBe(true);
      });

      it('should return true for a future date', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);
        const futureStr = futureDate.toISOString().slice(0, 10);
        expect(isReservationDateValid(futureStr)).toBe(true);
      });

      it('should return false for a past date', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const pastStr = pastDate.toISOString().slice(0, 10);
        expect(isReservationDateValid(pastStr)).toBe(false);
      });

      it('should throw AppError on invalid date format', () => {
        expect(() => isReservationDateValid('invalid-date')).toThrow('Format de date invalide.');
      });
    });

    describe('isReservationTimeValid', () => {
      it('should return true for times inside booking hours (10:00 to 23:00)', () => {
        expect(isReservationTimeValid('10:00')).toBe(true);
        expect(isReservationTimeValid('14:30')).toBe(true);
        expect(isReservationTimeValid('23:00')).toBe(true);
      });

      it('should return false for times outside booking hours', () => {
        expect(isReservationTimeValid('09:59')).toBe(false);
        expect(isReservationTimeValid('08:00')).toBe(false);
        expect(isReservationTimeValid('23:01')).toBe(false);
      });

      it('should throw AppError for invalid time format', () => {
        expect(() => isReservationTimeValid('9:0')).toThrow('Le format d\'heure doit être HH:MM (24h).');
        expect(() => isReservationTimeValid('25:00')).toThrow('Le format d\'heure doit être HH:MM (24h).');
        expect(() => isReservationTimeValid('abc')).toThrow('Le format d\'heure doit être HH:MM (24h).');
      });
    });

    describe('checkCapacityLimit', () => {
      it('should return true if under capacity limit', () => {
        expect(checkCapacityLimit(15)).toBe(true);
        expect(checkCapacityLimit(19)).toBe(true);
      });

      it('should return false if capacity limit is reached or exceeded', () => {
        expect(checkCapacityLimit(20)).toBe(false);
        expect(checkCapacityLimit(25)).toBe(false);
      });

      it('should throw AppError if current bookings count is negative', () => {
        expect(() => checkCapacityLimit(-1)).toThrow('Le nombre de réservations existantes ne peut pas être négatif.');
      });
    });
  });

  describe('ReservationService - Capacity & Overlap Logic', () => {
    const defaultData = {
      customerName: 'Alice Smith',
      customerPhone: '+15145558888',
      customerEmail: 'alice@example.com',
      reservationDate: '2026-06-01',
      reservationTime: '18:00',
      guestsCount: 4,
      notes: 'No allergies',
    };

    describe('create reservation', () => {
      it('should successfully book a reservation when slot has availability', async () => {
        prismaMock.reservation.count.mockResolvedValue(10); // 10 existing bookings (Limit: 20)

        const mockSavedReservation = {
          id: 'res-1',
          ...defaultData,
          reservationDate: new Date('2026-06-01T00:00:00.000Z'),
          status: ReservationStatus.PENDING,
        };

        prismaMock.reservation.create.mockResolvedValue(mockSavedReservation);

        const result = await ReservationService.createReservation(defaultData);

        expect(prismaMock.reservation.count).toHaveBeenCalledWith({
          where: expect.objectContaining({
            reservationTime: '18:00',
            status: { not: ReservationStatus.CANCELLED },
          }),
        });
        expect(prismaMock.reservation.create).toHaveBeenCalled();
        expect(result.id).toBe('res-1');
      });

      it('should reject booking with AppError when slot capacity is fully booked', async () => {
        prismaMock.reservation.count.mockResolvedValue(20); // Slot fully booked (limit 20)

        await expect(ReservationService.createReservation(defaultData)).rejects.toThrow(
          'Aucune disponibilité pour cet horaire. La limite de tables réservées est atteinte.'
        );
        expect(prismaMock.reservation.create).not.toHaveBeenCalled();
      });
    });

    describe('update reservation and self-exclusion overlap', () => {
      it('should exclude the current reservation ID when validating slot availability on update', async () => {
        const existingReservation = {
          id: 'res-existing-1',
          customerName: 'Alice Smith',
          customerPhone: '+15145558888',
          customerEmail: 'alice@example.com',
          reservationDate: new Date('2026-06-01T00:00:00.000Z'),
          reservationTime: '18:00',
          guestsCount: 4,
          status: ReservationStatus.PENDING,
        };

        prismaMock.reservation.findUnique.mockResolvedValue(existingReservation);
        prismaMock.reservation.count.mockResolvedValue(0); // Under limit
        prismaMock.reservation.update.mockResolvedValue({
          ...existingReservation,
          reservationTime: '19:00',
        });

        // Triggering update on time from 18:00 to 19:00
        await ReservationService.updateReservation('res-existing-1', {
          reservationTime: '19:00',
        });

        // Verify count check specifically excludes current reservation ID to avoid self-blocking
        expect(prismaMock.reservation.count).toHaveBeenCalledWith({
          where: expect.objectContaining({
            id: { not: 'res-existing-1' },
            reservationTime: '19:00',
          }),
        });
        expect(prismaMock.reservation.update).toHaveBeenCalled();
      });
    });
  });
});

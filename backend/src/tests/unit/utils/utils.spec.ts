import { prisma } from '../../../utils/prisma';
import { slugify } from '../../../utils/slugify';
import { sanitizeInput, sanitizeObject } from '../../../utils/sanitizeInput';
import { formatCurrencyCAD, formatPhoneNumber } from '../../../utils/formatters';
import { formatDateToISOString, addDaysToDate, startOfDay } from '../../../utils/date.utils';
import { detectTestimonialSpam } from '../../../utils/testimonialSpamCheck';

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

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('UTILITIES & HELPERS UNIT TESTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('slugify.ts (SEO Slug Generator)', () => {
    it('should convert standard strings to SEO-friendly slugs', () => {
      expect(slugify('Crusty Express')).toBe('crusty-express');
    });

    it('should strip French accents and diacritics cleanly', () => {
      expect(slugify('Poutine Suprême et Montréal')).toBe('poutine-supreme-et-montreal');
    });

    it('should strip special characters and trim correctly', () => {
      expect(slugify('  Burgers & Fries -- Special !! ')).toBe('burgers-fries-special');
    });

    it('should handle empty strings and double dashes gracefully', () => {
      expect(slugify('a---b')).toBe('a-b');
      expect(slugify('')).toBe('');
    });
  });

  describe('sanitizeInput.ts (XSS Input Sanitizer)', () => {
    describe('sanitizeInput', () => {
      it('should strip dangerous HTML and scripts', () => {
        const input = '<script>alert("hack")</script>Hello <img src="x" onerror="alert(1)">World';
        const sanitized = sanitizeInput(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).toBe('&lt;script&gt;alert("hack")&lt;/script&gt;Hello <img src>World');
      });

      it('should return empty string for empty inputs', () => {
        expect(sanitizeInput('')).toBe('');
      });
    });

    describe('sanitizeObject', () => {
      it('should recursively sanitize string fields in an object', () => {
        const dirtyObj = {
          title: '<b>Poutine</b>',
          meta: {
            description: '<script>evil()</script>Fresh cheese',
          },
          price: 15.99,
          tags: ['food', '<i>canadian</i>'],
        };

        const cleaned = sanitizeObject(dirtyObj);

        expect(cleaned.title).toBe('<b>Poutine</b>');
        expect(cleaned.meta.description).toBe('&lt;script&gt;evil()&lt;/script&gt;Fresh cheese');
        expect(cleaned.price).toBe(15.99);
        expect(cleaned.tags).toEqual(['food', '<i>canadian</i>']);
      });
    });
  });

  describe('formatters.ts (Currency & Phone Formatters)', () => {
    describe('formatCurrencyCAD', () => {
      it('should format numbers to English CAD format by default', () => {
        const formatted = formatCurrencyCAD(12.5);
        expect(formatted).toBe('$12.50');
      });

      it('should format numbers to French Canadian currency format', () => {
        const formatted = formatCurrencyCAD(12.5, 'fr');
        // Both standard space or non-breaking space depending on Node version locale mappings. 
        // Our utility converts all whitespace to standard spaces to ensure test resilience.
        expect(formatted).toBe('12,50 $');
      });

      it('should throw AppError if amount is NaN', () => {
        expect(() => formatCurrencyCAD(NaN)).toThrow('Le montant doit être un nombre valide.');
      });
    });

    describe('formatPhoneNumber', () => {
      it('should format 10-digit number to standard display pattern', () => {
        expect(formatPhoneNumber('5145551234')).toBe('(514) 555-1234');
      });

      it('should format 11-digit number starting with 1 to international display', () => {
        expect(formatPhoneNumber('15145551234')).toBe('+1 (514) 555-1234');
      });

      it('should return input unchanged if length is not standard', () => {
        expect(formatPhoneNumber('12345')).toBe('12345');
      });

      it('should standardize raw phone strings containing symbols correctly', () => {
        expect(formatPhoneNumber('+1-514-555-1234')).toBe('+1 (514) 555-1234');
      });
    });
  });

  describe('date.utils.ts (Date calculations)', () => {
    describe('formatDateToISOString', () => {
      it('should return YYYY-MM-DD from date objects', () => {
        const d = new Date('2026-05-24T12:00:00.000Z');
        expect(formatDateToISOString(d)).toBe('2026-05-24');
      });

      it('should return YYYY-MM-DD from valid ISO string input', () => {
        expect(formatDateToISOString('2026-05-24T18:30:00.000Z')).toBe('2026-05-24');
      });

      it('should throw AppError on invalid date string', () => {
        expect(() => formatDateToISOString('invalid-date')).toThrow('Format de date invalide pour la conversion.');
      });
    });

    describe('addDaysToDate', () => {
      it('should add positive days correctly', () => {
        const d = new Date('2026-05-24T12:00:00.000Z');
        const offset = addDaysToDate(d, 5);
        expect(offset.toISOString().slice(0, 10)).toBe('2026-05-29');
      });

      it('should subtract days if negative offset is passed', () => {
        const d = new Date('2026-05-24T12:00:00.000Z');
        const offset = addDaysToDate(d, -4);
        expect(offset.toISOString().slice(0, 10)).toBe('2026-05-20');
      });
    });

    describe('startOfDay', () => {
      it('should reset hours, minutes, seconds and milliseconds to zero', () => {
        const d = new Date('2026-05-24T15:35:10.550Z');
        const start = startOfDay(d);
        expect(start.getHours()).toBe(0);
        expect(start.getMinutes()).toBe(0);
        expect(start.getSeconds()).toBe(0);
        expect(start.getMilliseconds()).toBe(0);
      });
    });
  });

  describe('testimonialSpamCheck.ts (Advanced Spam Checking Validator)', () => {
    const defaultName = 'Sylvain Roy';
    const validMessage = 'J’ai adoré ma première poutine ici ! La sauce est incroyable et le fromage fait "skouik-skouik". Service très rapide.';

    it('should pass cleanly for a high-quality legitimate message', async () => {
      prismaMock.testimonial.findFirst.mockResolvedValue(null);

      await expect(detectTestimonialSpam(defaultName, validMessage)).resolves.not.toThrow();
    });

    it('should reject messages that are too short', async () => {
      await expect(detectTestimonialSpam(defaultName, 'Super')).rejects.toThrow(
        'Le témoignage est trop court ou vide après nettoyage.'
      );
    });

    it('should reject messages containing mostly symbols (gibberish/spam)', async () => {
      const symbolsSpam = '$$$ !!! @@@ ### %%% ^^^ &*&*&* (((( )))';
      await expect(detectTestimonialSpam(defaultName, symbolsSpam)).rejects.toThrow(
        'Le message contient un ratio excessif de symboles ou de caractères spéciaux.'
      );
    });

    it('should reject exact duplicate submissions existing in DB', async () => {
      prismaMock.testimonial.findFirst.mockResolvedValue({ id: 'existing-id' } as any);

      await expect(detectTestimonialSpam(defaultName, validMessage)).rejects.toThrow(
        'Ce témoignage exact a déjà été soumis et enregistré.'
      );
    });

    it('should block consecutive submissions within 2 minutes (throttling)', async () => {
      // First check for duplicate message returns null, second check for consecutive time returns recent post
      prismaMock.testimonial.findFirst
        .mockResolvedValueOnce(null) // Not duplicate message
        .mockResolvedValueOnce({ id: 'recent-id', customerName: 'Sylvain Roy' } as any); // Found recent post in 2 minutes

      await expect(detectTestimonialSpam(defaultName, validMessage)).rejects.toThrow(
        'Vous avez soumis un témoignage très récemment.'
      );
    });
  });
});

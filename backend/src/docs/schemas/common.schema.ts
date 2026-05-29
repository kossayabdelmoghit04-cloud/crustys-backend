import { z } from 'zod';
import { registry } from '../openapi';

/**
 * Standard UUID schema
 */
export const UUIDSchema = registry.register(
  'UUID',
  z.string().uuid({ message: 'Must be a valid UUID v4' }).openapi({
    description: 'Universally Unique Identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
);

/**
 * Common ISO Timestamp schema
 */
export const TimestampSchema = registry.register(
  'Timestamp',
  z.string().datetime().openapi({
    description: 'ISO-8601 UTC timestamp',
    example: '2026-05-22T12:00:00.000Z',
  })
);

/**
 * Standard API error response schema
 */
export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z.object({
    status: z.string().openapi({ example: 'error' }),
    message: z.string().openapi({ example: 'Something went wrong on the server' }),
    errors: z
      .array(
        z.object({
          path: z.array(z.string()).optional(),
          message: z.string(),
        })
      )
      .optional()
      .openapi({
        description: 'Detailed validation or field errors',
        example: [{ path: ['email'], message: "L'adresse email doit être valide" }],
      }),
  }).openapi({
    description: 'Standard Error Response Envelope',
  })
);

/**
 * Paginated API Metadata
 */
export const PaginationMetaSchema = registry.register(
  'PaginationMeta',
  z.object({
    total: z.number().openapi({ description: 'Total number of items', example: 120 }),
    page: z.number().openapi({ description: 'Current page number', example: 1 }),
    limit: z.number().openapi({ description: 'Items per page', example: 10 }),
    pages: z.number().openapi({ description: 'Total number of pages', example: 12 }),
  }).openapi({
    description: 'Metadata structure for paginated lists',
  })
);

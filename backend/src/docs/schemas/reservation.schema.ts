import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Standard Reservation Schema
 */
export const ReservationSchema = registry.register(
  'Reservation',
  z.object({
    id: UUIDSchema,
    customerId: UUIDSchema,
    date: TimestampSchema,
    guests: z.number().int().min(1).max(20).openapi({ description: 'Nombre d\'invités', example: 4 }),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).openapi({ example: 'PENDING' }),
    specialRequests: z.string().nullable().openapi({ example: 'Table près de la fenêtre' }),
    tableNumber: z.number().nullable().openapi({ description: 'Numéro de table assigné par l\'admin', example: 5 }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Zod Schema for Reservation Creation/Input validation
 */
export const ReservationInputSchema = registry.register(
  'ReservationInput',
  z.object({
    date: z.string().datetime({ message: 'La date doit être au format ISO-8601 UTC' }).openapi({
      description: 'Date et heure de la réservation',
      example: '2026-06-01T19:30:00.000Z',
    }),
    guests: z.number().int().min(1, 'Il faut au moins 1 invité').max(20, 'Maximum 20 invités autorisés').openapi({
      description: 'Nombre de convives pour la table',
      example: 4,
    }),
    specialRequests: z.string().max(500, 'Les demandes spéciales ne doivent pas dépasser 500 caractères').optional().openapi({
      description: 'Notes ou demandes spéciales (e.g. allergies, table préférée)',
      example: 'Table près de la fenêtre',
    }),
  })
);

/**
 * Success Reservation Response Envelope
 */
export const ReservationSuccessResponseSchema = registry.register(
  'ReservationSuccessResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Réservation enregistrée avec succès' }),
    data: ReservationSchema,
  })
);

/**
 * Paginated Reservations Response Envelope
 */
export const ReservationsPaginatedResponseSchema = registry.register(
  'ReservationsPaginatedResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Réservations récupérées avec succès' }),
    data: z.object({
      items: z.array(ReservationSchema),
      meta: z.object({
        total: z.number().openapi({ description: 'Nombre total de réservations', example: 25 }),
        page: z.number().openapi({ description: 'Page actuelle', example: 1 }),
        limit: z.number().openapi({ description: 'Nombre maximum d\'éléments par page', example: 10 }),
        pages: z.number().openapi({ description: 'Nombre total de pages', example: 3 }),
      }),
    }),
  })
);

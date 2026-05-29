import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Standard Category Schema
 */
export const CategorySchema = registry.register(
  'Category',
  z.object({
    id: UUIDSchema,
    name: z.string().openapi({ example: 'Burgers' }),
    slug: z.string().openapi({ example: 'burgers' }),
    image: z.string().nullable().openapi({ example: 'https://cdn.crustysexpress.com/categories/burgers.jpg' }),
    description: z.string().nullable().openapi({ example: 'Premium Canadian street burgers made with organic beef.' }),
    isActive: z.boolean().openapi({ example: true }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Zod Schema for Category Creation or Update payload
 */
export const CategoryInputSchema = registry.register(
  'CategoryInput',
  z.object({
    name: z.string().min(2, 'Le nom de la catégorie doit faire au moins 2 caractères').openapi({ example: 'Burgers' }),
    description: z.string().optional().openapi({ example: 'Burgers street food de qualité supérieure' }),
    image: z.string().url('L\'URL de l\'image doit être valide').optional().openapi({ example: 'https://cdn.crustysexpress.com/categories/burgers.jpg' }),
    isActive: z.boolean().optional().openapi({ example: true }),
  })
);

/**
 * Success Category Response Envelope
 */
export const CategorySuccessResponseSchema = registry.register(
  'CategorySuccessResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Catégorie récupérée avec succès' }),
    data: CategorySchema,
  })
);

/**
 * List of Categories Response Envelope
 */
export const CategoriesListResponseSchema = registry.register(
  'CategoriesListResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Catégories récupérées avec succès' }),
    data: z.array(CategorySchema),
  })
);

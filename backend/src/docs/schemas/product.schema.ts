import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Zod Schema for Product Images
 */
export const ProductImageSchema = registry.register(
  'ProductImage',
  z.object({
    id: UUIDSchema,
    productId: UUIDSchema,
    imageUrl: z.string().openapi({ example: 'https://cdn.crustysexpress.com/products/burger-classic-1.jpg' }),
    createdAt: TimestampSchema,
  })
);

/**
 * Standard Product Schema
 */
export const ProductSchema = registry.register(
  'Product',
  z.object({
    id: UUIDSchema,
    name: z.string().openapi({ example: 'Classic Burger' }),
    slug: z.string().openapi({ example: 'classic-burger' }),
    description: z.string().nullable().openapi({ example: 'Premium Canadian burger made with local organic beef.' }),
    price: z.number().openapi({ example: 14.99 }),
    discountPrice: z.number().nullable().openapi({ example: null }),
    stockQuantity: z.number().openapi({ example: 25 }),
    calories: z.number().nullable().openapi({ example: 680 }),
    image: z.string().nullable().openapi({ example: 'https://cdn.crustysexpress.com/products/burger.jpg' }),
    isFeatured: z.boolean().openapi({ example: true }),
    isAvailable: z.boolean().openapi({ example: true }),
    categoryId: UUIDSchema,
    images: z.array(ProductImageSchema).optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Zod Schema for Product Input Validation (e.g. Create/Update)
 */
export const ProductInputSchema = registry.register(
  'ProductInput',
  z.object({
    categoryId: z.string().uuid("L'ID de catégorie doit être un UUID valide").openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
    name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères').openapi({ example: 'Classic Burger' }),
    description: z.string().optional().openapi({ example: 'Double Cheddar et Boeuf local' }),
    price: z.number().positive('Le prix doit être positif').openapi({ example: 14.99 }),
    discountPrice: z.number().positive().optional().openapi({ example: 12.99 }),
    stockQuantity: z.number().int().nonnegative().optional().openapi({ example: 25 }),
    calories: z.number().int().positive().optional().openapi({ example: 680 }),
    image: z.string().url('L\'URL de l\'image doit être valide').optional().openapi({ example: 'https://cdn.crustysexpress.com/products/burger.jpg' }),
    isFeatured: z.boolean().optional().openapi({ example: true }),
    isAvailable: z.boolean().optional().openapi({ example: true }),
  })
);

/**
 * Success Product Response Envelope
 */
export const ProductSuccessResponseSchema = registry.register(
  'ProductSuccessResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Produit récupéré avec succès' }),
    data: ProductSchema,
  })
);

/**
 * Paginated Products Response Envelope
 */
export const ProductsPaginatedResponseSchema = registry.register(
  'ProductsPaginatedResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Produits récupérés avec succès' }),
    data: z.object({
      items: z.array(ProductSchema),
      meta: z.object({
        total: z.number().openapi({ description: 'Nombre total de produits', example: 15 }),
        page: z.number().openapi({ description: 'Page actuelle', example: 1 }),
        limit: z.number().openapi({ description: 'Limite par page', example: 10 }),
        pages: z.number().openapi({ description: 'Nombre total de pages', example: 2 }),
      }),
    }),
  })
);

import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Standard Order Item Schema
 */
export const OrderItemSchema = registry.register(
  'OrderItem',
  z.object({
    id: UUIDSchema.optional(),
    productId: UUIDSchema,
    quantity: z.number().int().positive('La quantité doit être supérieure à 0').openapi({ example: 2 }),
    unitPrice: z.number().openapi({ example: 14.99 }),
    subtotal: z.number().openapi({ example: 29.98 }),
  })
);

/**
 * Standard Order Schema
 */
export const OrderSchema = registry.register(
  'Order',
  z.object({
    id: UUIDSchema,
    orderNumber: z.string().openapi({ example: 'ORD-20260523-9F8A' }),
    totalPrice: z.number().openapi({ example: 49.98 }),
    deliveryType: z.string().openapi({ description: 'Mode de remise (delivery, pickup, dine_in)', example: 'delivery' }),
    paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).openapi({ example: 'PENDING' }),
    orderStatus: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED']).openapi({ example: 'PENDING' }),
    customerAddress: z.string().nullable().openapi({ example: '123 Rue de la Montagne, Montréal, QC' }),
    customerPhone: z.string().openapi({ example: '+15145551234' }),
    notes: z.string().nullable().openapi({ example: 'Sauce barbecue à part svp.' }),
    userId: UUIDSchema.nullable(),
    items: z.array(OrderItemSchema),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Zod Schema for Order Creation
 */
export const OrderInputSchema = registry.register(
  'OrderInput',
  z.object({
    items: z.array(
      z.object({
        productId: z.string().uuid("L'ID du produit doit être un UUID valide").openapi({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }),
        quantity: z.number().int().positive('La quantité doit être supérieure à 0').openapi({ example: 2 }),
      })
    ).min(1, 'La commande doit comporter au moins un article'),
    deliveryType: z.enum(['delivery', 'pickup', 'dine_in']).openapi({ example: 'delivery' }),
    customerPhone: z.string().openapi({ example: '+15145551234' }),
    customerAddress: z.string().optional().openapi({ example: '123 Rue de la Montagne, Montréal, QC' }),
    notes: z.string().optional().openapi({ example: 'Laissez devant la porte.' }),
  })
);

/**
 * Success Order Response Envelope
 */
export const OrderSuccessResponseSchema = registry.register(
  'OrderSuccessResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Commande enregistrée avec succès' }),
    data: OrderSchema,
  })
);

/**
 * Paginated Orders Response Envelope (Admin or Owner)
 */
export const OrdersPaginatedResponseSchema = registry.register(
  'OrdersPaginatedResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Commandes récupérées avec succès' }),
    data: z.object({
      items: z.array(OrderSchema),
      meta: z.object({
        total: z.number().openapi({ description: 'Nombre total de commandes', example: 10 }),
        page: z.number().openapi({ description: 'Page courante', example: 1 }),
        limit: z.number().openapi({ description: 'Commandes par page', example: 10 }),
        pages: z.number().openapi({ description: 'Total des pages', example: 1 }),
      }),
    }),
  })
);

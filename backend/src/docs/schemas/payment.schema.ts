import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Standard Payment Schema
 */
export const PaymentSchema = registry.register(
  'Payment',
  z.object({
    id: UUIDSchema,
    orderId: UUIDSchema,
    paymentIntentId: z.string().openapi({ description: 'ID Stripe PaymentIntent', example: 'pi_123456_secret_789' }),
    amount: z.number().int().openapi({ description: 'Montant en cents (e.g. 4999 pour 49.99 CAD)', example: 4999 }),
    currency: z.string().openapi({ example: 'cad' }),
    status: z.enum(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED']).openapi({ example: 'SUCCEEDED' }),
    refundedAmount: z.number().int().openapi({ description: 'Montant remboursé en cents', example: 0 }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Zod Schema for Stripe PaymentIntent Creation
 */
export const PaymentIntentInputSchema = registry.register(
  'PaymentIntentInput',
  z.object({
    orderId: UUIDSchema.openapi({
      description: 'ID unique de la commande pour laquelle créer le PaymentIntent',
      example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }),
  })
);

/**
 * Response returned after a PaymentIntent is successfully created
 */
export const PaymentIntentResponseSchema = registry.register(
  'PaymentIntentResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Payment intent created successfully' }),
    data: z.object({
      clientSecret: z.string().openapi({ description: 'Stripe PaymentIntent client_secret', example: 'pi_123_secret_456' }),
      paymentIntentId: z.string().openapi({ description: 'Stripe PaymentIntent ID', example: 'pi_123' }),
      amount: z.number().openapi({ description: 'Montant en cents', example: 4999 }),
      currency: z.string().openapi({ example: 'cad' }),
    }),
  })
);

/**
 * Zod Schema for refunding payments (Admin only)
 */
export const RefundInputSchema = registry.register(
  'RefundInput',
  z.object({
    paymentId: UUIDSchema.openapi({
      description: 'ID unique de la transaction de paiement',
      example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    }),
    amount: z.number().int().positive('Le montant à rembourser doit être supérieur à 0').optional().openapi({
      description: 'Montant partiel à rembourser (en cents). Si absent, procède à un remboursement total.',
      example: 2000,
    }),
    reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).default('requested_by_customer').openapi({
      description: 'Motif du remboursement pour Stripe',
      example: 'requested_by_customer',
    }),
  })
);

/**
 * Standard Refund Response Schema
 */
export const RefundResponseSchema = registry.register(
  'RefundResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Remboursement traité avec succès' }),
    data: z.object({
      refundId: z.string().openapi({ description: 'ID unique du remboursement Stripe (re_...)', example: 're_123456' }),
      paymentId: UUIDSchema,
      amount: z.number().openapi({ description: 'Montant remboursé en cents', example: 2000 }),
      status: z.string().openapi({ example: 'succeeded' }),
    }),
  })
);

/**
 * Stripe Webhook Payload Mock Schema
 */
export const WebhookEventSchema = registry.register(
  'WebhookEvent',
  z.object({
    id: z.string().openapi({ example: 'evt_123456' }),
    type: z.enum([
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.refunded',
      'charge.dispute.created'
    ]).openapi({ example: 'payment_intent.succeeded' }),
    data: z.object({
      object: z.object({
        id: z.string().openapi({ example: 'pi_123456' }),
        amount: z.number().openapi({ example: 4999 }),
        currency: z.string().openapi({ example: 'cad' }),
        status: z.string().openapi({ example: 'succeeded' }),
      }),
    }),
  })
);

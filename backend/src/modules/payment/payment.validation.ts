import { z } from 'zod';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

export const createPaymentIntentSchema = z.object({
  body: z.object({
    orderId: z
      .string({ required_error: 'L\'ID de la commande est requis' })
      .uuid('L\'ID de la commande doit être un UUID valide'),
    paymentMethodType: z
      .string()
      .default('card'),
  }),
});

export const refundPaymentSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .max(255, 'La raison du remboursement ne doit pas dépasser 255 caractères')
      .optional()
      .nullable(),
  }),
});

export const paymentQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    orderId: z.string().uuid('ID de commande invalide').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;

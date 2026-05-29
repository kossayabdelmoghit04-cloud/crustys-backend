import { z } from 'zod';
import { PaymentMethod, OrderStatus } from '@prisma/client';

export const analyticsQuerySchema = z.object({
  query: z.object({
    startDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'La date de début doit être une date valide' })
      .optional(),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: 'La date de fin doit être une date valide' })
      .optional(),
    period: z
      .enum(['daily', 'weekly', 'monthly', 'yearly'])
      .default('daily')
      .optional(),
    categoryId: z
      .string()
      .uuid('Le categoryId doit être un UUID valide')
      .optional(),
    paymentMethod: z
      .nativeEnum(PaymentMethod)
      .optional(),
    orderStatus: z
      .nativeEnum(OrderStatus)
      .optional(),
  }),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

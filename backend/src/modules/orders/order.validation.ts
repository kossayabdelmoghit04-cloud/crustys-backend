import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    deliveryType: z
      .string({ required_error: 'Le type de livraison est requis' })
      .min(2, 'Le type de livraison doit faire au moins 2 caractères'),
    customerPhone: z
      .string({ required_error: 'Le numéro de téléphone est requis' })
      .min(5, 'Le numéro de téléphone doit faire au moins 5 caractères'),
    customerAddress: z
      .string()
      .max(255, 'L\'adresse de livraison ne doit pas dépasser 255 caractères')
      .optional()
      .nullable(),
    notes: z
      .string()
      .max(500, 'Les notes de commande ne doivent pas dépasser 500 caractères')
      .optional()
      .nullable(),
    paymentMethod: z
      .string({ required_error: 'La méthode de paiement est requise' })
      .min(2, 'La méthode de paiement doit faire au moins 2 caractères'),
    items: z
      .array(
        z.object({
          productId: z
            .string({ required_error: 'L\'ID du produit est requis' })
            .uuid('L\'ID du produit doit être un UUID valide'),
          quantity: z
            .number({ required_error: 'La quantité est requise' })
            .int('La quantité doit être un nombre entier')
            .min(1, 'La quantité doit être au moins de 1'),
        }),
        { required_error: 'La liste des produits ne peut pas être vide' }
      )
      .min(1, 'La commande doit contenir au moins un produit'),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      required_error: 'Le statut de commande est requis et doit être une valeur valide',
    }),
  }),
});

export const orderQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    userId: z.string().uuid('ID utilisateur invalide').optional(),
    minTotal: z.string().optional(),
    maxTotal: z.string().optional(),
    startDate: z.string().datetime({ message: 'La date de début doit être un ISO-8601 valide' }).optional(),
    endDate: z.string().datetime({ message: 'La date de fin doit être un ISO-8601 valide' }).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderQueryInput = z.infer<typeof orderQuerySchema>;

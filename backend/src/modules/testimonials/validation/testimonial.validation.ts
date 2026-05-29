import { z } from 'zod';

export const createTestimonialSchema = z.object({
  body: z.object({
    customerName: z
      .string({ required_error: 'Le nom du client est requis' })
      .min(2, 'Le nom doit faire au moins 2 caractères')
      .max(50, 'Le nom ne doit pas dépasser 50 caractères')
      .trim(),
    message: z
      .string({ required_error: 'Le message est requis' })
      .min(10, 'Le message doit faire au moins 10 caractères')
      .max(500, 'Le message ne doit pas dépasser 500 caractères')
      .trim(),
    rating: z
      .number({ required_error: 'La note est requise' })
      .int('La note doit être un nombre entier')
      .min(1, 'La note doit être d\'au moins 1')
      .max(5, 'La note ne peut pas dépasser 5'),
  }),
});

export const getTestimonialByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('ID invalide, doit être un CUID valide'),
  }),
});

export const updateTestimonialSchema = z.object({
  params: z.object({
    id: z.string().cuid('ID invalide, doit être un CUID valide'),
  }),
  body: z.object({
    customerName: z
      .string()
      .min(2, 'Le nom doit faire au moins 2 caractères')
      .max(50, 'Le nom ne doit pas dépasser 50 caractères')
      .trim()
      .optional(),
    message: z
      .string()
      .min(10, 'Le message doit faire au moins 10 caractères')
      .max(500, 'Le message ne doit pas dépasser 500 caractères')
      .trim()
      .optional(),
    rating: z
      .number()
      .int('La note doit être un nombre entier')
      .min(1, 'La note doit être d\'au moins 1')
      .max(5, 'La note ne peut pas dépasser 5')
      .optional(),
    isApproved: z.boolean().optional(),
  }),
});

export const approveTestimonialSchema = z.object({
  params: z.object({
    id: z.string().cuid('ID invalide, doit être un CUID valide'),
  }),
  body: z.object({
    isApproved: z.boolean({ required_error: 'Le statut d\'approbation (isApproved) est requis' }),
  }),
});

export const deleteTestimonialSchema = z.object({
  params: z.object({
    id: z.string().cuid('ID invalide, doit être un CUID valide'),
  }),
});

export const queryTestimonialsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^[1-9]\d*$/, 'La page doit être un nombre entier supérieur à 0')
      .optional(),
    limit: z
      .string()
      .regex(/^[1-9]\d*$/, 'La limite doit être un nombre entier supérieur à 0')
      .refine((val) => {
        const num = parseInt(val, 10);
        return num <= 50;
      }, { message: 'La limite ne peut pas dépasser 50 par page' })
      .optional(),
    rating: z
      .string()
      .regex(/^[1-5]$/, 'La note doit être un chiffre entre 1 et 5')
      .optional(),
    search: z
      .string()
      .trim()
      .max(100, 'Le terme de recherche ne doit pas dépasser 100 caractères')
      .optional(),
    isApproved: z
      .string()
      .refine((val) => val === 'true' || val === 'false', {
        message: "Le statut d'approbation doit être 'true' ou 'false'",
      })
      .optional(),
  }),
});


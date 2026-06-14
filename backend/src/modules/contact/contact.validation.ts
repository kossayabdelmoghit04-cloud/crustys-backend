import { z } from 'zod';

export const createContactSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Le nom complet est obligatoire' })
      .min(2, 'Le nom complet doit contenir au moins 2 caractères')
      .max(100, 'Le nom complet ne peut pas dépasser 100 caractères')
      .trim(),
    email: z
      .string({ required_error: 'L\'adresse email est obligatoire' })
      .email('L\'adresse email doit être valide')
      .trim()
      .toLowerCase(),
    subject: z
      .string({ required_error: 'Le sujet est obligatoire' })
      .min(3, 'Le sujet doit contenir au moins 3 caractères')
      .max(150, 'Le sujet ne peut pas dépasser 150 caractères')
      .trim(),
    message: z
      .string({ required_error: 'Le message est obligatoire' })
      .min(10, 'Le message doit contenir au moins 10 caractères')
      .max(2000, 'Le message ne peut pas dépasser 2000 caractères')
      .trim(),
  }),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

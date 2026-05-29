import { z } from 'zod';

export const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Le nom de la catégorie est requis' })
      .min(2, 'Le nom doit faire au moins 2 caractères')
      .max(50, 'Le nom ne doit pas dépasser 50 caractères')
      .trim(),
    description: z
      .string()
      .max(500, 'La description ne doit pas dépasser 500 caractères')
      .optional()
      .nullable(),
    image: z
      .string()
      .url('L\'image doit être une URL valide ou un chemin d\'accès valide')
      .or(z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide'))
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Le nom doit faire au moins 2 caractères')
      .max(50, 'Le nom ne doit pas dépasser 50 caractères')
      .trim()
      .optional(),
    description: z
      .string()
      .max(500, 'La description ne doit pas dépasser 500 caractères')
      .optional()
      .nullable(),
    image: z
      .string()
      .url('L\'image doit être une URL valide')
      .or(z.string().regex(/^\/[a-zA-Z0-9_\-\/]+\.(jpg|jpeg|png|webp|svg)$/, 'Format de chemin d\'image invalide'))
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

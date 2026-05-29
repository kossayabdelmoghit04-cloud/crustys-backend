import { z } from 'zod';

export const createAdminSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'Le nom complet est requis' })
      .min(2, 'Le nom complet doit faire au moins 2 caractères')
      .max(100, 'Le nom complet ne doit pas dépasser 100 caractères'),
    email: z
      .string({ required_error: 'L\'adresse email est requise' })
      .email('L\'adresse email doit être valide'),
    password: z
      .string({ required_error: 'Le mot de passe est requis' })
      .min(8, 'Le mot de passe doit faire au moins 8 caractères')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
        'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial'
      ),
    roleId: z
      .string({ required_error: 'L\'ID du rôle est requis' })
      .uuid('L\'ID du rôle doit être un UUID valide'),
  }),
});

export const updateAdminSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
      .optional(),
    roleId: z.string().uuid().optional(),
  }),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Le nom du rôle est requis' })
      .min(2, 'Le nom du rôle doit faire au moins 2 caractères'),
    permissions: z
      .array(z.string(), { required_error: 'Les permissions sont requises' })
      .min(1, 'Au moins une permission est requise'),
  }),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

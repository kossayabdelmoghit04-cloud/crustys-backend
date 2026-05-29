import { z } from 'zod';
import { UserRole } from '@prisma/client';

/**
 * Zod validation schema for standard User Profile Update inputs
 */
export const updateUserSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(2, 'Le prénom doit contenir au moins 2 caractères')
      .trim()
      .optional(),
    lastName: z
      .string()
      .min(2, 'Le nom de famille doit contenir au moins 2 caractères')
      .trim()
      .optional(),
    email: z
      .string()
      .email("L'adresse email doit être valide")
      .trim()
      .optional(),
  }).strict('Seuls les champs firstName, lastName, et email peuvent être mis à jour sur ce point de connexion'),
});

/**
 * Zod validation schema for Role escalation / updates (Admin only)
 */
export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(UserRole, {
      errorMap: () => ({ message: "Le rôle spécifié est invalide. Rôles autorisés: ADMIN, CUSTOMER" }),
    }),
  }),
});

/**
 * Zod validation schema for Account Status Updates (Admin only)
 */
export const updateUserStatusSchema = z.object({
  body: z.object({
    isActive: z.boolean({
      required_error: "Le statut d'activité isActive est requis et doit être un booléen",
      invalid_type_error: "isActive doit être de type booléen (true/false)",
    }),
  }),
});

/**
 * Zod validation schema for HTTP Get Query Parameters (Searching, Pagination, Sorting)
 */
export const getUserQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return val;
    }, z.boolean().optional()),
    sortBy: z.string().default('createdAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  }),
});

import { z } from 'zod';
import { registry } from '../openapi';
import { TimestampSchema } from './common.schema';

/**
 * Enterprise User Schema for Responses
 */
export const UserSchema = registry.register(
  'User',
  z.object({
    id: z.string().openapi({ description: 'Unique user ID (CUID)', example: 'cld0y8j3d00003b6gq5j2j9z1' }),
    email: z.string().email().openapi({ example: 'jean.tremblay@gmail.com' }),
    firstName: z.string().openapi({ example: 'Jean' }),
    lastName: z.string().openapi({ example: 'Tremblay' }),
    fullName: z.string().openapi({ example: 'Jean Tremblay' }),
    role: z.enum(['ADMIN', 'CUSTOMER']).openapi({ example: 'CUSTOMER' }),
    isActive: z.boolean().openapi({ example: true }),
    phone: z.string().nullable().openapi({ example: '+15145551234' }),
    avatar: z.string().nullable().openapi({ example: 'https://cdn.crustysexpress.com/avatars/jean.jpg' }),
    isVerified: z.boolean().openapi({ example: true }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Standard User Success Response Envelope
 */
export const UserSuccessResponseSchema = registry.register(
  'UserSuccessResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Utilisateur récupéré avec succès' }),
    data: UserSchema,
  })
);

/**
 * User Profile Update Input Schema
 */
export const UpdateUserInputSchema = registry.register(
  'UpdateUserInput',
  z.object({
    firstName: z.string().min(2).optional().openapi({ example: 'Jean-Marc' }),
    lastName: z.string().min(2).optional().openapi({ example: 'Royer' }),
    email: z.string().email().optional().openapi({ example: 'jean.marc@gmail.com' }),
  })
);

/**
 * User Role Update Input Schema (Admin Only)
 */
export const UpdateUserRoleInputSchema = registry.register(
  'UpdateUserRoleInput',
  z.object({
    role: z.enum(['ADMIN', 'CUSTOMER']).openapi({ description: 'Nouveau rôle à attribuer', example: 'ADMIN' }),
  })
);

/**
 * User Status Update Input Schema (Admin Only)
 */
export const UpdateUserStatusInputSchema = registry.register(
  'UpdateUserStatusInput',
  z.object({
    isActive: z.boolean().openapi({ description: 'Nouveau statut d\'activité du compte', example: false }),
  })
);

/**
 * Paginated Users Response Schema (Admin Only)
 */
export const UsersPaginatedResponseSchema = registry.register(
  'UsersPaginatedResponse',
  z.object({
    success: z.boolean().openapi({ example: true }),
    message: z.string().openapi({ example: 'Utilisateurs récupérés avec succès' }),
    data: z.object({
      items: z.array(UserSchema),
      meta: z.object({
        total: z.number().openapi({ description: 'Nombre total de résultats', example: 42 }),
        page: z.number().openapi({ description: 'Page actuelle', example: 1 }),
        limit: z.number().openapi({ description: 'Nombre d\'éléments par page', example: 10 }),
        pages: z.number().openapi({ description: 'Nombre total de pages', example: 5 }),
      }),
    }),
  })
);

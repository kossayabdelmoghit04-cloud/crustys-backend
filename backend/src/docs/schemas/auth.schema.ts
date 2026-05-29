import { z } from 'zod';
import { registry } from '../openapi';
import { UUIDSchema, TimestampSchema } from './common.schema';

/**
 * Zod Schema for User Login Input Validation
 */
export const LoginInputSchema = registry.register(
  'LoginInput',
  z.object({
    email: z
      .string({ required_error: "L'adresse email est requise" })
      .email("L'adresse email doit être valide")
      .openapi({
        description: 'Admin or User email address',
        example: 'admin@crustysexpress.com',
      }),
    password: z
      .string({ required_error: 'Le mot de passe est requis' })
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
      .openapi({
        description: 'Authentication password (minimum 6 characters)',
        example: 'securePassword123',
      }),
  })
);

/**
 * Standard User schema for responses
 */
export const UserProfileSchema = registry.register(
  'UserProfile',
  z.object({
    id: UUIDSchema,
    fullName: z.string().openapi({ example: 'Jean Tremblay' }),
    email: z.string().email().openapi({ example: 'jean.tremblay@gmail.com' }),
    phone: z.string().nullable().openapi({ example: '+15145551234' }),
    avatar: z.string().nullable().openapi({ example: 'https://cdn.crustysexpress.com/avatars/jean.jpg' }),
    isVerified: z.boolean().openapi({ example: true }),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * Standard Admin schema for responses
 */
export const AdminProfileSchema = registry.register(
  'AdminProfile',
  z.object({
    id: UUIDSchema,
    fullName: z.string().openapi({ example: 'Chef Crusty' }),
    email: z.string().email().openapi({ example: 'admin@crustysexpress.com' }),
    roleId: UUIDSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
  })
);

/**
 * JWT Tokens response schema
 */
export const AuthTokensSchema = registry.register(
  'AuthTokens',
  z.object({
    accessToken: z.string().openapi({
      description: 'Access JWT token valid for 15 minutes',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
    refreshToken: z.string().openapi({
      description: 'Refresh JWT token valid for 7 days',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    }),
  })
);

/**
 * Success login response envelope
 */
export const AuthSuccessResponseSchema = registry.register(
  'AuthSuccessResponse',
  z.object({
    status: z.string().openapi({ example: 'success' }),
    message: z.string().openapi({ example: 'Connexion réussie' }),
    data: z.object({
      admin: AdminProfileSchema.optional(),
      user: UserProfileSchema.optional(),
      tokens: AuthTokensSchema,
    }),
  })
);

/**
 * Reusable AuthRequest Schema for Registration or Login
 */
export const AuthRequestSchema = registry.register(
  'AuthRequest',
  z.object({
    email: z
      .string({ required_error: "L'adresse email est requise" })
      .email("L'adresse email doit être valide")
      .openapi({
        description: 'Email address of the account',
        example: 'jean.tremblay@gmail.com',
      }),
    password: z
      .string({ required_error: 'Le mot de passe est requis' })
      .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
      .openapi({
        description: 'Account password (minimum 6 characters)',
        example: 'securePassword123',
      }),
    fullName: z
      .string()
      .optional()
      .openapi({
        description: 'Full name (required for registration)',
        example: 'Jean Tremblay',
      }),
    phone: z
      .string()
      .optional()
      .nullable()
      .openapi({
        description: 'Phone number of the client',
        example: '+15145551234',
      }),
  }).openapi({
    description: 'Universal Authentication Request payload (Registration or Login)',
  })
);

/**
 * Enterprise AuthResponse Schema
 */
export const AuthResponseSchema = registry.register(
  'AuthResponse',
  z.object({
    status: z.string().openapi({ example: 'success' }),
    message: z.string().openapi({ example: 'Authentification réussie' }),
    data: z.object({
      user: UserProfileSchema.optional(),
      admin: AdminProfileSchema.optional(),
      tokens: AuthTokensSchema,
    }),
  }).openapi({
    description: 'Standard Authentication success envelope (with tokens)',
  })
);

/**
 * Enterprise UserResponse Schema
 */
export const UserResponseSchema = registry.register(
  'UserResponse',
  z.object({
    status: z.string().openapi({ example: 'success' }),
    data: z.object({
      user: UserProfileSchema,
    }),
  }).openapi({
    description: 'Standard User profile response envelope',
  })
);


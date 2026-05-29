import { z } from 'zod';

/**
 * Zod validation schema for User Registration input
 */
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "L'adresse email est requise" })
      .email("L'adresse email doit être valide")
      .trim(),
    password: z
      .string({ required_error: 'Le mot de passe est requis' })
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une lettre majuscule',
      })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une lettre minuscule',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Le mot de passe doit contenir au moins un chiffre',
      }),
    firstName: z
      .string({ required_error: 'Le prénom est requis' })
      .min(2, 'Le prénom doit contenir au moins 2 caractères')
      .trim(),
    lastName: z
      .string({ required_error: 'Le nom de famille est requis' })
      .min(2, 'Le nom de famille doit contenir au moins 2 caractères')
      .trim(),
    phone: z
      .string()
      .optional()
      .nullable(),
    avatar: z
      .string()
      .url('Le format de l\'avatar doit être une URL valide')
      .optional()
      .nullable(),
  }),
});

/**
 * Zod validation schema for Login input
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "L'adresse email est requise" })
      .email("L'adresse email doit être valide")
      .trim(),
    password: z
      .string({ required_error: 'Le mot de passe est requis' }),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Zod validation schema for Forgot Password input
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "L'adresse email est requise" })
      .email("L'adresse email doit être valide")
      .trim(),
  }),
});

/**
 * Zod validation schema for Reset Password input
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string({ required_error: "Le jeton de réinitialisation est requis" })
      .min(1, "Le jeton ne peut pas être vide"),
    password: z
      .string({ required_error: 'Le mot de passe est requis' })
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .refine((val) => /[A-Z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une lettre majuscule',
      })
      .refine((val) => /[a-z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une lettre minuscule',
      })
      .refine((val) => /[0-9]/.test(val), {
        message: 'Le mot de passe doit contenir au moins un chiffre',
      }),
  }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

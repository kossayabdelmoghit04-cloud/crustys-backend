import { z } from 'zod';
import { ReservationStatus } from '@prisma/client';

export const createReservationSchema = z.object({
  body: z.object({
    customerName: z
      .string({ required_error: 'Le nom du client est requis' })
      .min(2, 'Le nom complet doit faire au moins 2 caractères')
      .max(100, 'Le nom complet ne doit pas dépasser 100 caractères')
      .trim(),
    customerPhone: z
      .string({ required_error: 'Le numéro de téléphone est requis' })
      .min(5, 'Le numéro de téléphone doit faire au moins 5 caractères')
      .trim(),
    customerEmail: z
      .string()
      .email('L\'adresse email doit être valide')
      .optional()
      .nullable()
      .or(z.literal('')),
    reservationDate: z
      .string({ required_error: 'La date de la réservation est requise' })
      .refine(
        (val) => {
          const date = new Date(val);
          if (isNaN(date.getTime())) return false;
          
          // On s'assure que la date est aujourd'hui ou dans le futur (en réinitialisant les heures)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const compareDate = new Date(date);
          compareDate.setHours(0, 0, 0, 0);
          
          return compareDate >= today;
        },
        { message: 'La date de réservation doit être aujourd\'hui ou dans le futur' }
      ),
    reservationTime: z
      .string({ required_error: 'L\'heure de la réservation est requise' })
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Le format d\'heure doit être HH:MM (24h)')
      .refine(
        (val) => {
          const hour = Number(val.split(':')[0]);
          return hour >= 10 && hour <= 23;
        },
        { message: 'Les réservations sont autorisées uniquement de 10:00 à 23:00' }
      ),
    guestsCount: z
      .number({ required_error: 'Le nombre de convives est requis' })
      .int('Le nombre de convives doit être un nombre entier')
      .min(1, 'Le nombre de convives doit être d\'au moins 1 personne')
      .max(20, 'Le nombre de convives ne peut pas dépasser 20 personnes par réservation standard'),
    notes: z
      .string()
      .max(500, 'Les demandes spéciales ne doivent pas dépasser 500 caractères')
      .optional()
      .nullable(),
  }),
});

export const updateReservationSchema = z.object({
  body: z.object({
    customerName: z
      .string()
      .min(2, 'Le nom complet doit faire au moins 2 caractères')
      .max(100, 'Le nom complet ne doit pas dépasser 100 caractères')
      .optional(),
    customerPhone: z
      .string()
      .min(5, 'Le numéro de téléphone doit faire au moins 5 caractères')
      .optional(),
    customerEmail: z
      .string()
      .email('L\'adresse email doit être valide')
      .optional()
      .nullable()
      .or(z.literal('')),
    reservationDate: z
      .string()
      .refine(
        (val) => {
          const date = new Date(val);
          if (isNaN(date.getTime())) return false;
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const compareDate = new Date(date);
          compareDate.setHours(0, 0, 0, 0);
          
          return compareDate >= today;
        },
        { message: 'La date doit être aujourd\'hui ou dans le futur' }
      )
      .optional(),
    reservationTime: z
      .string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Le format d\'heure doit être HH:MM (24h)')
      .refine(
        (val) => {
          const hour = Number(val.split(':')[0]);
          return hour >= 10 && hour <= 23;
        },
        { message: 'Les réservations sont autorisées uniquement de 10:00 à 23:00' }
      )
      .optional(),
    guestsCount: z
      .number()
      .int()
      .min(1, 'Le nombre de convives doit être d\'au moins 1 personne')
      .max(20, 'Le nombre de convives ne peut pas dépasser 20 personnes')
      .optional(),
    status: z.nativeEnum(ReservationStatus).optional(),
    notes: z
      .string()
      .max(500, 'Les demandes spéciales ne doivent pas dépasser 500 caractères')
      .optional()
      .nullable(),
  }),
});

export const reservationQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.nativeEnum(ReservationStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ReservationQueryInput = z.infer<typeof reservationQuerySchema>;

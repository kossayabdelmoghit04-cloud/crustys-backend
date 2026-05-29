import { z } from 'zod';

/**
 * Zod validation schema for raw email payloads
 */
export const emailPayloadSchema = z.object({
  to: z.union([
    z.string().email('Adresse email du destinataire invalide'),
    z.array(z.string().email('Une ou plusieurs adresses email sont invalides')),
  ]),
  subject: z
    .string()
    .min(1, 'Le sujet de l\'email ne peut pas être vide')
    .max(150, 'Le sujet de l\'email ne peut pas dépasser 150 caractères'),
  text: z.string().optional(),
  html: z.string().optional(),
  from: z.string().optional(),
  replyTo: z.string().email('Adresse email de réponse invalide').optional(),
});

/**
 * Zod validation schema for templated email payloads
 */
export const emailTemplatePayloadSchema = z.object({
  to: z.union([
    z.string().email('Adresse email du destinataire invalide'),
    z.array(z.string().email('Une ou plusieurs adresses email sont invalides')),
  ]),
  subject: z
    .string()
    .min(1, 'Le sujet de l\'email ne peut pas être vide')
    .max(150, 'Le sujet de l\'email ne peut pas dépasser 150 caractères'),
  templateName: z.string().min(1, 'Le nom de template est requis'),
  props: z.record(z.any()),
  from: z.string().optional(),
  replyTo: z.string().email('Adresse email de réponse invalide').optional(),
});

/**
 * Validates a raw email payload and returns the parsed data
 */
export function validateEmailPayload(data: unknown) {
  return emailPayloadSchema.parse(data);
}

/**
 * Validates a templated email payload and returns the parsed data
 */
export function validateEmailTemplatePayload(data: unknown) {
  return emailTemplatePayloadSchema.parse(data);
}

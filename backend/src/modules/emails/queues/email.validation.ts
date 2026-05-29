import { z } from 'zod';
import { EMAILS_CONSTANTS } from '../emails.constants';

const welcomeEmailPropsSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  welcomeUrl: z.string().url('L\'URL de bienvenue doit être valide'),
});

const resetPasswordPropsSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  resetUrl: z.string().url('L\'URL de réinitialisation doit être valide'),
  expiresInMinutes: z.number().int().positive().default(15),
});

const orderItemSchema = z.object({
  name: z.string().min(1, 'Le nom de l\'article est requis'),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

const orderConfirmationPropsSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  orderNumber: z.string().min(1, 'Le numéro de commande est requis'),
  items: z.array(orderItemSchema).min(1, 'La commande doit contenir au moins un article'),
  totalPrice: z.number().nonnegative(),
  estimatedDelivery: z.string().min(1, 'Le délai de livraison estimé est requis'),
});

const reservationConfirmationPropsSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  date: z.string().min(1, 'La date de réservation est requise'),
  guests: z.number().int().positive(),
  specialRequests: z.string().optional().nullable(),
});

const refundNotificationPropsSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  refundAmount: z.number().positive(),
  paymentReference: z.string().min(1, 'La référence de transaction est requise'),
  reason: z.string().optional().nullable(),
});

const adminNotificationPropsSchema = z.object({
  orderNumber: z.string().min(1, 'Le numéro de commande est requis'),
  totalPrice: z.number().nonnegative(),
  deliveryType: z.string().min(1, 'Le type de remise est requis'),
  customerName: z.string().min(1, 'Le nom du client est requis'),
  adminDashboardUrl: z.string().url().optional(),
});

/**
 * Main Job Queue Payload Validation Schema
 */
export const emailJobPayloadSchema = z.object({
  to: z.string().email('Adresse e-mail invalide').trim().toLowerCase(),
  subject: z.string().min(1, 'L\'objet de l\'e-mail est requis'),
  templateName: z.nativeEnum(EMAILS_CONSTANTS.TEMPLATES, {
    errorMap: () => ({ message: 'Modèle d\'e-mail non reconnu ou invalide' })
  }),
  props: z.any(),
  metadata: z.record(z.any()).optional(),
}).superRefine((data, ctx) => {
  const { templateName, props } = data;
  let validationResult;

  switch (templateName) {
    case EMAILS_CONSTANTS.TEMPLATES.WELCOME_EMAIL:
      validationResult = welcomeEmailPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.RESET_PASSWORD:
      validationResult = resetPasswordPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.ORDER_CONFIRMATION:
      validationResult = orderConfirmationPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.RESERVATION_CONFIRMATION:
      validationResult = reservationConfirmationPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.REFUND_NOTIFICATION:
      validationResult = refundNotificationPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.ADMIN_NOTIFICATION:
      validationResult = adminNotificationPropsSchema.safeParse(props);
      break;
    case EMAILS_CONSTANTS.TEMPLATES.TEST_EMAIL:
      // Test email has optional/no props
      return;
    default:
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateName'],
        message: 'Modèle d\'e-mail non reconnu ou invalide',
      });
      return;
  }

  if (validationResult && !validationResult.success) {
    validationResult.error.issues.forEach((issue) => {
      ctx.addIssue({
        ...issue,
        path: ['props', ...issue.path],
      });
    });
  }
});

export type EmailJobPayload = z.infer<typeof emailJobPayloadSchema>;

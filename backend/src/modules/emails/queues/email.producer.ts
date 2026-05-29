import { emailQueue } from './email.queue';
import { emailJobPayloadSchema, EmailJobPayload } from './email.validation';
import { EMAILS_CONSTANTS } from '../emails.constants';
import { logger } from '../../../utils/logger';

/**
 * Enterprise Email Queue Producer
 * Responsible for validating job payloads and adding them to the Redis queue.
 */
export class EmailProducer {
  /**
   * Enqueues a generic email job with strict payload validation
   */
  public static async enqueue(payload: EmailJobPayload): Promise<string | undefined> {
    try {
      // 1. Validate payload with Zod schema
      const validatedPayload = emailJobPayloadSchema.parse(payload);

      // 2. Security Sanitation - never log token properties or raw props containing secrets
      const secureLogProps = {
        to: validatedPayload.to,
        templateName: validatedPayload.templateName,
        subject: validatedPayload.subject,
      };

      logger.info(`[Email Queue Producer] Enqueuing job for ${secureLogProps.to} with template ${secureLogProps.templateName}`);

      // 3. Add to BullMQ Queue
      // Job name is set to the templateName for clean classification
      const job = await emailQueue.add(validatedPayload.templateName, validatedPayload);

      return job.id;
    } catch (err: any) {
      logger.error(`[Email Queue Producer Error] Failed to enqueue email job: ${err.message}`);
      throw err;
    }
  }

  /**
   * Helper to enqueue welcome emails
   */
  public static async enqueueWelcomeEmail(
    to: string, 
    props: { firstName: string; welcomeUrl: string }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: "Bienvenue chez Crusty's Express !",
      templateName: EMAILS_CONSTANTS.TEMPLATES.WELCOME_EMAIL,
      props,
    });
  }

  /**
   * Helper to enqueue password reset emails
   */
  public static async enqueueResetPasswordEmail(
    to: string, 
    props: { firstName: string; resetUrl: string; expiresInMinutes?: number }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: 'Réinitialisation de votre mot de passe - Crusty\'s Express',
      templateName: EMAILS_CONSTANTS.TEMPLATES.RESET_PASSWORD,
      props: {
        firstName: props.firstName,
        resetUrl: props.resetUrl,
        expiresInMinutes: props.expiresInMinutes ?? 15,
      },
    });
  }

  /**
   * Helper to enqueue customer order confirmations
   */
  public static async enqueueOrderConfirmationEmail(
    to: string, 
    props: { 
      firstName: string; 
      orderNumber: string; 
      items: Array<{ name: string; quantity: number; price: number }>; 
      totalPrice: number; 
      estimatedDelivery: string; 
    }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: `Confirmation de votre commande ${props.orderNumber}`,
      templateName: EMAILS_CONSTANTS.TEMPLATES.ORDER_CONFIRMATION,
      props,
    });
  }

  /**
   * Helper to enqueue reservation confirmations
   */
  public static async enqueueReservationConfirmationEmail(
    to: string, 
    props: { firstName: string; date: string; guests: number; specialRequests?: string | null }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: 'Confirmation de votre réservation chez Crusty\'s Express',
      templateName: EMAILS_CONSTANTS.TEMPLATES.RESERVATION_CONFIRMATION,
      props,
    });
  }

  /**
   * Helper to enqueue refund confirmations
   */
  public static async enqueueRefundEmail(
    to: string, 
    props: { firstName: string; refundAmount: number; paymentReference: string; reason?: string | null }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: `Remboursement traité - Commande`,
      templateName: EMAILS_CONSTANTS.TEMPLATES.REFUND_NOTIFICATION,
      props,
    });
  }

  /**
   * Helper to enqueue admin new order alerts
   */
  public static async enqueueAdminAlertEmail(
    to: string, 
    props: { orderNumber: string; totalPrice: number; deliveryType: string; customerName: string; adminDashboardUrl?: string }
  ): Promise<string | undefined> {
    return this.enqueue({
      to,
      subject: `⚠️ Alerte : Nouvelle commande ${props.orderNumber}`,
      templateName: EMAILS_CONSTANTS.TEMPLATES.ADMIN_NOTIFICATION,
      props,
    });
  }
}

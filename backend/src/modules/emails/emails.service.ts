import { ReactElement } from 'react';
import { IEmailProvider, EmailPayload, EmailResponse, EmailTemplatePayload } from './emails.types';
import { MailtrapProvider } from './providers/mailtrap.provider';
import { ResendProvider } from './providers/resend.provider';
import { resolveTemplate } from './emails.templates';
import { validateEmailPayload, validateEmailTemplatePayload } from './emails.validation';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * Enterprise Service managing all outbound transactional emails
 */
export class EmailsService {
  private static provider: IEmailProvider;

  /**
   * Statically resolves and instantiates the configured email provider
   */
  private static getProvider(): IEmailProvider {
    if (!this.provider) {
      const selected = env.MAIL_PROVIDER;
      logger.info(`[Emails Service] Initializing mail provider: ${selected}`);

      switch (selected) {
        case 'resend':
          this.provider = new ResendProvider();
          break;
        case 'mailtrap':
        default:
          this.provider = new MailtrapProvider();
          break;
      }
    }
    return this.provider;
  }

  /**
   * Send a raw email containing HTML and text bodies
   */
  public static async sendEmail(payload: EmailPayload): Promise<EmailResponse> {
    try {
      // 1. Zod payload validation
      const validatedPayload = validateEmailPayload(payload);
      
      // 2. Select email provider
      const emailProvider = this.getProvider();

      logger.info(`[Emails Service] Dispatching raw email to ${validatedPayload.to} with subject: "${validatedPayload.subject}"`);
      
      // 3. Dispatch through concrete provider
      return await emailProvider.send(validatedPayload);
    } catch (error: any) {
      logger.error(`[Emails Service] Failed sending raw email: ${error.message}`, { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Render and dispatch a registered React Email template
   */
  public static async sendTemplateEmail(payload: EmailTemplatePayload): Promise<EmailResponse> {
    try {
      // 1. Zod template payload validation
      const validated = validateEmailTemplatePayload(payload);
      
      // 2. Select provider
      const emailProvider = this.getProvider();

      logger.info(`[Emails Service] Dispatching template email '${validated.templateName}' to ${validated.to}`);

      // 3. Resolve template element using factory registry
      const templateElement: ReactElement = resolveTemplate(validated.templateName, validated.props);

      const emailPayload: EmailPayload = {
        to: validated.to,
        subject: validated.subject,
        from: validated.from,
        replyTo: validated.replyTo,
      };

      // 4. Dispatch rendered template through provider
      return await emailProvider.sendTemplate(emailPayload, templateElement);
    } catch (error: any) {
      logger.error(`[Emails Service] Failed sending template email: ${error.message}`, { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

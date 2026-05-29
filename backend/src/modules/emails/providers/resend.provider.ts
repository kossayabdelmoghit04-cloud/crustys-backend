import * as React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { IEmailProvider, EmailPayload, EmailResponse } from '../emails.types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';

/**
 * Resend Provider for production transactional emails
 */
export class ResendProvider implements IEmailProvider {
  private resend: Resend;

  constructor() {
    const apiKey = env.RESEND_API_KEY || 're_mockapi_key_for_resend_integration';
    this.resend = new Resend(apiKey);
    logger.debug('[Resend Provider] Client initialized.');
  }

  /**
   * Send raw text or html email
   */
  public async send(payload: EmailPayload): Promise<EmailResponse> {
    try {
      const from = payload.from || env.MAIL_FROM || 'noreply@crustys.com';
      const to = Array.isArray(payload.to) ? payload.to : [payload.to];

      const { data, error } = await this.resend.emails.send({
        from,
        to,
        subject: payload.subject,
        text: payload.text || '',
        html: payload.html || '',
        replyTo: payload.replyTo,
      });

      if (error) {
        logger.error(`[Resend Provider] API Error response: ${error.message} (${error.name})`);
        return {
          success: false,
          error: error.message,
        };
      }

      logger.info(`[Resend Provider] Email sent successfully: id=${data?.id}`);
      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error: any) {
      logger.error(`[Resend Provider] Network/API exception: ${error.message}`, { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Render React Email element and send
   */
  public async sendTemplate(
    payload: EmailPayload,
    templateElement: React.ReactElement
  ): Promise<EmailResponse> {
    try {
      const html = await render(templateElement);
      const text = await render(templateElement, { plainText: true });

      return await this.send({
        ...payload,
        html,
        text,
      });
    } catch (error: any) {
      logger.error(`[Resend Provider] Template rendering failed: ${error.message}`, { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

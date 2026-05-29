import * as React from 'react';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import { IEmailProvider, EmailPayload, EmailResponse } from '../emails.types';
import { env } from '../../../config/env';
import { logger } from '../../../utils/logger';

/**
 * Mailtrap / Nodemailer SMTP Provider for sandbox/development environments
 */
export class MailtrapProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io';
    const port = env.MAILTRAP_PORT || 2525;
    const user = env.MAILTRAP_USER || '';
    const pass = env.MAILTRAP_PASS || '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
    });

    logger.debug(`[Mailtrap Provider] SMTP transporter initialized: ${host}:${port}`);
  }

  /**
   * Send raw text or html email
   */
  public async send(payload: EmailPayload): Promise<EmailResponse> {
    try {
      const from = payload.from || env.MAIL_FROM || 'noreply@crustys.com';
      const to = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;

      const info = await this.transporter.sendMail({
        from,
        to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        replyTo: payload.replyTo,
      });

      logger.info(`[Mailtrap Provider] Email sent successfully: messageId=${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error(`[Mailtrap Provider] Send failure: ${error.message}`, { error });
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
      // Render components to html and plain-text fallbacks
      const html = await render(templateElement);
      const text = await render(templateElement, { plainText: true });

      return await this.send({
        ...payload,
        html,
        text,
      });
    } catch (error: any) {
      logger.error(`[Mailtrap Provider] Template render/send failure: ${error.message}`, { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

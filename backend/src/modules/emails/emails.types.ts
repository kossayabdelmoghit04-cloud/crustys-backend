import { ReactElement } from 'react';

/**
 * Supported email providers in our SaaS architecture
 */
export type EmailProviderName = 'resend' | 'mailtrap';

/**
 * Standard email payload structure
 */
export interface EmailPayload {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Options for sending templated emails
 */
export interface EmailTemplatePayload {
  to: string | string[];
  subject: string;
  templateName: string;
  props: Record<string, any>;
  from?: string;
  replyTo?: string;
}

/**
 * Standard response envelope returned by all email providers
 */
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Interface that all email providers must implement
 */
export interface IEmailProvider {
  /**
   * Sends a raw email (with text and/or html body)
   */
  send(payload: EmailPayload): Promise<EmailResponse>;

  /**
   * Renders a React Email template and sends it
   */
  sendTemplate(
    payload: EmailPayload,
    templateElement: ReactElement
  ): Promise<EmailResponse>;
}

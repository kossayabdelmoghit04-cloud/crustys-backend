import { ReactElement } from 'react';
import { render } from '@react-email/render';
import { resolveTemplate } from './emails.templates';

/**
 * Renders a registered React Email template to an HTML string (Async)
 */
export async function renderEmailTemplate(templateName: string, props: any): Promise<string> {
  const element = resolveTemplate(templateName, props);
  return await render(element);
}

/**
 * Standardizes email addresses (converts to lowercase, trims whitespace)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Defensive sanitization of input addresses to prevent headers/SMTP injection attacks
 */
export function sanitizeEmailInput(email: string): string {
  // Strip control characters, carriage returns, newlines, and quotes
  return email
    .replace(/[\r\n\t]/g, '')
    .replace(/[<>'"\\;]/g, '')
    .trim();
}

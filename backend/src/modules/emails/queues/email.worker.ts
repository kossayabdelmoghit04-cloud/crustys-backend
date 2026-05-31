import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../../../config/redis';
import { EMAIL_QUEUE_NAME } from './email.queue';
import { EmailsService } from '../emails.service';
import { MailtrapProvider } from '../providers/mailtrap.provider';
import { resolveTemplate } from '../emails.templates';
import { EmailJobPayload } from './email.validation';
import { logger } from '../../../utils/logger';
import { DIAGNOSTIC_CONFIG } from '../../../config/diagnostics';

/**
 * BullMQ Email Worker
 * Consumes email jobs from the Redis queue and handles delivery and fallback.
 */
export const emailWorker = DIAGNOSTIC_CONFIG.enableBullMQ
  ? new Worker(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobPayload>) => {
        const payload = job.data;
        
        // Security Sanitation: Log generic job processing without exposing tokens or secrets
        logger.info(
          `[Email Worker] Processing Job ID: ${job.id} | Template: ${payload.templateName} | Recipient: ${payload.to} | Attempt: ${job.attemptsMade + 1}`
        );

        try {
          // 1. Dispatch through default configured provider (e.g. Resend or Mailtrap)
          const result = await EmailsService.sendTemplateEmail({
            to: payload.to,
            subject: payload.subject,
            templateName: payload.templateName,
            props: payload.props,
          });

          // 2. Fallback strategy if primary provider failed
          if (!result.success) {
            logger.warn(
              `[Email Worker] Primary provider failed to send email to ${payload.to}: ${result.error}. Attempting fallback to Mailtrap...`
            );

            const fallback = new MailtrapProvider();
            const templateElement = resolveTemplate(payload.templateName, payload.props);
            const emailPayload = {
              to: payload.to,
              subject: payload.subject,
            };

            const fallbackResult = await fallback.sendTemplate(emailPayload, templateElement);
            
            if (!fallbackResult.success) {
              throw new Error(
                `Both primary and fallback providers failed to deliver email: ${fallbackResult.error}`
              );
            }

            logger.info(`[Email Worker] Fallback provider delivered email successfully to ${payload.to}`);
            return { success: true, provider: 'mailtrap_fallback' };
          }

          logger.info(`[Email Worker] Job ID: ${job.id} successfully completed email delivery to ${payload.to}`);
          return { success: true, provider: 'primary' };

        } catch (error: any) {
          // Throwing error here signals BullMQ to trigger retry attempts based on backoff config
          logger.error(
            `[Email Worker Error] Job ID: ${job.id} failed on attempt ${job.attemptsMade + 1}: ${error.message}`
          );
          throw error;
        }
      },
      {
        connection: redisConnectionOptions,
        concurrency: 5, // Process up to 5 jobs concurrently per worker instance
      }
    )
  : ({
      on: (event: string, listener: (...args: any[]) => void) => {
        logger.info(`[Email Worker Stub] Event listener registered for event: ${event}`);
      },
    } as unknown as Worker);

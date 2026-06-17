import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const notificationQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : undefined)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : undefined)),
    isRead: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
    type: z.nativeEnum(NotificationType).optional(),
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

export const deleteNotificationSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});

import { NotificationType } from '@prisma/client';

export interface CreateNotificationDTO {
  title: string;
  message: string;
  type: NotificationType;
  metadata?: any;
  adminId?: string;
}

export interface NotificationQueryFilters {
  page?: string | number;
  limit?: string | number;
  isRead?: string | boolean;
  type?: NotificationType;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  today: number;
}

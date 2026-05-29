import { PaymentStatus, PaymentMethod } from '@prisma/client';

export interface CreatePaymentIntentDTO {
  orderId: string;
  paymentMethodType?: string; // e.g. "card"
}

export interface RefundPaymentDTO {
  reason?: string;
}

export interface PaymentQueryFilters {
  page?: string | number;
  limit?: string | number;
  status?: PaymentStatus;
  method?: PaymentMethod;
  orderId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

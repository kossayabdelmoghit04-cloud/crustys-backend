import { OrderStatus } from '@prisma/client';

export interface CreateOrderItemDTO {
  productId: string;
  quantity: number;
}

export interface CreateOrderDTO {
  deliveryType: string; // e.g. "delivery", "pickup", "dine_in"
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
  paymentMethod: string; // e.g. "cash", "card", "stripe", "paypal"
  items: CreateOrderItemDTO[];
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
}

export interface OrderQueryFilters {
  page?: string | number;
  limit?: string | number;
  status?: OrderStatus;
  userId?: string;
  minTotal?: string | number;
  maxTotal?: string | number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SalesStatistics {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  revenueByPaymentMethod: {
    paymentMethod: string;
    amount: number;
  }[];
  revenueByStatus: {
    status: OrderStatus;
    amount: number;
  }[];
  popularProducts: {
    productId: string;
    name: string;
    quantitySold: number;
    revenue: number;
  }[];
}

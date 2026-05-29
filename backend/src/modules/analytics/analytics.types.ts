export interface AnalyticsQueryFilters {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  categoryId?: string;
  paymentMethod?: 'CARD' | 'CASH' | 'STRIPE';
  orderStatus?: string;
}

export interface DashboardSummary {
  revenue: {
    totalRevenue: number;
    todayRevenue: number;
    thisWeekRevenue: number;
    thisMonthRevenue: number;
    growthPercentage: number;
  };
  orders: {
    totalOrders: number;
    todayOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    averageOrderValue: number;
    growthPercentage: number;
  };
  products: {
    totalProductsSold: number;
    topProducts: Array<{
      productId: string;
      name: string;
      quantitySold: number;
      revenue: number;
    }>;
    outOfStockCount: number;
  };
  customers: {
    totalCustomers: number;
    newCustomersCount: number;
    activeCustomersCount: number;
  };
  charts: {
    revenueTimeline: Array<{
      date: string;
      amount: number;
    }>;
    ordersTimeline: Array<{
      date: string;
      count: number;
    }>;
    bestHours: Array<{
      hour: number;
      ordersCount: number;
      revenue: number;
    }>;
  };
}

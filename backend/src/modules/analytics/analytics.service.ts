import { prisma } from '../../utils/prisma';
import { PaymentStatus, OrderStatus, PaymentMethod } from '@prisma/client';
import { AnalyticsQueryFilters, DashboardSummary } from './analytics.types';
import { logger } from '../../utils/logger';

export class AnalyticsService {
  /**
   * Résout les dates pour la période actuelle et la période de comparaison précédente
   */
  private static parsePeriodDates(filters: AnalyticsQueryFilters) {
    let startDate = filters.startDate ? new Date(filters.startDate) : new Date();
    let endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    if (!filters.startDate) {
      // Par défaut, les 30 derniers jours
      startDate.setDate(startDate.getDate() - 30);
    }
    
    // Normalisation des heures
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const durationMs = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - durationMs);
    const previousEndDate = new Date(startDate.getTime() - 1); // s'arrête juste avant la date actuelle

    return {
      current: { start: startDate, end: endDate },
      previous: { start: previousStartDate, end: previousEndDate },
    };
  }

  /**
   * Endpoint Dashboard Global : regroupe les KPIs essentiels et graphiques principaux
   */
  public static async getDashboard(filters: AnalyticsQueryFilters): Promise<DashboardSummary> {
    const { current, previous } = this.parsePeriodDates(filters);
    logger.info(`[Analytics] Requête de dashboard reçue pour la période : ${current.start.toISOString()} à ${current.end.toISOString()}`);

    // --- REVENUS ---
    // 1. Chiffre d'affaires total historique (sur les commandes payées/livrées)
    const totalRevResult = await prisma.order.aggregate({
      where: {
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });
    const totalRevenue = totalRevResult._sum.totalPrice || 0;

    // 2. Revenu aujourd'hui
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayRevResult = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });
    const todayRevenue = todayRevResult._sum.totalPrice || 0;

    // 3. Revenu cette semaine
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekRevResult = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfWeek },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });
    const thisWeekRevenue = weekRevResult._sum.totalPrice || 0;

    // 4. Revenu ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthRevResult = await prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });
    const thisMonthRevenue = monthRevResult._sum.totalPrice || 0;

    // 5. Revenu période actuelle vs précédente pour croissance
    const currentPeriodRev = await prisma.order.aggregate({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });
    const previousPeriodRev = await prisma.order.aggregate({
      where: {
        createdAt: { gte: previous.start, lte: previous.end },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        paymentStatus: 'paid',
      },
      _sum: { totalPrice: true },
    });

    const currentRevAmount = currentPeriodRev._sum.totalPrice || 0;
    const previousRevAmount = previousPeriodRev._sum.totalPrice || 0;
    let growthPercentage = 0;
    if (previousRevAmount > 0) {
      growthPercentage = ((currentRevAmount - previousRevAmount) / previousRevAmount) * 100;
    }

    // --- COMMANDES ---
    // 1. Total commandes historique
    const totalOrders = await prisma.order.count();

    // 2. Commandes aujourd'hui
    const todayOrders = await prisma.order.count({
      where: { createdAt: { gte: startOfToday, lte: endOfToday } },
    });

    // 3. Commandes livrées et annulées (période actuelle)
    const completedOrders = await prisma.order.count({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: OrderStatus.DELIVERED,
      },
    });

    const cancelledOrders = await prisma.order.count({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: OrderStatus.CANCELLED,
      },
    });

    // 4. Panier moyen (AOV) sur la période actuelle
    const currentOrdersStats = await prisma.order.aggregate({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      _count: { id: true },
      _sum: { totalPrice: true },
    });
    const currentOrdersCount = currentOrdersStats._count.id || 0;
    const currentOrdersSum = currentOrdersStats._sum.totalPrice || 0;
    const averageOrderValue = currentOrdersCount > 0 ? currentOrdersSum / currentOrdersCount : 0;

    // Croissance commandes %
    const previousOrdersCount = await prisma.order.count({
      where: {
        createdAt: { gte: previous.start, lte: previous.end },
      },
    });
    let ordersGrowth = 0;
    if (previousOrdersCount > 0) {
      ordersGrowth = ((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100;
    }

    // --- PRODUITS ---
    // 1. Top produits vendus
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: current.start, lte: current.end },
          orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        },
      },
      include: {
        product: { select: { name: true } },
      },
    });

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    let totalProductsSold = 0;
    orderItems.forEach((item) => {
      const prev = productMap.get(item.productId) || { name: item.product.name, quantity: 0, revenue: 0 };
      productMap.set(item.productId, {
        name: item.product.name,
        quantity: prev.quantity + item.quantity,
        revenue: prev.revenue + item.subtotal,
      });
      totalProductsSold += item.quantity;
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, val]) => ({
        productId,
        name: val.name,
        quantitySold: val.quantity,
        revenue: val.revenue,
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5);

    // 2. Produits en rupture de stock
    const outOfStockCount = await prisma.product.count({
      where: { stockQuantity: 0 },
    });

    // --- CLIENTS ---
    // 1. Nombre total de clients
    const totalCustomers = await prisma.user.count();

    // 2. Nouveaux clients (créés sur la période actuelle)
    const newCustomersCount = await prisma.user.count({
      where: { createdAt: { gte: current.start, lte: current.end } },
    });

    // 3. Clients actifs (ayant fait une commande sur la période actuelle)
    const activeCustomersResult = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: current.start, lte: current.end },
        userId: { not: null },
      },
    });
    const activeCustomersCount = activeCustomersResult.length;

    // --- CHART DATA (TENDANCES & HORAIRES PÉRIODE ACTUELLE) ---
    // 1. Timeline revenus & commandes journalière
    const timelineOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: { not: OrderStatus.CANCELLED },
      },
      select: {
        createdAt: true,
        totalPrice: true,
      },
    });

    const timelineMap = new Map<string, { revenue: number; count: number }>();
    timelineOrders.forEach((o) => {
      const dateKey = o.createdAt.toISOString().slice(0, 10); // format "YYYY-MM-DD"
      const prev = timelineMap.get(dateKey) || { revenue: 0, count: 0 };
      timelineMap.set(dateKey, {
        revenue: prev.revenue + o.totalPrice,
        count: prev.count + 1,
      });
    });

    const sortedDates = Array.from(timelineMap.keys()).sort();
    const revenueTimeline = sortedDates.map((date) => ({
      date,
      amount: timelineMap.get(date)!.revenue,
    }));
    const ordersTimeline = sortedDates.map((date) => ({
      date,
      count: timelineMap.get(date)!.count,
    }));

    // 2. Best hours (Heatmap horaire)
    const bestHoursMap = new Map<number, { ordersCount: number; revenue: number }>();
    // Initialisation 24h
    for (let i = 0; i < 24; i++) {
      bestHoursMap.set(i, { ordersCount: 0, revenue: 0 });
    }

    timelineOrders.forEach((o) => {
      const hour = o.createdAt.getHours();
      const prev = bestHoursMap.get(hour) || { ordersCount: 0, revenue: 0 };
      bestHoursMap.set(hour, {
        ordersCount: prev.ordersCount + 1,
        revenue: prev.revenue + o.totalPrice,
      });
    });

    const bestHours = Array.from(bestHoursMap.entries()).map(([hour, val]) => ({
      hour,
      ordersCount: val.ordersCount,
      revenue: val.revenue,
    }));

    return {
      revenue: {
        totalRevenue,
        todayRevenue,
        thisWeekRevenue,
        thisMonthRevenue,
        growthPercentage,
      },
      orders: {
        totalOrders,
        todayOrders,
        completedOrders,
        cancelledOrders,
        averageOrderValue,
        growthPercentage: ordersGrowth,
      },
      products: {
        totalProductsSold,
        topProducts,
        outOfStockCount,
      },
      customers: {
        totalCustomers,
        newCustomersCount,
        activeCustomersCount,
      },
      charts: {
        revenueTimeline,
        ordersTimeline,
        bestHours,
      },
    };
  }

  /**
   * Analytics détaillés des Revenus
   */
  public static async getRevenueAnalytics(filters: AnalyticsQueryFilters) {
    const { current } = this.parsePeriodDates(filters);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
      },
      include: {
        payments: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // 1. Revenue by Payment Method
    const methodMap = new Map<string, number>();
    // Initialiser
    methodMap.set(PaymentMethod.CASH, 0);
    methodMap.set(PaymentMethod.CARD, 0);
    methodMap.set(PaymentMethod.STRIPE, 0);

    orders.forEach((o) => {
      o.payments.forEach((p) => {
        if (p.paymentStatus === PaymentStatus.PAID) {
          const prev = methodMap.get(p.paymentMethod) || 0;
          methodMap.set(p.paymentMethod, prev + p.amount);
        }
      });
    });

    const revenueByPaymentMethod = Array.from(methodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
    }));

    // 2. Revenue by Category
    const categoryMap = new Map<string, { name: string; amount: number }>();
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const cat = item.product.category;
        if (cat) {
          const prev = categoryMap.get(cat.id) || { name: cat.name, amount: 0 };
          categoryMap.set(cat.id, {
            name: cat.name,
            amount: prev.amount + item.subtotal,
          });
        }
      });
    });

    const revenueByCategory = Array.from(categoryMap.entries()).map(([categoryId, val]) => ({
      categoryId,
      name: val.name,
      amount: val.amount,
    }));

    // 3. Revenue by Delivery Type
    const deliveryMap = new Map<string, number>();
    orders.forEach((o) => {
      const prev = deliveryMap.get(o.deliveryType) || 0;
      deliveryMap.set(o.deliveryType, prev + o.totalPrice);
    });

    const revenueByDeliveryType = Array.from(deliveryMap.entries()).map(([deliveryType, amount]) => ({
      deliveryType,
      amount,
    }));

    return {
      period: {
        start: current.start,
        end: current.end,
      },
      revenueByPaymentMethod,
      revenueByCategory,
      revenueByDeliveryType,
    };
  }

  /**
   * Analytics détaillés des Commandes
   */
  public static async getOrderAnalytics(filters: AnalyticsQueryFilters) {
    const { current } = this.parsePeriodDates(filters);

    const ordersGrouped = await prisma.order.groupBy({
      by: ['orderStatus'],
      where: {
        createdAt: { gte: current.start, lte: current.end },
      },
      _count: {
        id: true,
      },
    });

    const ordersByStatus = ordersGrouped.map((grp) => ({
      status: grp.orderStatus,
      count: grp._count.id,
    }));

    const totalOrders = await prisma.order.count({
      where: { createdAt: { gte: current.start, lte: current.end } },
    });

    const deliveredOrders = await prisma.order.count({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: OrderStatus.DELIVERED,
      },
    });

    const cancelledOrders = await prisma.order.count({
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: OrderStatus.CANCELLED,
      },
    });

    return {
      period: {
        start: current.start,
        end: current.end,
      },
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      ordersByStatus,
    };
  }

  /**
   * Analytics détaillés des Produits & Catégories
   */
  public static async getProductAnalytics(filters: AnalyticsQueryFilters) {
    const { current } = this.parsePeriodDates(filters);

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: current.start, lte: current.end },
          orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();
    orderItems.forEach((item) => {
      const prev = productStats.get(item.productId) || { name: item.product.name, quantity: 0, revenue: 0 };
      productStats.set(item.productId, {
        name: item.product.name,
        quantity: prev.quantity + item.quantity,
        revenue: prev.revenue + item.subtotal,
      });
    });

    const allProducts = Array.from(productStats.entries()).map(([productId, val]) => ({
      productId,
      name: val.name,
      quantitySold: val.quantity,
      revenue: val.revenue,
    }));

    // 1. Top produits
    const topProducts = [...allProducts].sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);

    // 2. Produits les plus rentables
    const profitableProducts = [...allProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // 3. Produits les moins vendus
    const leastSoldProducts = [...allProducts].sort((a, b) => a.quantitySold - b.quantitySold).slice(0, 10);

    // 4. Produits en rupture
    const outOfStockProducts = await prisma.product.findMany({
      where: { stockQuantity: 0 },
      select: { id: true, name: true, price: true, isAvailable: true },
    });

    return {
      period: {
        start: current.start,
        end: current.end,
      },
      topProducts,
      profitableProducts,
      leastSoldProducts,
      outOfStockProducts,
    };
  }

  /**
   * Analytics détaillés des Clients
   */
  public static async getCustomerAnalytics(filters: AnalyticsQueryFilters) {
    const { current } = this.parsePeriodDates(filters);

    // 1. Nouveaux clients
    const newCustomersCount = await prisma.user.count({
      where: { createdAt: { gte: current.start, lte: current.end } },
    });

    // 2. Top clients par dépenses sur la période actuelle
    const topClientsAggregation = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: current.start, lte: current.end },
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        userId: { not: null },
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalPrice: 'desc',
        },
      },
      take: 10,
    });

    // Chercher les détails des users pour le retour
    const userIds = topClientsAggregation.map((c) => c.userId as string);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topCustomers = topClientsAggregation.map((item) => {
      const u = userMap.get(item.userId as string);
      return {
        customerId: item.userId,
        fullName: u?.fullName || 'Client Anonyme',
        email: u?.email || 'N/A',
        totalSpent: item._sum.totalPrice || 0,
        ordersCount: item._count.id || 0,
      };
    });

    // 3. Fréquence des commandes & Lifetime Value moyenne
    const allUserSpentAggregation = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        orderStatus: { in: [OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING, OrderStatus.DELIVERED] },
        userId: { not: null },
      },
      _sum: {
        totalPrice: true,
      },
      _count: {
        id: true,
      },
    });

    const totalCustomersWithOrders = allUserSpentAggregation.length;
    let averageOrdersCountPerCustomer = 0;
    let averageLifetimeValue = 0;

    if (totalCustomersWithOrders > 0) {
      const sumOrders = allUserSpentAggregation.reduce((acc, c) => acc + c._count.id, 0);
      const sumSpent = allUserSpentAggregation.reduce((acc, c) => acc + (c._sum.totalPrice || 0), 0);
      averageOrdersCountPerCustomer = sumOrders / totalCustomersWithOrders;
      averageLifetimeValue = sumSpent / totalCustomersWithOrders;
    }

    return {
      period: {
        start: current.start,
        end: current.end,
      },
      newCustomersCount,
      topCustomers,
      frequency: {
        totalCustomersWithOrders,
        averageOrdersCountPerCustomer,
        averageLifetimeValue,
      },
    };
  }
}

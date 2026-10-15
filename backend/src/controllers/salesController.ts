import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { forecastDemand, recommendItems, DemandDayInput } from '../services/aiService';

const DAY_MS = 24 * 60 * 60 * 1000;

// Public holidays (MM-DD) used by both the demand model's training data and live features
const HOLIDAYS = ['01-01', '02-04', '04-13', '04-14', '05-01', '12-25'];

// Local-time YYYY-MM-DD (toISOString would shift days in UTC+5:30)
const toDateKey = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isHoliday = (d: Date) => HOLIDAYS.includes(toDateKey(d).slice(5));

/**
 * Sales analytics for the dashboard: KPIs, daily revenue trend,
 * top-selling items and revenue by category (completed orders only).
 */
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    const days = Math.min(parseInt((req.query.days as string) || '30', 10) || 30, 365);

    const since = startOfDay(new Date(Date.now() - (days - 1) * DAY_MS));
    const branchFilter: any = branchId ? { branchId: branchId as string } : {};

    const [completedOrders, statusCounts] = await Promise.all([
      prisma.order.findMany({
        where: { ...branchFilter, status: 'completed', createdAt: { gte: since } },
        include: { orderItems: { include: { menuItem: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: { ...branchFilter, createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    // --- KPIs ---
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = completedOrders.length;
    const byStatus: Record<string, number> = { pending: 0, completed: 0, cancelled: 0 };
    statusCounts.forEach((s) => {
      byStatus[s.status] = s._count._all;
    });

    // --- Revenue by day (zero-filled so the chart has no gaps) ---
    const dayMap: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      dayMap[toDateKey(new Date(since.getTime() + i * DAY_MS))] = { revenue: 0, orders: 0 };
    }
    completedOrders.forEach((o) => {
      const key = toDateKey(o.createdAt);
      if (dayMap[key]) {
        dayMap[key].revenue += o.totalAmount;
        dayMap[key].orders += 1;
      }
    });
    const revenueByDay = Object.entries(dayMap).map(([date, v]) => ({
      date,
      revenue: parseFloat(v.revenue.toFixed(2)),
      orders: v.orders,
    }));

    // --- Top items & category revenue ---
    const itemStats: Record<
      string,
      { id: string; name: string; category: string; quantity: number; revenue: number }
    > = {};
    const categoryRevenue: Record<string, number> = {};

    completedOrders.forEach((o) =>
      o.orderItems.forEach((oi) => {
        const lineTotal = oi.price * oi.quantity;
        if (!itemStats[oi.menuItemId]) {
          itemStats[oi.menuItemId] = {
            id: oi.menuItemId,
            name: oi.menuItem.name,
            category: oi.menuItem.category,
            quantity: 0,
            revenue: 0,
          };
        }
        itemStats[oi.menuItemId].quantity += oi.quantity;
        itemStats[oi.menuItemId].revenue += lineTotal;
        categoryRevenue[oi.menuItem.category] =
          (categoryRevenue[oi.menuItem.category] || 0) + lineTotal;
      })
    );

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((i) => ({ ...i, revenue: parseFloat(i.revenue.toFixed(2)) }));

    const revenueByCategory = Object.entries(categoryRevenue)
      .map(([category, revenue]) => ({ category, revenue: parseFloat(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);

    return res.status(200).json({
      success: true,
      data: {
        period: `Last ${days} days`,
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalOrders,
          avgOrderValue: totalOrders ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
          byStatus,
        },
        revenueByDay,
        topItems,
        revenueByCategory,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * AI demand forecast for the next N days.
 * Builds lag features from real completed orders, calls the trained
 * Random Forest model and stores each prediction in DemandPrediction.
 */
export const getSalesForecastDashboard = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.params;
    const horizon = Math.min(parseInt((req.query.days as string) || '7', 10) || 7, 14);

    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    const today = startOfDay(new Date());
    const historyStart = new Date(today.getTime() - 14 * DAY_MS);

    const recentOrders = await prisma.order.findMany({
      where: { branchId, status: 'completed', createdAt: { gte: historyStart, lt: today } },
      select: { totalAmount: true, createdAt: true },
    });

    // Actual daily history (last 14 days) for the chart
    const historyMap: Record<string, { orders: number; sales: number }> = {};
    for (let i = 0; i < 14; i++) {
      historyMap[toDateKey(new Date(historyStart.getTime() + i * DAY_MS))] = { orders: 0, sales: 0 };
    }
    recentOrders.forEach((o) => {
      const key = toDateKey(o.createdAt);
      if (historyMap[key]) {
        historyMap[key].orders += 1;
        historyMap[key].sales += o.totalAmount;
      }
    });
    const history = Object.entries(historyMap).map(([date, v]) => ({
      date,
      orders: v.orders,
      sales: parseFloat(v.sales.toFixed(2)),
    }));

    // Lag features: average of the last 7 full days
    const last7 = history.slice(-7);
    const past7AvgOrders = last7.reduce((s, d) => s + d.orders, 0) / 7;
    const past7AvgSales = last7.reduce((s, d) => s + d.sales, 0) / 7;

    const days: DemandDayInput[] = [];
    for (let i = 0; i < horizon; i++) {
      const d = new Date(today.getTime() + i * DAY_MS);
      days.push({
        date: toDateKey(d),
        day_of_week: (d.getDay() + 6) % 7, // JS Sunday=0 -> Python Monday=0
        month: d.getMonth() + 1,
        is_holiday: isHoliday(d),
      });
    }

    let result;
    try {
      result = await forecastDemand({
        days,
        past_7day_avg_orders: past7AvgOrders,
        past_7day_avg_sales: past7AvgSales,
      });
    } catch (aiError: any) {
      return res.status(503).json({
        error: 'AI service unavailable. Make sure the Python service is running on :8000.',
        details: aiError.response?.data || aiError.message,
      });
    }

    // Persist predictions for later accuracy tracking
    await prisma.demandPrediction.createMany({
      data: result.forecast.map((f) => ({
        date: new Date(f.date),
        predictedOrders: f.predicted_orders,
        predictedSales: f.predicted_sales,
      })),
    });

    return res.status(200).json({
      success: true,
      data: {
        basis: {
          past7AvgOrders: parseFloat(past7AvgOrders.toFixed(1)),
          past7AvgSales: parseFloat(past7AvgSales.toFixed(2)),
          historyOrders: recentOrders.length,
        },
        history,
        forecast: result.forecast,
        model: result.model,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * AI cross-sell recommendations for a menu item.
 * Sends real order baskets to the association-rule engine and stores
 * the top suggestions in the Recommendation table.
 */
export const getAIRecommendations = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;
    const { branchId } = req.query;

    if (!menuItemId) {
      return res.status(400).json({ error: 'Menu Item ID is required' });
    }

    const since = new Date(Date.now() - 90 * DAY_MS);
    const branchFilter: any = branchId ? { branchId: branchId as string } : {};

    // Two parallel queries: every line item of recent completed orders, and the menu
    const [lineItems, menuItems] = await Promise.all([
      prisma.orderItem.findMany({
        where: { order: { ...branchFilter, status: 'completed', createdAt: { gte: since } } },
        select: { orderId: true, menuItemId: true },
      }),
      prisma.menuItem.findMany({ select: { id: true, name: true, category: true } }),
    ]);

    const target = menuItems.find((m) => m.id === menuItemId);
    if (!target) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Group line items into baskets (one set of distinct items per order)
    const baskets = new Map<string, Set<string>>();
    lineItems.forEach((li) => {
      if (!baskets.has(li.orderId)) baskets.set(li.orderId, new Set());
      baskets.get(li.orderId)!.add(li.menuItemId);
    });
    const transactions = Array.from(baskets.values(), (b) => Array.from(b));

    const items: Record<string, string> = {};
    menuItems.forEach((m) => {
      items[m.id] = m.name;
    });

    let result;
    try {
      result = await recommendItems({ target_item_id: menuItemId, transactions, items });
    } catch (aiError: any) {
      return res.status(503).json({
        error: 'AI service unavailable. Make sure the Python service is running on :8000.',
        details: aiError.response?.data || aiError.message,
      });
    }

    // Keep only the latest recommendation set for this item. This is a history
    // record the response doesn't depend on, so it's saved without blocking it.
    prisma
      .$transaction([
        prisma.recommendation.deleteMany({ where: { menuItemId } }),
        prisma.recommendation.createMany({
          data: result.recommended_items.map((r) => ({
            menuItemId,
            recommendedItem: r.name,
            frequency: r.frequency,
            confidence: r.confidence,
          })),
        }),
      ])
      .catch((err) => console.error('Failed to save recommendations:', err.message));

    return res.status(200).json({
      success: true,
      data: {
        item: { id: target.id, name: target.name, category: target.category },
        transactionsAnalyzed: transactions.length,
        method: result.method,
        recommendations: result.recommended_items,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

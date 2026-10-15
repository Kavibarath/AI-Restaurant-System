/**
 * Sales Intelligence Service (Member A)
 * Centralized API client for menu, orders, sales analytics & AI predictions.
 */
import { authAxios } from './authService';
import { DEFAULT_BRANCH_ID } from './inventoryService';

/* ============================ TYPES ============================ */
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  branchId: string;
  _count?: { orderItems: number };
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  menuItem?: MenuItem;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  branchId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  customer?: Customer;
  orderItems: OrderItem[];
}

export interface SalesAnalytics {
  period: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    byStatus: Record<OrderStatus, number>;
  };
  revenueByDay: { date: string; revenue: number; orders: number }[];
  topItems: { id: string; name: string; category: string; quantity: number; revenue: number }[];
  revenueByCategory: { category: string; revenue: number }[];
}

export interface DemandForecastDay {
  date: string;
  predicted_orders: number;
  predicted_sales: number;
  confidence: number;
}

export interface DemandForecast {
  basis: { past7AvgOrders: number; past7AvgSales: number; historyOrders: number };
  history: { date: string; orders: number; sales: number }[];
  forecast: DemandForecastDay[];
  model: string;
}

export interface RecommendedItem {
  id: string;
  name: string;
  support: number;
  confidence: number;
  lift: number;
  frequency: number;
}

export interface RecommendationResult {
  item: { id: string; name: string; category: string };
  transactionsAnalyzed: number;
  method: string;
  recommendations: RecommendedItem[];
}

/* =========================== MENU =========================== */
export const getMenu = async (branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/menu?branchId=${branchId}`);
  return res.data.data as MenuItem[];
};

export const createMenuItem = async (data: {
  name: string;
  description?: string;
  price: number;
  category: string;
  branchId?: string;
}) => {
  const res = await authAxios.post('/api/menu', { branchId: DEFAULT_BRANCH_ID, ...data });
  return res.data.data as MenuItem;
};

export const updateMenuItem = async (
  id: string,
  data: { name?: string; description?: string; price?: number; category?: string }
) => {
  const res = await authAxios.put(`/api/menu/${id}`, data);
  return res.data.data as MenuItem;
};

export const deleteMenuItem = async (id: string) => {
  const res = await authAxios.delete(`/api/menu/${id}`);
  return res.data;
};

/* =========================== ORDERS =========================== */
export const getOrders = async (status?: OrderStatus, branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(
    `/api/orders?branchId=${branchId}${status ? `&status=${status}` : ''}`
  );
  return res.data as {
    summary: { total: number; pending: number; completed: number; cancelled: number };
    data: Order[];
  };
};

export const createOrder = async (data: {
  items: { menuItemId: string; quantity: number }[];
  customerName?: string;
  customerEmail?: string;
  branchId?: string;
}) => {
  const res = await authAxios.post('/api/orders', { branchId: DEFAULT_BRANCH_ID, ...data });
  return res.data.data as Order;
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const res = await authAxios.put(`/api/orders/${id}/status`, { status });
  return res.data.data as Order;
};

export const deleteOrder = async (id: string) => {
  const res = await authAxios.delete(`/api/orders/${id}`);
  return res.data;
};

/* ======================= SALES ANALYTICS ======================= */
export const getSalesAnalytics = async (days = 30, branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/sales/analytics?branchId=${branchId}&days=${days}`);
  return res.data.data as SalesAnalytics;
};

/* ======================= AI PREDICTIONS ======================= */
export const getDemandForecast = async (days = 7, branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/sales/forecast/${branchId}?days=${days}`);
  return res.data.data as DemandForecast;
};

export const getRecommendations = async (menuItemId: string, branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/sales/recommendations/${menuItemId}?branchId=${branchId}`);
  return res.data.data as RecommendationResult;
};

/* ========================== HELPERS ========================== */
export const formatRs = (value: number) =>
  `Rs. ${value.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

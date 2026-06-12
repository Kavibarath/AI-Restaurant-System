/**
 * Inventory Intelligence Service (Member B)
 * Centralized API client for ingredients, inventory, suppliers, waste & AI predictions.
 */
import { authAxios } from './authService';

// Default branch seeded in the database (backend/prisma/seed.ts)
export const DEFAULT_BRANCH_ID = 'default-branch';

/* ============================ TYPES ============================ */
export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  branchId: string;
  inventory?: InventoryItem[];
  _count?: { wasteRecords: number; inventoryPredictions: number };
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  branchId: string;
  _count?: { inventory: number };
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  ingredientId: string;
  branchId: string;
  supplierId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  expiryDate: string | null;
  ingredient?: Ingredient;
  supplier?: Supplier;
  updatedAt: string;
}

export interface InventorySummary {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
}

export interface WasteRecord {
  id: string;
  ingredientId: string;
  quantity: number;
  reason: string;
  date: string;
  ingredient?: Ingredient;
}

export interface WastePrediction {
  inventoryId: string;
  ingredient: string;
  quantity: number;
  expiryDays: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  recommendation: string;
}

export interface WastePredictionResponse {
  summary: { total: number; highRisk: number; mediumRisk: number; lowRisk: number };
  predictions: WastePrediction[];
}

export interface StockAlerts {
  summary: { lowStock: number; expiringSoon: number; expired: number };
  alerts: {
    lowStock: InventoryItem[];
    expiringSoon: InventoryItem[];
    expired: InventoryItem[];
  };
}

/* ========================= INGREDIENTS ========================= */
export const getIngredients = async (branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/ingredients?branchId=${branchId}`);
  return res.data as { count: number; ingredients: Ingredient[] };
};

export const createIngredient = async (data: { name: string; unit: string; branchId?: string }) => {
  const res = await authAxios.post('/api/ingredients', {
    branchId: DEFAULT_BRANCH_ID,
    ...data,
  });
  return res.data;
};

export const deleteIngredient = async (id: string) => {
  const res = await authAxios.delete(`/api/ingredients/${id}`);
  return res.data;
};

/* ========================= SUPPLIERS ========================= */
export const getSuppliers = async (branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/suppliers?branchId=${branchId}`);
  return res.data as { count: number; suppliers: Supplier[] };
};

export const createSupplier = async (data: {
  name: string;
  contact: string;
  email: string;
  phone: string;
  branchId?: string;
}) => {
  const res = await authAxios.post('/api/suppliers', {
    branchId: DEFAULT_BRANCH_ID,
    ...data,
  });
  return res.data;
};

export const deleteSupplier = async (id: string) => {
  const res = await authAxios.delete(`/api/suppliers/${id}`);
  return res.data;
};

/* ========================= INVENTORY ========================= */
export const getInventory = async (branchId = DEFAULT_BRANCH_ID, lowStock = false) => {
  const res = await authAxios.get(
    `/api/inventory?branchId=${branchId}${lowStock ? '&lowStock=true' : ''}`
  );
  return res.data as { summary: InventorySummary; inventory: InventoryItem[] };
};

export const createInventory = async (data: {
  ingredientId: string;
  supplierId: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  expiryDate?: string | null;
  branchId?: string;
}) => {
  const res = await authAxios.post('/api/inventory', {
    branchId: DEFAULT_BRANCH_ID,
    ...data,
  });
  return res.data;
};

export const deleteInventory = async (id: string) => {
  const res = await authAxios.delete(`/api/inventory/${id}`);
  return res.data;
};

export const getStockAlerts = async (branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/inventory/alerts?branchId=${branchId}`);
  return res.data as StockAlerts;
};

/* ========================= WASTE ========================= */
export const getWasteRecords = async () => {
  const res = await authAxios.get('/api/waste');
  return res.data as {
    summary: { totalRecords: number; totalWaste: number; byReason: Record<string, number> };
    records: WasteRecord[];
  };
};

export const createWasteRecord = async (data: {
  ingredientId: string;
  quantity: number;
  reason: string;
  date?: string;
}) => {
  const res = await authAxios.post('/api/waste', data);
  return res.data;
};

export const getWasteAnalytics = async () => {
  const res = await authAxios.get('/api/waste/analytics');
  return res.data as {
    period: string;
    totalRecords: number;
    totalWaste: number;
    topWastedIngredients: { id: string; name: string; quantity: number; count: number }[];
  };
};

/* ===================== AI PREDICTIONS ===================== */
// Bulk waste-risk prediction across all inventory items
export const predictAllWaste = async (branchId = DEFAULT_BRANCH_ID) => {
  const res = await authAxios.get(`/api/predict/waste/all?branchId=${branchId}`);
  return res.data as WastePredictionResponse;
};

// Inventory forecast for a single ingredient
export const predictIngredientInventory = async (
  ingredientId: string,
  predictedDemand = 100
) => {
  const res = await authAxios.post(`/api/predict/inventory/ingredient/${ingredientId}`, {
    predictedDemand,
  });
  return res.data as {
    ingredient: { id: string; name: string; currentStock: number };
    prediction: {
      required_quantity: number;
      reorder_needed?: boolean;
      [key: string]: any;
    };
  };
};

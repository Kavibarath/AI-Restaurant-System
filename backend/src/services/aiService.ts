/**
 * AI Service Client
 * Communicates with Python FastAPI for ML predictions
 */
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 10000,
});

// ============= WASTE PREDICTION =============
export interface WastePredictionInput {
  ingredient_id: string;
  stock_level: number;
  expiry_days_remaining: number;
  sales_rate: number;
  past_waste_quantity?: number;
  ingredient_type?: string;
}

export interface WastePredictionResult {
  ingredient_id: string;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
  estimated_waste: number;
  recommendation: string;
  probabilities: { low: number; medium: number; high: number };
}

export const predictWaste = async (
  input: WastePredictionInput
): Promise<WastePredictionResult> => {
  const response = await aiClient.post('/api/predict-waste', input);
  return response.data;
};

// ============= INVENTORY FORECASTING =============
export interface InventoryPredictionInput {
  ingredient_id: string;
  current_stock: number;
  predicted_demand: number;
  past_usage: number;
  menu_item_sales?: number;
  ingredient_type?: string;
  day_of_week?: number;
  is_weekend?: boolean;
  is_holiday?: boolean;
}

export interface InventoryPredictionResult {
  ingredient_id: string;
  required_quantity: number;
  confidence_interval: { min: number; max: number };
  days_until_stockout: number;
  recommendation: string;
  factors: {
    demand_factor: string;
    stock_factor: string;
    weekend_factor: string;
    holiday_factor: string;
  };
}

export const predictInventory = async (
  input: InventoryPredictionInput
): Promise<InventoryPredictionResult> => {
  const response = await aiClient.post('/api/predict-inventory', input);
  return response.data;
};

// ============= DEMAND FORECASTING (Member A) =============
export interface DemandDayInput {
  date: string; // YYYY-MM-DD
  day_of_week: number; // 0 = Monday ... 6 = Sunday
  month: number; // 1-12
  is_holiday: boolean;
}

export interface DemandForecastInput {
  days: DemandDayInput[];
  past_7day_avg_orders: number;
  past_7day_avg_sales: number;
}

export interface DemandDayResult {
  date: string;
  predicted_orders: number;
  predicted_sales: number;
  confidence: number;
}

export interface DemandForecastResult {
  forecast: DemandDayResult[];
  model: string;
}

export const forecastDemand = async (
  input: DemandForecastInput
): Promise<DemandForecastResult> => {
  const response = await aiClient.post('/api/forecast-demand', input);
  return response.data;
};

// ============= MENU RECOMMENDATIONS (Member A) =============
export interface RecommendationInput {
  target_item_id: string;
  transactions: string[][]; // each basket = list of menu item IDs
  items: Record<string, string>; // menu item ID -> name
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
  target_item_id: string;
  recommended_items: RecommendedItem[];
  method: string;
}

export const recommendItems = async (
  input: RecommendationInput
): Promise<RecommendationResult> => {
  const response = await aiClient.post('/api/recommend-items', input);
  return response.data;
};

// ============= HEALTH CHECK =============
export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await aiClient.get('/health');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
};

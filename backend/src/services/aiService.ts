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

// ============= HEALTH CHECK =============
export const checkAIServiceHealth = async (): Promise<boolean> => {
  try {
    const response = await aiClient.get('/health');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
};

import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000/api';

/**
 * Fetches demand forecasting data from the FastAPI machine learning service
 * @param branchId The unique identifier of the restaurant branch
 */
export const getDemandForecast = async (branchId: string) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/predict-demand`, {
      branchId: branchId,
      historical_days: 30 // Looks at the past month of transaction data
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching demand forecast from AI service:', error.message);
    throw new Error('AI Demand Service unavailable');
  }
};

/**
 * Fetches item cross-selling recommendations based on a customer's active order history basket
 * @param orderHistory Array of menuItem string IDs currently in the cart/past orders
 */
export const getMenuRecommendations = async (orderHistory: string[]) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/recommend-items`, {
      order_history: orderHistory
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching item recommendations from AI service:', error.message);
    throw new Error('AI Recommendation Service unavailable');
  }
};
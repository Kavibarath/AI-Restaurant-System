import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDemandForecast, getMenuRecommendations } from '../utils/aiService';

const prisma = new PrismaClient();

/**
 * Fetches standard historical sales analytics for dashboards
 */
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;

    const salesHistory = await prisma.order.findMany({
      where: {
        branchId: branchId as string,
        status: 'completed', // Only calculate revenue on successful sales
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Grab recent order trends
    });

    return res.status(200).json({ success: true, data: salesHistory });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Forwards requests to the Python microservice to get AI demand forecasting
 */
export const getSalesForecastDashboard = async (req: Request, res: Response) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Fixed: Passing only branchId as required by your custom utility signature
    const forecast = await getDemandForecast(branchId);

    return res.status(200).json({ success: true, data: forecast });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Forwards requests to get AI menu item suggestions (cross-selling)
 */
export const getAIRecommendations = async (req: Request, res: Response) => {
  try {
    const { menuItemId } = req.params;

    if (!menuItemId) {
      return res.status(400).json({ error: 'Menu Item ID is required' });
    }

    // FIXED: Wrapped menuItemId inside an array [menuItemId] to match the expected string[] type signature
    const recommendations = await getMenuRecommendations([menuItemId]);

    return res.status(200).json({ success: true, data: recommendations });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
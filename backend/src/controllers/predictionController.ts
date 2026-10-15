/**
 * Prediction Controller - Bridges Node.js to Python AI Service
 * Member B - Inventory Intelligence
 */
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { predictWaste, predictInventory } from '../services/aiService';

const prisma = new PrismaClient();

/**
 * Predict waste for a single inventory item
 */
export const predictItemWaste = async (req: AuthRequest, res: Response) => {
  try {
    const { inventoryId } = req.params;

    // Fetch inventory item with ingredient details
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId },
      include: { ingredient: true },
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Calculate features
    const today = new Date();
    const expiryDate = inventory.expiryDate ? new Date(inventory.expiryDate) : null;
    const expiryDays = expiryDate
      ? Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    // Get historical waste data
    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        ingredientId: inventory.ingredientId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    const totalPastWaste = wasteRecords.reduce((sum, r) => sum + r.quantity, 0);

    // Estimate sales rate (placeholder - use 5 as default)
    const salesRate = 5;

    // Determine ingredient type from name (basic mapping)
    const ingredientType = guessIngredientType(inventory.ingredient.name);

    // Call AI service
    const prediction = await predictWaste({
      ingredient_id: inventory.ingredientId,
      stock_level: inventory.quantity,
      expiry_days_remaining: expiryDays,
      sales_rate: salesRate,
      past_waste_quantity: totalPastWaste,
      ingredient_type: ingredientType,
    });

    // Save prediction to database
    await prisma.wastePrediction.create({
      data: {
        ingredientId: inventory.ingredientId,
        riskLevel: prediction.risk_level,
        confidence: prediction.confidence,
        predictedDate: today,
      },
    });

    return res.status(200).json({
      inventory: {
        id: inventory.id,
        ingredient: inventory.ingredient.name,
        currentStock: inventory.quantity,
        expiryDays,
      },
      prediction,
    });
  } catch (error: any) {
    console.error('Predict waste error:', error.message);
    return res.status(500).json({
      error: 'Prediction failed',
      details: error.response?.data || error.message,
    });
  }
};

/**
 * Predict inventory needs for an ingredient
 */
export const predictIngredientInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { ingredientId } = req.params;
    const { predictedDemand = 100 } = req.body;

    // Fetch ingredient and current inventory
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      include: { inventory: true },
    });

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    const totalStock = ingredient.inventory.reduce((sum, inv) => sum + inv.quantity, 0);

    // Estimate past usage from waste records (proxy)
    const wasteRecords = await prisma.wasteRecord.findMany({
      where: {
        ingredientId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    const pastUsage = Math.max(5, wasteRecords.length * 2); // estimate

    // Call AI service
    const prediction = await predictInventory({
      ingredient_id: ingredientId,
      current_stock: totalStock,
      predicted_demand: parseFloat(predictedDemand),
      past_usage: pastUsage,
      ingredient_type: guessIngredientType(ingredient.name),
    });

    // Save prediction
    await prisma.inventoryPrediction.create({
      data: {
        ingredientId,
        predictedQuantity: prediction.required_quantity,
        predictedDate: new Date(),
      },
    });

    return res.status(200).json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        currentStock: totalStock,
      },
      prediction,
    });
  } catch (error: any) {
    console.error('Predict inventory error:', error.message);
    return res.status(500).json({
      error: 'Prediction failed',
      details: error.response?.data || error.message,
    });
  }
};

/**
 * Predict waste for ALL inventory items (bulk operation)
 */
export const predictAllWaste = async (req: AuthRequest, res: Response) => {
  try {
    const { branchId } = req.query;

    const inventories = await prisma.inventory.findMany({
      where: branchId ? { branchId: branchId as string } : undefined,
      include: { ingredient: true },
    });

    const today = new Date();
    const predictions = [];

    for (const inv of inventories) {
      try {
        const expiryDate = inv.expiryDate ? new Date(inv.expiryDate) : null;
        const expiryDays = expiryDate
          ? Math.max(0, Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
          : 30;

        const prediction = await predictWaste({
          ingredient_id: inv.ingredientId,
          stock_level: inv.quantity,
          expiry_days_remaining: expiryDays,
          sales_rate: 5,
          past_waste_quantity: 0,
          ingredient_type: guessIngredientType(inv.ingredient.name),
        });

        predictions.push({
          inventoryId: inv.id,
          ingredient: inv.ingredient.name,
          quantity: inv.quantity,
          expiryDays,
          riskLevel: prediction.risk_level,
          confidence: prediction.confidence,
          recommendation: prediction.recommendation,
        });
      } catch (err) {
        // Skip failed predictions
      }
    }

    // Summary stats
    const summary = {
      total: predictions.length,
      highRisk: predictions.filter(p => p.riskLevel === 'high').length,
      mediumRisk: predictions.filter(p => p.riskLevel === 'medium').length,
      lowRisk: predictions.filter(p => p.riskLevel === 'low').length,
    };

    return res.status(200).json({ summary, predictions });
  } catch (error: any) {
    console.error('Bulk waste prediction error:', error.message);
    return res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
};

/**
 * Helper: Guess ingredient type from name
 */
function guessIngredientType(name: string): string {
  const lower = name.toLowerCase();
  if (/(milk|cheese|yogurt|butter|cream)/.test(lower)) return 'dairy';
  if (/(beef|pork|chicken|lamb|turkey)/.test(lower)) return 'meat';
  if (/(fish|shrimp|salmon|tuna|crab)/.test(lower)) return 'seafood';
  if (/(rice|flour|bread|pasta|wheat)/.test(lower)) return 'grain';
  if (/(apple|banana|orange|berry|fruit)/.test(lower)) return 'fruit';
  if (/(salt|pepper|cumin|spice|herb)/.test(lower)) return 'spice';
  return 'vegetable';
}

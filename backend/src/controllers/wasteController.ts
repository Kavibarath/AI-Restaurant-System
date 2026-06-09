import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Get all waste records
export const getAllWaste = async (req: AuthRequest, res: Response) => {
  try {
    const { ingredientId, startDate, endDate } = req.query;

    let whereClause: any = {};
    if (ingredientId) whereClause.ingredientId = ingredientId as string;
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = new Date(startDate as string);
      if (endDate) whereClause.date.lte = new Date(endDate as string);
    }

    const wasteRecords = await prisma.wasteRecord.findMany({
      where: whereClause,
      include: { ingredient: true },
      orderBy: { date: 'desc' },
    });

    // Compute summary statistics
    const totalRecords = wasteRecords.length;
    const totalWaste = wasteRecords.reduce((sum, record) => sum + record.quantity, 0);

    // Group by reason
    const byReason: { [key: string]: number } = {};
    wasteRecords.forEach(record => {
      byReason[record.reason] = (byReason[record.reason] || 0) + record.quantity;
    });

    return res.status(200).json({
      summary: {
        totalRecords,
        totalWaste: parseFloat(totalWaste.toFixed(2)),
        byReason,
      },
      records: wasteRecords,
    });
  } catch (error) {
    console.error('Get waste error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get waste record by ID
export const getWasteById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const waste = await prisma.wasteRecord.findUnique({
      where: { id },
      include: { ingredient: true },
    });

    if (!waste) {
      return res.status(404).json({ error: 'Waste record not found' });
    }

    return res.status(200).json(waste);
  } catch (error) {
    console.error('Get waste error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create waste record
export const createWaste = async (req: AuthRequest, res: Response) => {
  try {
    const { ingredientId, quantity, reason, date } = req.body;

    if (!ingredientId || quantity === undefined || !reason) {
      return res.status(400).json({ error: 'ingredientId, quantity, and reason are required' });
    }

    const waste = await prisma.wasteRecord.create({
      data: {
        ingredientId,
        quantity: parseFloat(quantity),
        reason,
        date: date ? new Date(date) : new Date(),
      },
      include: { ingredient: true },
    });

    return res.status(201).json({
      message: 'Waste record created successfully',
      waste,
    });
  } catch (error) {
    console.error('Create waste error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete waste record
export const deleteWaste = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.wasteRecord.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Waste record deleted successfully' });
  } catch (error) {
    console.error('Delete waste error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get waste analytics
export const getWasteAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    // Get last 30 days of waste
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWaste = await prisma.wasteRecord.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: { ingredient: true },
    });

    // Top wasted ingredients
    const ingredientWaste: { [key: string]: { name: string; quantity: number; count: number } } = {};
    recentWaste.forEach(record => {
      const id = record.ingredientId;
      if (!ingredientWaste[id]) {
        ingredientWaste[id] = { name: record.ingredient.name, quantity: 0, count: 0 };
      }
      ingredientWaste[id].quantity += record.quantity;
      ingredientWaste[id].count += 1;
    });

    const topWasted = Object.entries(ingredientWaste)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return res.status(200).json({
      period: 'Last 30 days',
      totalRecords: recentWaste.length,
      totalWaste: recentWaste.reduce((sum, r) => sum + r.quantity, 0),
      topWastedIngredients: topWasted,
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

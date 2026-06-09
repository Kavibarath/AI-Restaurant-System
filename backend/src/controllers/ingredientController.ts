import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Get all ingredients
export const getAllIngredients = async (req: AuthRequest, res: Response) => {
  try {
    const { branchId } = req.query;

    const ingredients = await prisma.ingredient.findMany({
      where: branchId ? { branchId: branchId as string } : undefined,
      include: {
        inventory: true,
        _count: {
          select: {
            wasteRecords: true,
            inventoryPredictions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      count: ingredients.length,
      ingredients,
    });
  } catch (error) {
    console.error('Get ingredients error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ingredient by ID
export const getIngredientById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: {
        inventory: {
          include: { supplier: true },
        },
        wasteRecords: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        inventoryPredictions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        wastePredictions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ingredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    return res.status(200).json(ingredient);
  } catch (error) {
    console.error('Get ingredient error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create ingredient
export const createIngredient = async (req: AuthRequest, res: Response) => {
  try {
    const { name, unit, branchId } = req.body;

    if (!name || !unit || !branchId) {
      return res.status(400).json({ error: 'Name, unit, and branchId are required' });
    }

    const ingredient = await prisma.ingredient.create({
      data: { name, unit, branchId },
    });

    return res.status(201).json({
      message: 'Ingredient created successfully',
      ingredient,
    });
  } catch (error) {
    console.error('Create ingredient error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update ingredient
export const updateIngredient = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit } = req.body;

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: { name, unit },
    });

    return res.status(200).json({
      message: 'Ingredient updated successfully',
      ingredient,
    });
  } catch (error) {
    console.error('Update ingredient error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete ingredient
export const deleteIngredient = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.ingredient.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Delete ingredient error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get all menu items for a specific branch
// @route   GET /api/menu?branchId=xxxx
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      res.status(400).json({ error: 'branchId query parameter is required' });
      return;
    }

    const items = await prisma.menuItem.findMany({
      where: { branchId: String(branchId) },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu items' });
  }
};

// @desc    Get a single menu item by ID
// @route   GET /api/menu/:id
export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item) {
      res.status(404).json({ error: 'Menu item not found' });
      return;
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve menu item' });
  }
};

// @desc    Create a new menu item
// @route   POST /api/menu
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, branchId } = req.body;

    if (!name || !price || !category || !branchId) {
      res.status(400).json({ error: 'Missing required fields: name, price, category, and branchId are mandatory' });
      return;
    }

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        branchId,
      },
    });

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
};

// @desc    Update an existing menu item
// @route   PUT /api/menu/:id
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
      },
    });

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.menuItem.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item. Ensure it is not linked to existing orders.' });
  }
};
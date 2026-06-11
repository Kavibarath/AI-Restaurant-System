import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// @desc    Get all menu items for a specific branch
// @route   GET /api/menu?branchId=xxxx
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      res.status(400).json({ success: false, error: 'branchId query parameter is required' });
      return;
    }

    const items = await prisma.menuItem.findMany({
      where: { branchId: String(branchId) },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Get Menu Items Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve menu items' });
  }
};

// @desc    Get a single menu item by ID
// @route   GET /api/menu/:id
export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.menuItem.findUnique({ where: { id } });

    if (!item) {
      res.status(404).json({ success: false, error: 'Menu item not found' });
      return;
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('Get Menu Item By ID Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve menu item' });
  }
};

// @desc    Create a new menu item
// @route   POST /api/menu
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, price, category, branchId } = req.body;
    if (!name || !price || !category || !branchId) {
      res.status(400).json({ success: false, error: 'Missing required fields: name, price, category, and branchId are mandatory' });
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

    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Create Menu Item Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create menu item' });
  }
};

// @desc    Update an existing menu item
// @route   PUT /api/menu/:id
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Menu item not found' });
      return;
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        category,
      },
    });

    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update menu item' });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/menu/:id
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Menu item not found' });
      return;
    }

    await prisma.menuItem.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete menu item. Ensure it is not linked to existing orders.' });
  }
};
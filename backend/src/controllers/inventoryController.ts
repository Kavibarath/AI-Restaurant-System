import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Get all inventory items
export const getAllInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { branchId, lowStock } = req.query;

    let whereClause: any = {};
    if (branchId) whereClause.branchId = branchId as string;

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        ingredient: true,
        supplier: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filter low stock items if requested
    let filteredInventory = inventory;
    if (lowStock === 'true') {
      filteredInventory = inventory.filter(item => item.quantity <= item.minStock);
    }

    // Compute summary statistics
    const totalItems = filteredInventory.length;
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock).length;
    const totalValue = filteredInventory.reduce((sum, item) => sum + item.quantity, 0);

    return res.status(200).json({
      summary: {
        totalItems,
        lowStockItems,
        totalValue,
      },
      inventory: filteredInventory,
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get inventory by ID
export const getInventoryById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: {
        ingredient: true,
        supplier: true,
      },
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    return res.status(200).json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create inventory item
export const createInventory = async (req: AuthRequest, res: Response) => {
  try {
    const {
      ingredientId,
      branchId,
      supplierId,
      quantity,
      minStock,
      maxStock,
      expiryDate,
    } = req.body;

    if (!ingredientId || !branchId || !supplierId || quantity === undefined || minStock === undefined || maxStock === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const inventory = await prisma.inventory.create({
      data: {
        ingredientId,
        branchId,
        supplierId,
        quantity: parseFloat(quantity),
        minStock: parseFloat(minStock),
        maxStock: parseFloat(maxStock),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
      include: {
        ingredient: true,
        supplier: true,
      },
    });

    return res.status(201).json({
      message: 'Inventory item created successfully',
      inventory,
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update inventory
export const updateInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, minStock, maxStock, expiryDate, supplierId } = req.body;

    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = parseFloat(quantity);
    if (minStock !== undefined) updateData.minStock = parseFloat(minStock);
    if (maxStock !== undefined) updateData.maxStock = parseFloat(maxStock);
    if (expiryDate) updateData.expiryDate = new Date(expiryDate);
    if (supplierId) updateData.supplierId = supplierId;

    const inventory = await prisma.inventory.update({
      where: { id },
      data: updateData,
      include: {
        ingredient: true,
        supplier: true,
      },
    });

    return res.status(200).json({
      message: 'Inventory updated successfully',
      inventory,
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete inventory
export const deleteInventory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.inventory.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stock alerts (low stock & expiring soon)
export const getStockAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const { branchId } = req.query;

    let whereClause: any = {};
    if (branchId) whereClause.branchId = branchId as string;

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: { ingredient: true, supplier: true },
    });

    // Low stock items (at or below minimum stock)
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

    // Expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringItems = inventory.filter(item =>
      item.expiryDate &&
      new Date(item.expiryDate) <= sevenDaysFromNow &&
      new Date(item.expiryDate) >= new Date()
    );

    // Already expired
    const expiredItems = inventory.filter(item =>
      item.expiryDate && new Date(item.expiryDate) < new Date()
    );

    return res.status(200).json({
      summary: {
        lowStock: lowStockItems.length,
        expiringSoon: expiringItems.length,
        expired: expiredItems.length,
      },
      alerts: {
        lowStock: lowStockItems,
        expiringSoon: expiringItems,
        expired: expiredItems,
      },
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

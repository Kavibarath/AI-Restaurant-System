import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

// Get all suppliers
export const getAllSuppliers = async (req: AuthRequest, res: Response) => {
  try {
    const { branchId } = req.query;

    const suppliers = await prisma.supplier.findMany({
      where: branchId ? { branchId: branchId as string } : undefined,
      include: {
        _count: {
          select: { inventory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      count: suppliers.length,
      suppliers,
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get supplier by ID
export const getSupplierById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        inventory: {
          include: { ingredient: true },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    return res.status(200).json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Create supplier
export const createSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { name, contact, email, phone, branchId } = req.body;

    if (!name || !contact || !email || !phone || !branchId) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const supplier = await prisma.supplier.create({
      data: { name, contact, email, phone, branchId },
    });

    return res.status(201).json({
      message: 'Supplier created successfully',
      supplier,
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Update supplier
export const updateSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact, email, phone } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contact, email, phone },
    });

    return res.status(200).json({
      message: 'Supplier updated successfully',
      supplier,
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete supplier
export const deleteSupplier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.supplier.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all menu items
export const getMenu = async (req: Request, res: Response) => {
  try {
    const menuItems = await prisma.menuItem.findMany();
    return res.status(200).json({ success: true, data: menuItems });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Create a new menu item
export const createMenuItem = async (req: Request, res: Response) => {
  try {
    // Extract branchId from the request body alongside other details
    const { name, description, price, category, branchId } = req.body; 

    if (!branchId) {
      return res.status(400).json({ error: 'Branch ID is required to create a menu item' });
    }
    
    const newItem = await prisma.menuItem.create({
      data: { 
        name, 
        description, 
        price: parseFloat(price), 
        category,
        // Use Prisma's connect syntax to link this item to an existing Branch
        branch: {
          connect: { id: branchId }
        }
      },
    });

    return res.status(201).json({ success: true, data: newItem });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Update an existing item
export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, branchId } = req.body; 

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: { 
        name, 
        description, 
        price: price ? parseFloat(price) : undefined, 
        category,
        // Optional: allows updating the branch link if it moves location
        ...(branchId && {
          branch: {
            connect: { id: branchId }
          }
        })
      },
    });

    return res.status(200).json({ success: true, data: updatedItem });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete an item from the menu
export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.menuItem.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
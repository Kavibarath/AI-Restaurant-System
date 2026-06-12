import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { customerId, branchId, items } = req.body; // items: [{ menuItemId: string, quantity: number }]

    if (!branchId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing branchId or order items' });
    }

    // Atomically fetch prices, calculate total, and write to DB
    const newOrder = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const verifiedItems = [];

      // Fetch accurate item prices directly from DB to prevent frontend tampering
      for (const item of items) {
        const menuItem = await tx.menuItem.findUnique({
          where: { id: item.menuItemId },
        });

        if (!menuItem) {
          throw new Error(`Menu item with ID ${item.menuItemId} not found`);
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        verifiedItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price, // Snapshot of the price at checkout
        });
      }

      // 1. Create parent Order
      const order = await tx.order.create({
        data: {
          customerId,
          branchId,
          totalAmount,
          status: 'pending',
        },
      });

      // 2. Prepare and bulk-insert Order Items
      const orderItemEntries = verifiedItems.map((item) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price, // Added price field here to satisfy schema requirements
      }));

      await tx.orderItem.createMany({
        data: orderItemEntries,
      });

      return order;
    });

    return res.status(201).json({ success: true, data: newOrder });
  } catch (error: any) {
    console.error('Order Creation Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};
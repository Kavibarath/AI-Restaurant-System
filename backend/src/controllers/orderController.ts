import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Create a new customer order with items
// @route   POST /api/orders
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, branchId, items } = req.body; 
    // items shape: [{ menuItemId: string, quantity: number, price: number }]

    if (!customerId || !branchId || !items || items.length === 0) {
      res.status(400).json({ error: 'Missing required fields: customerId, branchId, and items are mandatory' });
      return;
    }

    // Calculate total amount based on items prices and quantities
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Use a database transaction to ensure both Order and OrderItems save safely together
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          branchId,
          totalAmount,
          status: 'pending',
        },
      });

      const orderItemData = items.map((item: any) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      }));

      await tx.orderItem.createMany({
        data: orderItemData,
      });

      return order;
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// @desc    Get all orders for a branch with optional status filter
// @route   GET /api/orders?branchId=xxxx
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, status } = req.query;

    if (!branchId) {
      res.status(400).json({ error: 'branchId query parameter is required' });
      return;
    }

    const filter: any = { branchId: String(branchId) };
    if (status) filter.status = String(status);

    const orders = await prisma.order.findMany({
      where: filter,
      include: {
        customer: true,
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
};

// @desc    Update order status (pending, completed, cancelled)
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status field is required' });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
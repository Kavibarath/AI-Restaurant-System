import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Create a new order with multiple items (Atomic Transaction)
// @route   POST /api/orders
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, branchId, items } = req.body; 
    // items format: [{ menuItemId: string, quantity: number, price: number }]

    if (!customerId || !branchId || !items || items.length === 0) {
      res.status(400).json({ success: false, error: 'Missing customerId, branchId, or items array' });
      return;
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ success: false, error: 'Customer not found' });
      return;
    }

    // Calculate total order cost
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Save order and item breakdowns together safely
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          branchId,
          totalAmount,
          status: 'pending',
        },
      });

      const orderItemEntries = items.map((item: any) => ({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      }));

      await tx.orderItem.createMany({ data: orderItemEntries });
      return order;
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error processing order' });
  }
};

// @desc    Get all orders with optional filters (branchId, status)
// @route   GET /api/orders
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, status } = req.query;
    const filterConditions: any = {};

    if (branchId) filterConditions.branchId = String(branchId);
    if (status) filterConditions.status = String(status);

    const orders = await prisma.order.findMany({
      where: filterConditions,
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
    console.error('Fetch Orders Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error fetching orders' });
  }
};

// @desc    Get single order details by ID
// @route   GET /api/orders/:id
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order transaction records not found' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Fetch Order ID Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error extracting order details' });
  }
};

// @desc    Update order status tracking lifecycle phase
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validPhases = ['pending', 'completed', 'cancelled'];
    if (!status || !validPhases.includes(status)) {
      res.status(400).json({ success: false, error: 'Status phase must equal pending, completed, or cancelled' });
      return;
    }

    const orderExists = await prisma.order.findUnique({ where: { id } });
    if (!orderExists) {
      res.status(404).json({ success: false, error: 'Order target file entry missing' });
      return;
    }

    const modifiedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ success: true, data: modifiedOrder });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error updating status parameters' });
  }
};
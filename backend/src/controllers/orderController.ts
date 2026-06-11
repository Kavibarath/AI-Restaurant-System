import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// @desc    Create a new customer order with nested transaction items
// @route   POST /api/orders
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, branchId, items } = req.body; 
    // items schema format: [{ menuItemId: string, quantity: number, price: number }]

    if (!customerId || !branchId || !items || items.length === 0) {
      res.status(400).json({ success: false, error: 'Missing customerId, branchId, or items array' });
      return;
    }

    // Verify target customer profile is registered in DB
    const customerExists = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customerExists) {
      res.status(404).json({ success: false, error: 'Target customer record not found' });
      return;
    }

    // Accumulate basket total cost
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    // Atomically execute parent Order and detailed OrderItems tables entries together
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
    console.error('Create Order Transaction Failure:', error);
    res.status(500).json({ success: false, error: 'Failed to process customer transaction order' });
  }
};

// @desc    Get group orders with active relational query filters
// @route   GET /api/orders
export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId, status } = req.query;
    const searchConditions: any = {};

    if (branchId) searchConditions.branchId = String(branchId);
    if (status) searchConditions.status = String(status);

    const orders = await prisma.order.findMany({
      where: searchConditions,
      include: {
        customer: true,
        orderItems: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('Fetch Orders Failure:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve system transactions list' });
  }
};

// @desc    Get order details by explicit primary key ID
// @route   GET /api/orders/:id
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: { include: { menuItem: true } }
      }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Target transaction record missing' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Fetch Order By ID Failure:', error);
    res.status(500).json({ success: false, error: 'Failed to extract single order metrics' });
  }
};

// @desc    Modify order dispatch phase status tracking value
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const acceptedPhases = ['pending', 'completed', 'cancelled'];
    if (!status || !acceptedPhases.includes(status)) {
      res.status(400).json({ success: false, error: 'Status phase must evaluate to pending, completed, or cancelled' });
      return;
    }

    const verificationCheck = await prisma.order.findUnique({ where: { id } });
    if (!verificationCheck) {
      res.status(404).json({ success: false, error: 'Target order record missing' });
      return;
    }

    const modifiedOrder = await prisma.order.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ success: true, data: modifiedOrder });
  } catch (error) {
    console.error('Update Phase Status Failure:', error);
    res.status(500).json({ success: false, error: 'Failed to modify tracking status state' });
  }
};
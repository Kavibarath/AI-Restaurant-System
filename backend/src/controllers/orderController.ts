import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WALK_IN_EMAIL = 'walk-in@restaurant.local';

/**
 * Resolve the customer for an order.
 * Order.customerId is required by the schema, so fall back to a shared
 * "Walk-in Customer" record when no customer details are supplied.
 */
const resolveCustomerId = async (
  tx: any,
  customerId?: string,
  customerName?: string,
  customerEmail?: string
): Promise<string> => {
  if (customerId) return customerId;

  if (customerEmail) {
    const customer = await tx.customer.upsert({
      where: { email: customerEmail },
      update: customerName ? { name: customerName } : {},
      create: { email: customerEmail, name: customerName || customerEmail },
    });
    return customer.id;
  }

  const walkIn = await tx.customer.upsert({
    where: { email: WALK_IN_EMAIL },
    update: {},
    create: { email: WALK_IN_EMAIL, name: 'Walk-in Customer' },
  });
  return walkIn.id;
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    // items: [{ menuItemId: string, quantity: number }]
    const { customerId, customerName, customerEmail, branchId, items } = req.body;

    if (!branchId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing branchId or order items' });
    }

    // Atomically fetch prices, calculate total, and write to DB
    const newOrder = await prisma.$transaction(async (tx) => {
      const resolvedCustomerId = await resolveCustomerId(
        tx,
        customerId,
        customerName,
        customerEmail
      );

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

        const quantity = parseInt(item.quantity, 10);
        if (!quantity || quantity < 1) {
          throw new Error(`Invalid quantity for ${menuItem.name}`);
        }

        const itemTotal = menuItem.price * quantity;
        totalAmount += itemTotal;

        verifiedItems.push({
          menuItemId: item.menuItemId,
          quantity,
          price: menuItem.price, // Snapshot of the price at checkout
        });
      }

      // 1. Create parent Order
      const order = await tx.order.create({
        data: {
          customerId: resolvedCustomerId,
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

const ORDER_INCLUDE = {
  customer: true,
  orderItems: { include: { menuItem: true } },
};

// List orders (optionally filtered by branch / status), newest first
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { branchId, status, limit } = req.query;

    const where: any = {};
    if (branchId) where.branchId = branchId as string;
    if (status) where.status = status as string;

    const orders = await prisma.order.findMany({
      where,
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string, 10) : 100,
    });

    const summary = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };

    return res.status(200).json({ success: true, summary, data: orders });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Get a single order with its items
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Move an order through its lifecycle: pending -> completed / cancelled
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Status must be pending, completed or cancelled' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });

    return res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete an order and its line items atomically
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);

    return res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';

const WALK_IN_EMAIL = 'walk-in@restaurant.local';

/**
 * Resolve the customer for an order.
 * Order.customerId is required by the schema, so fall back to a shared
 * "Walk-in Customer" record when no customer details are supplied.
 */
const resolveCustomerId = async (
  db: PrismaClient,
  customerId?: string,
  customerName?: string,
  customerEmail?: string
): Promise<string> => {
  if (customerId) return customerId;

  if (customerEmail) {
    const customer = await db.customer.upsert({
      where: { email: customerEmail },
      update: customerName ? { name: customerName } : {},
      create: { email: customerEmail, name: customerName || customerEmail },
    });
    return customer.id;
  }

  const walkIn = await db.customer.upsert({
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

    // Fetch accurate item prices directly from DB (one query) to prevent frontend tampering
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i: any) => i.menuItemId) } },
    });
    const priceOf = new Map(menuItems.map((m) => [m.id, m]));

    let totalAmount = 0;
    const verifiedItems = [];

    for (const item of items) {
      const menuItem = priceOf.get(item.menuItemId);
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item with ID ${item.menuItemId} not found` });
      }

      const quantity = parseInt(item.quantity, 10);
      if (!quantity || quantity < 1) {
        return res.status(400).json({ error: `Invalid quantity for ${menuItem.name}` });
      }

      totalAmount += menuItem.price * quantity;
      verifiedItems.push({
        menuItemId: item.menuItemId,
        quantity,
        price: menuItem.price, // Snapshot of the price at checkout
      });
    }

    const resolvedCustomerId = await resolveCustomerId(
      prisma,
      customerId,
      customerName,
      customerEmail
    );

    // Nested write: the order and all its items are inserted atomically in a
    // single round trip (an interactive $transaction timed out over the pooler)
    const newOrder = await prisma.order.create({
      data: {
        customerId: resolvedCustomerId,
        branchId,
        totalAmount,
        status: 'pending',
        orderItems: { create: verifiedItems },
      },
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

    const branchWhere: any = {};
    if (branchId) branchWhere.branchId = branchId as string;
    const where: any = { ...branchWhere };
    if (status) where.status = status as string;

    // The list is capped, so status counts come from a separate grouped query
    // over ALL orders (independent of the status filter and the limit)
    const [orders, statusCounts] = await Promise.all([
      prisma.order.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string, 10) : 100,
      }),
      prisma.order.groupBy({ by: ['status'], where: branchWhere, _count: { _all: true } }),
    ]);

    const summary = { total: 0, pending: 0, completed: 0, cancelled: 0 };
    statusCounts.forEach((s) => {
      (summary as any)[s.status] = s._count._all;
      summary.total += s._count._all;
    });

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

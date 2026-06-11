import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get total revenue and order summary analytics
// @route   GET /api/sales/summary?branchId=xxxx
export const getSalesSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      res.status(400).json({ success: false, error: 'branchId query parameter is required' });
      return;
    }

    // Aggregate completed orders for total revenue calculations
    const salesAggregate = await prisma.order.aggregate({
      where: {
        branchId: String(branchId),
        status: 'completed',
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: salesAggregate._sum.totalAmount || 0,
        totalOrders: salesAggregate._count.id || 0,
      },
    });
  } catch (error) {
    console.error('Sales Summary Error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve sales summary data' });
  }
};

// @desc    Get top selling menu items with quantities
// @route   GET /api/sales/top-items?branchId=xxxx
export const getTopItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      res.status(400).json({ success: false, error: 'branchId query parameter is required' });
      return;
    }

    // Group order items by menuItemId to find popular dishes
    const orderItemsGrouped = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        order: {
          branchId: String(branchId),
          status: 'completed',
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5, // Limit to top 5 items
    });

    // Populate item metadata names and details for response payload
    const completeTopItems = await Promise.all(
      orderItemsGrouped.map(async (group) => {
        const itemDetails = await prisma.menuItem.findUnique({
          where: { id: group.menuItemId },
        });
        return {
          id: group.menuItemId,
          name: itemDetails?.name || 'Unknown Item',
          category: itemDetails?.category || 'General',
          totalSold: group._sum.quantity || 0,
        };
      })
    );

    res.status(200).json({ success: true, data: completeTopItems });
  } catch (error) {
    console.error('Top Items Analytics Error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute top items analytics' });
  }
};
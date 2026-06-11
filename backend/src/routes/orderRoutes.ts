import { Router } from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/orderController';

const router = Router();

// Base endpoint grouping
router.route('/')
  .get(getOrders)
  .post(createOrder);

// Identifier detail mapping
router.route('/:id')
  .get(getOrderById);

// Order tracking updates
router.route('/:id/status')
  .put(updateOrderStatus);

export default router;
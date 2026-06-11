import { Router } from 'express';
import { createOrder, getOrders, updateOrderStatus } from '../controllers/orderController';

const router = Router();

// Base /api/orders routing
router.route('/')
  .get(getOrders)
  .post(createOrder);

// Status update routing
router.route('/:id/status')
  .put(updateOrderStatus);

export default router;
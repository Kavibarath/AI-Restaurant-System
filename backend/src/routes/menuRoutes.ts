import { Router } from 'express';
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../controllers/menuController';

const router = Router();

// /api/menu endpoints
router.route('/')
  .get(getMenuItems)
  .post(createMenuItem);

router.route('/:id')
  .get(getMenuItemById)
  .put(updateMenuItem)
  .delete(deleteMenuItem);

export default router;
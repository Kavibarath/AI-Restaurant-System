import { Router } from 'express';
import {
  getAllInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  getStockAlerts,
} from '../controllers/inventoryController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllInventory);
router.get('/alerts', getStockAlerts);
router.get('/:id', getInventoryById);
router.post('/', createInventory);
router.put('/:id', updateInventory);
router.delete('/:id', deleteInventory);

export default router;

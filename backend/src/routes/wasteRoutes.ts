import { Router } from 'express';
import {
  getAllWaste,
  getWasteById,
  createWaste,
  updateWaste,
  deleteWaste,
  getWasteAnalytics,
} from '../controllers/wasteController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllWaste);
router.get('/analytics', getWasteAnalytics);
router.get('/:id', getWasteById);
router.post('/', createWaste);
router.put('/:id', updateWaste);
router.delete('/:id', deleteWaste);

export default router;

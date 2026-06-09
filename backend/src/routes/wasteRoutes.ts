import { Router } from 'express';
import {
  getAllWaste,
  getWasteById,
  createWaste,
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
router.delete('/:id', deleteWaste);

export default router;

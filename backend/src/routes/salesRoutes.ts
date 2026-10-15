import { Router } from 'express';
import { getSalesAnalytics, getSalesForecastDashboard, getAIRecommendations } from '../controllers/salesController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/analytics', getSalesAnalytics);
router.get('/forecast/:branchId', getSalesForecastDashboard);
router.get('/recommendations/:menuItemId', getAIRecommendations);

export default router;
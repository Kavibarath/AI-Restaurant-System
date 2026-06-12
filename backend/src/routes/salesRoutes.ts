import { Router } from 'express';
import { getSalesAnalytics, getSalesForecastDashboard, getAIRecommendations } from '../controllers/salesController';

const router = Router();

router.get('/analytics', getSalesAnalytics);
router.get('/forecast/:branchId', getSalesForecastDashboard);
router.get('/recommendations/:menuItemId', getAIRecommendations);

export default router;
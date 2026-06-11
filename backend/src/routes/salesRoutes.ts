import { Router } from 'express';
import { getSalesSummary, getTopItems } from '../controllers/salesController';

const router = Router();

// Dashboard Summary Counters
router.get('/summary', getSalesSummary);

// Dashboard Chart Breakdown Data
router.get('/top-items', getTopItems);

export default router;
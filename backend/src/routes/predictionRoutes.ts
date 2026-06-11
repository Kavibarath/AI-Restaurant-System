import { Router } from 'express';
import {
  predictItemWaste,
  predictIngredientInventory,
  predictAllWaste,
} from '../controllers/predictionController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// Predict waste for a specific inventory item
router.get('/waste/inventory/:inventoryId', predictItemWaste);

// Predict inventory needs for an ingredient
router.post('/inventory/ingredient/:ingredientId', predictIngredientInventory);

// Bulk waste prediction
router.get('/waste/all', predictAllWaste);

export default router;

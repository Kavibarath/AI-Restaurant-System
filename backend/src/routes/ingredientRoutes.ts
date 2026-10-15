import { Router } from 'express';
import {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from '../controllers/ingredientController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getAllIngredients);
router.get('/:id', getIngredientById);
router.post('/', createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

export default router;

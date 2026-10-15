import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Auth routes (shared)
import authRoutes from './routes/authRoutes';

// Member A: Sales Module routes
import menuRoutes from './routes/menuRoutes';
import orderRoutes from './routes/orderRoutes';
import salesRoutes from './routes/salesRoutes';

// Member B: Inventory Module routes
import ingredientRoutes from './routes/ingredientRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import supplierRoutes from './routes/supplierRoutes';
import wasteRoutes from './routes/wasteRoutes';

// Member B: AI Prediction routes
import predictionRoutes from './routes/predictionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// ============= SHARED ROUTES =============
app.use('/api/auth', authRoutes);

// ============= MEMBER A: SALES MODULE =============
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);

// ============= MEMBER B: INVENTORY MODULE =============
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/waste', wasteRoutes);

// ============= AI PREDICTIONS =============
app.use('/api/predict', predictionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend server running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI Restaurant Management System - Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/register, /api/auth/login, /api/auth/me',
      menu: '/api/menu',
      orders: '/api/orders, /api/orders/:id/status',
      sales: '/api/sales/analytics, /api/sales/forecast/:branchId, /api/sales/recommendations/:menuItemId',
      ingredients: '/api/ingredients',
      inventory: '/api/inventory',
      suppliers: '/api/suppliers',
      waste: '/api/waste',
      predictions: '/api/predict/waste/all, /api/predict/waste/inventory/:id, /api/predict/inventory/ingredient/:id',
      health: '/health',
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Sales APIs ready at /api/menu, /api/orders, /api/sales`);
  console.log(`📦 Inventory APIs ready at /api/ingredients, /api/inventory, /api/suppliers, /api/waste`);
});

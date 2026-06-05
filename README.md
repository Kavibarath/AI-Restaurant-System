# 🍽️ AI-Powered Smart Restaurant Management System

A full-stack intelligent restaurant management platform with **integrated AI-driven demand forecasting and waste prediction** for both sales and inventory optimization.

## 📋 Project Overview

**Two-member collaborative project** with a unified, integrated codebase:

- **Member A (Aruniya-Nadeshan):** Sales Intelligence Module
- **Member B (Kavibarath):** Inventory Intelligence Module

Both modules run in a single integrated system with shared authentication, database, and UI.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL (Docker or Supabase)
- npm or yarn

### Setup (5 minutes)

```bash
# Clone repository
git clone https://github.com/Kavibarath/AI-Restaurant-System.git
cd AI-Restaurant-System

# Start PostgreSQL (using Docker)
docker-compose up -d

# Copy environment file
cp .env.example .env.local

# Install all dependencies
npm install

# Setup database
cd backend
npx prisma migrate dev
npm run prisma:seed  # Optional: seed sample data
cd ..
```

### Run All Services

**Option 1: One command (requires concurrently)**
```bash
npm install -g concurrently
npm run dev
```

**Option 2: Separate terminals**

Terminal 1 - Frontend:
```bash
cd frontend && npm install && npm run dev
```

Terminal 2 - Backend:
```bash
cd backend && npm install && npm run dev
```

Terminal 3 - AI Service:
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Services will be available at:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- AI Service: `http://localhost:8000`
- Database UI: `http://localhost:5050` (pgAdmin)

## 📁 Project Structure

```
AI-Restaurant-System/
│
├── frontend/                          # Next.js + React
│   ├── app/
│   │   ├── login/                    # Auth pages
│   │   ├── register/
│   │   └── dashboard/
│   │       ├── menu/                 # MEMBER A: Sales module pages
│   │       ├── orders/
│   │       ├── sales/
│   │       ├── demand-forecast/
│   │       ├── recommendations/
│   │       ├── inventory/            # MEMBER B: Inventory module pages
│   │       ├── suppliers/
│   │       ├── waste/
│   │       └── inventory-forecast/
│   ├── components/
│   │   ├── common/                   # Shared UI components
│   │   ├── sales/                    # Member A components
│   │   └── inventory/                # Member B components
│   └── services/
│       ├── authService.ts
│       ├── salesService.ts
│       └── inventoryService.ts
│
├── backend/                           # Express.js + Prisma
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── menuController.ts     # MEMBER A
│   │   │   ├── orderController.ts
│   │   │   ├── salesController.ts
│   │   │   ├── inventoryController.ts # MEMBER B
│   │   │   ├── supplierController.ts
│   │   │   └── wasteController.ts
│   │   ├── routes/                   # Corresponding route files
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma             # Unified database schema
│   │   └── seed.ts
│   └── package.json
│
├── ai-service/                        # Python + FastAPI
│   ├── main.py
│   ├── api/
│   │   ├── demand_api.py             # MEMBER A: Demand prediction
│   │   ├── recommendation_api.py     # MEMBER A: Menu recommendations
│   │   ├── inventory_api.py          # MEMBER B: Inventory forecasting
│   │   └── waste_api.py              # MEMBER B: Waste prediction
│   ├── training/
│   │   ├── train_demand_model.py
│   │   ├── train_recommendation_model.py
│   │   ├── train_inventory_model.py
│   │   └── train_waste_model.py
│   ├── datasets/
│   ├── models/                        # Saved ML models (.pkl)
│   ├── prediction/
│   ├── requirements.txt
│   └── .gitkeep
│
├── docs/
│   ├── project-roadmap.md
│   ├── database-design.md
│   ├── api-documentation.md
│   ├── ai-models.md
│   └── final-report.md
│
├── docker-compose.yml                 # PostgreSQL + pgAdmin
├── .env.example                       # Environment variables template
├── .gitignore
├── package.json                       # Root package with dev scripts
└── README.md
```

## 🔗 Git Workflow

All members work in a **unified repository** with clear separation:

```
main (production)
  ↓
dev (integration)
  ├── member-a-sales (Member A's work)
  └── member-b-inventory (Member B's work)
```

**Workflow:**
1. Create feature branch from `dev`
2. Work independently in your branch
3. Push and create PR to `dev`
4. After review, merge to `dev`
5. Periodically sync `dev` → `main` for deployments

## 🛢️ Database Schema

**Shared Tables:**
- `User` - Authentication & roles
- `Branch` - Restaurant locations

**Member A Tables:**
- `MenuItem` - Menu items
- `Order` - Customer orders
- `OrderItem` - Order details
- `DemandPrediction` - Forecasts
- `Recommendation` - Menu recommendations

**Member B Tables:**
- `Ingredient` - Ingredient catalog
- `Inventory` - Stock levels
- `Supplier` - Supplier information
- `WasteRecord` - Waste logs
- `InventoryPrediction` - Inventory forecasts
- `WastePrediction` - Waste risk predictions

See `docs/database-design.md` for detailed schema.

## 🤖 AI/ML Models

### Member A - Sales Intelligence

**1. Demand Forecasting**
- **Algorithm:** Random Forest Regressor
- **Input:** Date, day of week, month, holidays, past sales
- **Output:** Predicted orders & revenue
- **Endpoint:** `POST /api/predict-demand`

**2. Menu Recommendations**
- **Algorithm:** Apriori / FP-Growth (or popularity-based for MVP)
- **Input:** Order history
- **Output:** Frequently bought together items
- **Endpoint:** `POST /api/recommend-items`

### Member B - Inventory Intelligence

**1. Inventory Forecasting**
- **Algorithm:** Random Forest Regressor
- **Input:** Predicted demand, current stock, past usage, sales
- **Output:** Required ingredient quantity
- **Endpoint:** `POST /api/predict-inventory`

**2. Waste Prediction**
- **Algorithm:** Random Forest Classifier
- **Input:** Stock level, expiry days, sales rate, ingredient type
- **Output:** Risk level (low/medium/high) + estimated waste
- **Endpoint:** `POST /api/predict-waste`

## 📚 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Chart.js |
| **Backend** | Node.js, Express.js, Prisma ORM |
| **Database** | PostgreSQL |
| **Auth** | JWT + bcrypt |
| **AI/ML** | Python 3.9+, FastAPI, scikit-learn |
| **Deployment** | Vercel (frontend), Render (backend & AI service) |
| **DevOps** | Docker, docker-compose |

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### Backend & AI Service (Render)
- Connect GitHub repo
- Create service from `backend/` directory
- Create service from `ai-service/` directory
- Set environment variables

### Database (Supabase)
- Create PostgreSQL project
- Update `DATABASE_URL` in `.env`

## 📝 Documentation

Detailed documentation in `docs/`:
- `project-roadmap.md` - 1-week MVP timeline
- `database-design.md` - Schema and relationships
- `api-documentation.md` - REST API endpoints
- `ai-models.md` - ML model details and training
- `final-report.md` - Project summary and results

## ✅ Features Checklist

### Auth & Setup
- [ ] User registration/login
- [ ] JWT authentication
- [ ] Role-based access control
- [ ] Dashboard layout

### Member A: Sales Module
- [ ] Menu CRUD operations
- [ ] Order management
- [ ] Sales analytics
- [ ] Demand prediction
- [ ] Menu recommendations
- [ ] Sales dashboard

### Member B: Inventory Module
- [ ] Ingredient management
- [ ] Inventory tracking
- [ ] Supplier management
- [ ] Waste logging
- [ ] Inventory forecasting
- [ ] Waste prediction
- [ ] Inventory dashboard

### Integration
- [ ] Frontend ↔ Backend API integration
- [ ] Backend ↔ AI Service integration
- [ ] ML predictions saved to database
- [ ] Charts & visualizations

### Testing & Deployment
- [ ] API testing (Postman)
- [ ] Frontend testing
- [ ] ML model accuracy metrics
- [ ] Deployment to production

## 🤝 Contributing

**For both members:**

```bash
# Update to latest
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b member-{a|b}-feature-name

# Make changes, commit, push
git add .
git commit -m "Description"
git push origin member-{a|b}-feature-name

# Create Pull Request on GitHub
# After review & approval → merge to dev
```

## 📊 Timeline

- **Day 1:** Setup & Database
- **Day 2:** Authentication
- **Days 3-4:** Core APIs (both modules)
- **Days 4-5:** ML Models (both modules)
- **Days 5-6:** Frontend (both modules)
- **Days 6-7:** Integration & Testing
- **Day 7:** Deployment

## 📞 Team

| Member | Module | GitHub |
|--------|--------|--------|
| Aruniya-Nadeshan | Sales Intelligence | @Aruniya-Nadeshan |
| Kavibarath | Inventory Intelligence | @Kavibarath |

---

**Deadline:** 1 Week  
**Demo Date:** End of Week 1  
**Status:** 🟢 In Development

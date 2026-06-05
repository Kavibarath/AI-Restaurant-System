# AI Restaurant Management System - Project Roadmap

## 1-Week MVP Timeline

### Day 1: Setup & Database (8 hrs)
- [ ] Initialize project structure (2 hrs) ✅ DONE
- [ ] Create GitHub repo and invite Member A
- [ ] Set up Docker with PostgreSQL
- [ ] Create Prisma schema and migrate
- [ ] Seed sample data

### Day 2: Authentication (4 hrs)
- [ ] Implement JWT auth endpoints
- [ ] Create login/register pages
- [ ] Test auth flow

### Day 3-4: Core APIs (8 hrs)
**Member A:**
- [ ] Menu CRUD APIs
- [ ] Order APIs
- [ ] Sales summary APIs

**Member B:**
- [ ] Ingredient CRUD APIs
- [ ] Inventory CRUD APIs
- [ ] Supplier CRUD APIs
- [ ] Waste tracking APIs

### Day 4-5: ML Models (8 hrs)
**Member A:**
- [ ] Demand forecasting model
- [ ] Recommendation model

**Member B:**
- [ ] Inventory forecasting model
- [ ] Waste prediction model

### Day 5-6: Frontend (12 hrs)
**Member A:**
- [ ] Sales dashboard
- [ ] Menu management page
- [ ] Demand forecast page
- [ ] Recommendation page

**Member B:**
- [ ] Inventory dashboard
- [ ] Ingredients page
- [ ] Waste dashboard
- [ ] Inventory forecast page

### Day 6-7: Integration & Testing (12 hrs)
- [ ] Wire ML endpoints to frontend
- [ ] Test all API endpoints
- [ ] Fix bugs and edge cases

### Day 7: Deployment (4 hrs)
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Render)
- [ ] Deploy AI service (Render)
- [ ] Final testing

## Key Features (MVP)

### Shared Features
- User login/register with JWT
- Role-based access (admin, manager, staff)
- Main dashboard with navigation

### Member A: Sales Module
- Menu item management
- Order management
- Sales trend tracking
- Demand prediction
- Item recommendations

### Member B: Inventory Module
- Ingredient inventory tracking
- Supplier management
- Waste logging and prediction
- Inventory forecasting
- Stock alerts

## Technology Stack
- **Frontend:** Next.js, React, Tailwind CSS, Chart.js
- **Backend:** Node.js, Express, Prisma
- **Database:** PostgreSQL (Supabase)
- **AI/ML:** Python, FastAPI, scikit-learn
- **Deployment:** Vercel, Render

## Team
- **Member A (Aruniya-Nadeshan):** Sales Intelligence
- **Member B (Kavibarath):** Inventory Intelligence

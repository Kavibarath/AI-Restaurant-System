# AI-Powered Smart Restaurant Management System

A full-stack intelligent restaurant management platform with AI-driven demand forecasting and waste prediction.

## 📋 Project Overview

This is a **two-member group project** split into two main modules:

- **Member A (Aruniya-Nadeshan):** Sales Intelligence Module (demand forecasting, menu recommendations)
- **Member B (Kavibarath):** Inventory Intelligence Module (inventory management, waste prediction)

Both members collaborate on shared components: authentication, dashboard layout, and deployment.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL (via Supabase)
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kavibarath/AI-Restaurant-System.git
   cd AI-Restaurant-System
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env.local
   # Update with your Supabase credentials
   ```

3. **Install root dependencies**
   ```bash
   npm install
   ```

4. **Install and setup frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **In another terminal, install and setup backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

6. **In another terminal, setup AI service**
   ```bash
   cd ai-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python -m uvicorn main:app --reload --port 8000
   ```

Frontend will be at `http://localhost:3000`
Backend at `http://localhost:5000`
AI Service at `http://localhost:8000`

## 📁 Project Structure

```
AI-Restaurant-System/
├── frontend/              # Next.js React app
│   ├── pages/
│   ├── components/
│   ├── styles/
│   └── public/
├── backend/               # Node.js Express server
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── models/
├── ai-service/            # Python FastAPI
│   ├── models/            # ML models
│   ├── services/
│   └── endpoints/
├── docs/                  # Documentation
└── .env.example
```

## 🔗 Git Workflow

- `main` — Production-ready code
- `dev` — Integration branch for both members
- `member-a-sales` — Member A's feature branch
- `member-b-inventory` — Member B's feature branch

Always create a feature branch from `dev`, work there, then submit a PR to `dev` for review.

## 📚 Technology Stack

**Frontend:** Next.js, React, Tailwind CSS, Chart.js  
**Backend:** Node.js, Express, Prisma, JWT  
**Database:** PostgreSQL (via Supabase)  
**AI/ML:** Python, FastAPI, scikit-learn, RandomForest  
**Deployment:** Vercel (frontend), Render (backend & AI service)

## ✅ Member B (Inventory) Responsibilities

- Inventory management APIs
- Ingredient management
- Supplier tracking
- Waste prediction model (ML)
- Inventory forecasting model (ML)
- Waste & Inventory dashboards

## ✅ Member A (Sales) Responsibilities

- Menu management APIs
- Order management
- Demand forecasting model (ML)
- Menu recommendation engine (ML)
- Sales & Recommendation dashboards

## 📝 Documentation

See `docs/` folder for detailed module documentation.

## 🤝 Contributing

1. Pull latest from `dev`: `git pull origin dev`
2. Create feature branch: `git checkout -b member-b-feature-name`
3. Make changes and commit
4. Push and create PR to `dev`
5. After review, merge to `dev`
6. Periodically merge `dev` to `main`

## 📞 Contact

- **Member A:** Aruniya-Nadeshan
- **Member B:** Kavibarath

---

**Timeline:** 1 Week (MVP focus)  
**Demo Date:** End of Week 1

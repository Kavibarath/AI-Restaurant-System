from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Import API routes
from api.demand_api import router as demand_router
from api.recommendation_api import router as recommendation_router
from api.inventory_api import router as inventory_router
from api.waste_api import router as waste_router

load_dotenv()

app = FastAPI(
    title="AI Restaurant Management API",
    description="ML prediction endpoints for restaurant system",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(demand_router, prefix="/api", tags=["demand"])
app.include_router(recommendation_router, prefix="/api", tags=["recommendation"])
app.include_router(inventory_router, prefix="/api", tags=["inventory"])
app.include_router(waste_router, prefix="/api", tags=["waste"])

@app.get("/")
async def root():
    return {
        "message": "AI Restaurant Management System",
        "status": "running",
        "endpoints": {
            "demand": "/api/predict-demand",
            "recommendations": "/api/recommend-items",
            "inventory": "/api/predict-inventory",
            "waste": "/api/predict-waste"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

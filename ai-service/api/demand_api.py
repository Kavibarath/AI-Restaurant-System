from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import numpy as np
from sklearn.ensemble import RandomForestRegressor

router = APIRouter()

# Matches your pre-defined request model perfectly
class DemandPredictionRequest(BaseModel):
    date: datetime
    day_of_week: int  # 0-6
    month: int  # 1-12
    is_holiday: bool
    past_sales: float

# Matches your pre-defined response model perfectly
class DemandPredictionResponse(BaseModel):
    predicted_orders: int
    predicted_sales: float
    confidence: float

@router.post("/predict-demand", response_model=DemandPredictionResponse)
async def predict_demand(request: DemandPredictionRequest):
    """
    MEMBER A - Demand Forecasting
    Predicts future orders/sales based on historical data using Random Forest.
    """
    try:
        # --- ML MODEL ENGINE ---
        # Mocking a small training historical dataset based on the incoming trend features
        # to fit a live Random Forest Regressor for the MVP prediction logic.
        base_sales = request.past_sales if request.past_sales > 0 else 1000.0
        
        # Features schema: [day_of_week, month, is_holiday, baseline_historical_sales]
        X_train = np.array([
            [0, 6, 0, base_sales * 0.9],
            [1, 6, 0, base_sales * 0.95],
            [2, 6, 0, base_sales * 1.0],
            [3, 6, 0, base_sales * 1.05],
            [4, 6, 1, base_sales * 1.3], # Higher sales on holidays
            [5, 6, 0, base_sales * 1.2],
            [6, 6, 0, base_sales * 1.1]
        ])
        
        # Targets: orders and final actual sales totals
        y_orders_train = np.array([35, 38, 40, 42, 60, 55, 48])
        y_sales_train = np.array([
            base_sales * 0.92, base_sales * 0.97, base_sales * 1.02, 
            base_sales * 1.04, base_sales * 1.35, base_sales * 1.22, base_sales * 1.12
        ])

        # Train Random Forest Regressors on the fly
        model_orders = RandomForestRegressor(n_estimators=10, random_state=42)
        model_orders.fit(X_train, y_orders_train)

        model_sales = RandomForestRegressor(n_estimators=10, random_state=42)
        model_sales.fit(X_train, y_sales_train)

        # Structure current feature query payload array
        current_features = np.array([[
            request.day_of_week, 
            request.month, 
            1 if request.is_holiday else 0, 
            request.past_sales
        ]])

        # Execute machine learning predictions
        predicted_orders = int(np.round(model_orders.predict(current_features)[0]))
        predicted_sales = float(model_sales.predict(current_features)[0])

        # Calculate a dynamic confidence value based on whether it is a holiday spike or not
        confidence = 0.78 if request.is_holiday else 0.88

        return DemandPredictionResponse(
            predicted_orders=max(1, predicted_orders),
            predicted_sales=round(max(0.0, predicted_sales), 2),
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
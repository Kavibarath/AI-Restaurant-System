"""
Demand Forecasting API - Member A
Uses trained Random Forest Regressor (training/train_demand_model.py)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
import os

router = APIRouter()

# Load trained model
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

try:
    bundle = joblib.load(os.path.join(MODELS_DIR, 'demand_model.pkl'))
    # Both models predict a multiplier of the past 7-day average
    orders_model = bundle['orders_model']
    sales_model = bundle['sales_model']
    FEATURES = bundle['features']
    # Typical relative error measured on held-out days during training
    BASE_ERROR = bundle.get('orders_mape', 0.1)
    MODEL_LOADED = True
    print("[OK] Demand forecasting model loaded successfully")
except Exception as e:
    MODEL_LOADED = False
    print(f"[WARN] Could not load demand model: {e}")

DEFAULT_ORDER_VALUE = 2500.0  # Rs., used when only past sales are known


# ---------- Single-day prediction (original contract) ----------
class DemandPredictionRequest(BaseModel):
    date: datetime
    day_of_week: int  # 0=Mon ... 6=Sun
    month: int  # 1-12
    is_holiday: bool
    past_sales: float  # average daily sales over the last 7 days
    past_orders: Optional[float] = None  # average daily orders over the last 7 days


class DemandPredictionResponse(BaseModel):
    predicted_orders: int
    predicted_sales: float
    confidence: float


# ---------- Multi-day forecast ----------
class ForecastDay(BaseModel):
    date: str  # YYYY-MM-DD
    day_of_week: int
    month: int
    is_holiday: bool = False


class ForecastRequest(BaseModel):
    days: List[ForecastDay]
    past_7day_avg_orders: float
    past_7day_avg_sales: float


class ForecastDayResult(BaseModel):
    date: str
    predicted_orders: int
    predicted_sales: float
    confidence: float


class ForecastResponse(BaseModel):
    forecast: List[ForecastDayResult]
    model: str


def _predict(day_of_week: int, month: int, is_holiday: bool,
             avg_orders: float, avg_sales: float):
    """
    Run the models for one day: predicted multiplier x recent daily average.
    Confidence = 1 - (validation error + disagreement between the trees),
    so unusual days (e.g. holidays, seen less in training) score lower.
    """
    features = pd.DataFrame([[
        day_of_week,
        month,
        1 if day_of_week >= 5 else 0,
        1 if is_holiday else 0,
    ]], columns=FEATURES)

    orders = orders_model.predict(features)[0] * avg_orders
    sales = sales_model.predict(features)[0] * avg_sales

    # Spread of individual tree predictions -> how certain the forest is
    # (individual trees were fitted on raw arrays, so pass .values)
    tree_mult = np.array([tree.predict(features.values)[0] for tree in orders_model.estimators_])
    spread = tree_mult.std() / max(tree_mult.mean(), 0.01)
    confidence = float(np.clip(1.0 - BASE_ERROR - spread, 0.5, 0.99))

    return max(0, int(round(orders))), round(max(0.0, float(sales)), 2), round(confidence, 2)


@router.post("/predict-demand", response_model=DemandPredictionResponse)
async def predict_demand(request: DemandPredictionRequest):
    """
    MEMBER A - Demand Forecasting
    Predicts orders/sales for a single day.
    """
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Demand model not loaded. Run training/train_demand_model.py")

    try:
        avg_orders = (request.past_orders if request.past_orders is not None
                      else request.past_sales / DEFAULT_ORDER_VALUE)
        orders, sales, confidence = _predict(
            request.day_of_week, request.month, request.is_holiday,
            avg_orders, request.past_sales,
        )
        return DemandPredictionResponse(
            predicted_orders=orders, predicted_sales=sales, confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/forecast-demand", response_model=ForecastResponse)
async def forecast_demand(request: ForecastRequest):
    """
    MEMBER A - Demand Forecasting
    Recursive multi-day forecast: each predicted day is fed back into the
    rolling 7-day window used as the lag feature for the next day.
    """
    if not MODEL_LOADED:
        raise HTTPException(status_code=503, detail="Demand model not loaded. Run training/train_demand_model.py")

    try:
        order_window = [request.past_7day_avg_orders] * 7
        sales_window = [request.past_7day_avg_sales] * 7
        results = []

        for day in request.days:
            orders, sales, confidence = _predict(
                day.day_of_week, day.month, day.is_holiday,
                float(np.mean(order_window)), float(np.mean(sales_window)),
            )
            results.append(ForecastDayResult(
                date=day.date,
                predicted_orders=orders,
                predicted_sales=sales,
                confidence=confidence,
            ))
            order_window = order_window[1:] + [orders]
            sales_window = sales_window[1:] + [sales]

        return ForecastResponse(forecast=results, model="RandomForestRegressor (demand multiplier)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

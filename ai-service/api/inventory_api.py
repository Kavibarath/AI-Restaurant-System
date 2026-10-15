"""
Inventory Forecasting API - Member B
Uses trained Random Forest Regressor
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import joblib
import numpy as np
import os

router = APIRouter()

# Load trained models
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

try:
    inventory_model = joblib.load(os.path.join(MODELS_DIR, 'inventory_model.pkl'))
    type_encoder = joblib.load(os.path.join(MODELS_DIR, 'inventory_type_encoder.pkl'))
    MODEL_LOADED = True
    print("[OK] Inventory forecasting model loaded successfully")
except Exception as e:
    MODEL_LOADED = False
    print(f"[WARN] Could not load inventory model: {e}")


class InventoryPredictionRequest(BaseModel):
    ingredient_id: str
    current_stock: float
    predicted_demand: float
    past_usage: float
    menu_item_sales: float = 50.0
    ingredient_type: str = "vegetable"
    day_of_week: Optional[int] = None  # 0=Mon, 6=Sun
    is_weekend: Optional[bool] = None
    is_holiday: bool = False


class InventoryPredictionResponse(BaseModel):
    ingredient_id: str
    required_quantity: float
    confidence_interval: dict  # min, max
    days_until_stockout: int
    recommendation: str
    factors: dict  # which factors most influenced the prediction


@router.post("/predict-inventory", response_model=InventoryPredictionResponse)
async def predict_inventory(request: InventoryPredictionRequest):
    """
    Predict required ingredient quantity using Random Forest Regressor.

    Considers:
    - Current stock levels
    - Predicted demand
    - Historical usage patterns
    - Day of week (weekend boost)
    - Holiday effects
    - Ingredient perishability
    """
    try:
        if not MODEL_LOADED:
            raise HTTPException(status_code=503, detail="Model not loaded")

        # Default to current day if not provided
        if request.day_of_week is None:
            request.day_of_week = datetime.now().weekday()

        is_weekend = request.is_weekend if request.is_weekend is not None else (request.day_of_week >= 5)

        # Handle unknown ingredient types
        valid_types = list(type_encoder.classes_)
        ingredient_type = request.ingredient_type if request.ingredient_type in valid_types else "vegetable"

        # Encode features
        type_encoded = type_encoder.transform([ingredient_type])[0]
        features = np.array([[
            type_encoded,
            request.current_stock,
            request.predicted_demand,
            request.past_usage,
            request.menu_item_sales,
            request.day_of_week,
            int(is_weekend),
            int(request.is_holiday)
        ]])

        # Predict
        predicted_quantity = float(inventory_model.predict(features)[0])
        predicted_quantity = max(0, predicted_quantity)

        # Calculate confidence interval (using tree variance)
        predictions_from_trees = np.array([
            tree.predict(features)[0] for tree in inventory_model.estimators_
        ])
        std_dev = float(np.std(predictions_from_trees))

        ci_min = max(0, predicted_quantity - 1.96 * std_dev)
        ci_max = predicted_quantity + 1.96 * std_dev

        # Calculate days until stockout
        if request.past_usage > 0:
            days_until_stockout = int(request.current_stock / request.past_usage)
        else:
            days_until_stockout = 999  # No usage means never stockout

        # Generate recommendation
        if days_until_stockout <= 1:
            recommendation = f"URGENT: Order {predicted_quantity:.1f} kg immediately - stockout imminent"
        elif days_until_stockout <= 3:
            recommendation = f"Order {predicted_quantity:.1f} kg within 24-48 hours"
        elif days_until_stockout <= 7:
            recommendation = f"Plan to order {predicted_quantity:.1f} kg this week"
        else:
            recommendation = f"Stock is adequate. Next order: ~{predicted_quantity:.1f} kg in {days_until_stockout-3} days"

        # Identify key factors
        factors = {
            "demand_factor": "high" if request.predicted_demand > 100 else "moderate",
            "stock_factor": "low" if request.current_stock < 20 else "adequate",
            "weekend_factor": "boost" if is_weekend else "normal",
            "holiday_factor": "boost" if request.is_holiday else "normal",
        }

        return InventoryPredictionResponse(
            ingredient_id=request.ingredient_id,
            required_quantity=round(predicted_quantity, 2),
            confidence_interval={
                "min": round(ci_min, 2),
                "max": round(ci_max, 2)
            },
            days_until_stockout=min(days_until_stockout, 999),
            recommendation=recommendation,
            factors=factors
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/inventory-model-info")
async def get_model_info():
    """Get info about the inventory forecasting model"""
    if not MODEL_LOADED:
        return {"loaded": False, "error": "Model not loaded"}

    return {
        "loaded": True,
        "algorithm": "Random Forest Regressor",
        "features": ["ingredient_type", "current_stock", "predicted_demand",
                     "past_usage", "menu_item_sales", "day_of_week",
                     "is_weekend", "is_holiday"],
        "n_estimators": inventory_model.n_estimators,
        "max_depth": inventory_model.max_depth,
    }

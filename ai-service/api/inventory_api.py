from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List

router = APIRouter()

class InventoryPredictionRequest(BaseModel):
    ingredient_id: str
    current_stock: float
    predicted_demand: float
    past_usage: float
    menu_item_sales: List[dict]  # [{item_id, quantity, date}, ...]

class InventoryPredictionResponse(BaseModel):
    required_quantity: float
    confidence: float
    days_until_stockout: int

@router.post("/predict-inventory", response_model=InventoryPredictionResponse)
async def predict_inventory(request: InventoryPredictionRequest):
    """
    MEMBER B - Inventory Forecasting
    Predicts required ingredient quantity based on demand and usage

    Uses Random Forest Regressor

    Inputs:
    - ingredient_id: which ingredient
    - current_stock: current quantity
    - predicted_demand: predicted demand from demand model
    - past_usage: historical usage rate
    - menu_item_sales: sales history

    Returns:
    - required_quantity: how much to order
    - days_until_stockout: when stock runs out
    """
    try:
        # TODO: Implement inventory forecasting using Random Forest Regressor
        # For MVP, return placeholder calculation
        required_quantity = request.predicted_demand * 1.2 + request.past_usage
        days_until_stockout = int(request.current_stock / (request.past_usage / 30))

        return InventoryPredictionResponse(
            required_quantity=required_quantity,
            confidence=0.82,
            days_until_stockout=max(1, days_until_stockout)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

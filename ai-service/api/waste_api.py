from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum

router = APIRouter()

class WasteRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class WastePredictionRequest(BaseModel):
    ingredient_id: str
    stock_level: float
    expiry_days_remaining: int
    sales_rate: float  # units sold per day
    past_waste_quantity: float
    ingredient_type: str  # vegetable, meat, dairy, etc

class WastePredictionResponse(BaseModel):
    risk_level: WasteRiskLevel
    confidence: float
    estimated_waste: float
    recommendation: str

@router.post("/predict-waste", response_model=WastePredictionResponse)
async def predict_waste(request: WastePredictionRequest):
    """
    MEMBER B - Food Waste Prediction
    Predicts waste risk using Random Forest Classifier

    Inputs:
    - ingredient_id: which ingredient
    - stock_level: current quantity
    - expiry_days_remaining: days until expiry
    - sales_rate: units sold per day
    - past_waste_quantity: historical waste
    - ingredient_type: category of ingredient

    Returns:
    - risk_level: low/medium/high
    - confidence: prediction confidence
    - estimated_waste: amount likely to be wasted
    - recommendation: action to take
    """
    try:
        # TODO: Implement waste prediction using Random Forest Classifier
        # For MVP, use simple heuristic rules

        daily_usage = request.sales_rate
        days_until_expiry = request.expiry_days_remaining

        # Calculate if ingredient will expire before being used
        if daily_usage == 0:
            risk_level = WasteRiskLevel.HIGH
            estimated_waste = request.stock_level
            recommendation = "Consider removing from menu or donating"
        elif days_until_expiry < daily_usage:
            risk_level = WasteRiskLevel.HIGH
            estimated_waste = max(0, request.stock_level - (daily_usage * days_until_expiry))
            recommendation = "Urgently use or dispose - expiring soon"
        elif days_until_expiry < daily_usage * 3:
            risk_level = WasteRiskLevel.MEDIUM
            estimated_waste = request.stock_level * 0.2
            recommendation = "Increase usage or plan promotion"
        else:
            risk_level = WasteRiskLevel.LOW
            estimated_waste = request.past_waste_quantity * 0.5
            recommendation = "Stock is healthy"

        return WastePredictionResponse(
            risk_level=risk_level,
            confidence=0.88,
            estimated_waste=estimated_waste,
            recommendation=recommendation
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

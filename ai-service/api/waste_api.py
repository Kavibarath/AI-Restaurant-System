"""
Waste Prediction API - Member B
Uses trained Random Forest Classifier
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from enum import Enum
import joblib
import numpy as np
import os

router = APIRouter()

# Load trained models (cached on first import)
MODELS_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

try:
    waste_model = joblib.load(os.path.join(MODELS_DIR, 'waste_model.pkl'))
    type_encoder = joblib.load(os.path.join(MODELS_DIR, 'waste_type_encoder.pkl'))
    risk_encoder = joblib.load(os.path.join(MODELS_DIR, 'waste_risk_encoder.pkl'))
    MODEL_LOADED = True
    print("[OK] Waste prediction model loaded successfully")
except Exception as e:
    MODEL_LOADED = False
    print(f"[WARN] Could not load waste model: {e}")


class WasteRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class WastePredictionRequest(BaseModel):
    ingredient_id: str
    stock_level: float
    expiry_days_remaining: int
    sales_rate: float
    past_waste_quantity: float = 0.0
    ingredient_type: str = "vegetable"


class WastePredictionResponse(BaseModel):
    ingredient_id: str
    risk_level: WasteRiskLevel
    confidence: float
    estimated_waste: float
    recommendation: str
    probabilities: dict


def get_recommendation(risk_level: str, stock: float, expiry: int) -> str:
    """Generate actionable recommendation based on risk"""
    if risk_level == "high":
        if expiry <= 2:
            return "URGENT: Use immediately or dispose. Consider donation or staff meal."
        return "Reduce stock through promotions, discounts, or menu specials."
    elif risk_level == "medium":
        return "Monitor closely. Consider adjusting menu portions or planning promotions."
    else:
        return "Stock levels are healthy. Continue normal operations."


@router.post("/predict-waste", response_model=WastePredictionResponse)
async def predict_waste(request: WastePredictionRequest):
    """
    Predict waste risk using trained Random Forest Classifier.

    Features used:
    - Ingredient type (encoded)
    - Stock level (kg)
    - Expiry days remaining
    - Sales rate (units/day)
    - Past waste quantity
    """
    try:
        if not MODEL_LOADED:
            raise HTTPException(status_code=503, detail="Model not loaded")

        # Handle unknown ingredient types
        valid_types = list(type_encoder.classes_)
        ingredient_type = request.ingredient_type if request.ingredient_type in valid_types else "vegetable"

        # Encode and prepare features
        type_encoded = type_encoder.transform([ingredient_type])[0]
        features = np.array([[
            type_encoded,
            request.stock_level,
            request.expiry_days_remaining,
            request.sales_rate,
            request.past_waste_quantity
        ]])

        # Predict
        prediction_encoded = waste_model.predict(features)[0]
        probabilities = waste_model.predict_proba(features)[0]

        risk_level = risk_encoder.inverse_transform([prediction_encoded])[0]
        confidence = float(probabilities.max())

        # Build probability dict
        prob_dict = {
            cls: float(prob)
            for cls, prob in zip(risk_encoder.classes_, probabilities)
        }

        # Estimate waste quantity
        if risk_level == "high":
            estimated_waste = request.stock_level * 0.4
        elif risk_level == "medium":
            estimated_waste = request.stock_level * 0.15
        else:
            estimated_waste = request.stock_level * 0.05

        return WastePredictionResponse(
            ingredient_id=request.ingredient_id,
            risk_level=WasteRiskLevel(risk_level),
            confidence=confidence,
            estimated_waste=round(estimated_waste, 2),
            recommendation=get_recommendation(risk_level, request.stock_level, request.expiry_days_remaining),
            probabilities=prob_dict
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/waste-model-info")
async def get_model_info():
    """Get info about the loaded waste prediction model"""
    if not MODEL_LOADED:
        return {"loaded": False, "error": "Model not loaded"}

    return {
        "loaded": True,
        "algorithm": "Random Forest Classifier",
        "features": ["ingredient_type", "stock_level", "expiry_days_remaining",
                     "sales_rate", "past_waste_quantity"],
        "classes": list(risk_encoder.classes_),
        "n_estimators": waste_model.n_estimators,
        "max_depth": waste_model.max_depth,
    }

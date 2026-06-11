from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

# Matches your pre-defined request template exactly
class RecommendationRequest(BaseModel):
    order_history: List[str]  # Updated to string to match standard CUID string identifiers in your database schema

# Matches your pre-defined response template exactly
class RecommendationResponse(BaseModel):
    recommended_items: List[dict]  # [{id, name, frequency, confidence}, ...]

@router.post("/recommend-items", response_model=RecommendationResponse)
async def recommend_items(request: RecommendationRequest):
    """
    MEMBER A - Menu Recommendation
    Recommends menu items based on order history context using Apriori market basket analysis logic.
    """
    try:
        # Mock Association Rules Knowledge Base (Simulating Apriori training model outputs)
        # In a fully trained state, this maps relationships based on past transactions
        mock_apriori_rules = {
            "burger_id": [
                {"id": "rec_french_fries", "name": "Crispy French Fries", "frequency": 145, "confidence": 0.88},
                {"id": "rec_coke", "name": "Coca-Cola Large", "frequency": 120, "confidence": 0.76}
            ],
            "pizza_id": [
                {"id": "rec_garlic_bread", "name": "Cheesy Garlic Bread", "frequency": 98, "confidence": 0.82},
                {"id": "rec_lava_cake", "name": "Choco Lava Cake", "frequency": 54, "confidence": 0.61}
            ],
            "pasta_id": [
                {"id": "rec_garlic_bread", "name": "Cheesy Garlic Bread", "frequency": 112, "confidence": 0.85},
                {"id": "rec_caesar_salad", "name": "Classic Caesar Salad", "frequency": 42, "confidence": 0.55}
            ]
        }

        recommendations = []

        # Scan items inside incoming order history request to find associated cross-sell items
        for item_id in request.order_history:
            # Check if we have defined any market basket rules for this item
            if item_id in mock_apriori_rules:
                for rule in mock_apriori_rules[item_id]:
                    # Prevent recommending an item that is already listed in their order history array
                    if rule["id"] not in request.order_history and rule not in recommendations:
                        recommendations.append(rule)

        # Fallback logic: If no specific association matches are found, return generic restaurant best-sellers
        if not recommendations:
            recommendations = [
                {"id": "rec_garlic_bread", "name": "Cheesy Garlic Bread", "frequency": 210, "confidence": 0.70},
                {"id": "rec_french_fries", "name": "Crispy French Fries", "frequency": 195, "confidence": 0.65}
            ]

        # Sort recommendations by highest algorithm confidence score and return
        recommendations = sorted(recommendations, key=lambda x: x["confidence"], reverse=True)

        return RecommendationResponse(recommended_items=recommendations[:3])

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""
Menu Recommendation API - Member A
Market basket analysis: Apriori-style association rules (A -> B)
mined from real order baskets sent by the backend.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from collections import Counter

router = APIRouter()

MIN_SUPPORT = 0.01  # rule must appear in at least 1% of all baskets
MIN_LIFT = 1.0  # only pairs bought together MORE often than chance
TOP_N = 3


class RecommendationRequest(BaseModel):
    target_item_id: str
    transactions: List[List[str]]  # each basket = list of menu item IDs
    items: Dict[str, str] = {}  # menu item ID -> display name


class RecommendedItem(BaseModel):
    id: str
    name: str
    support: float  # P(A and B)
    confidence: float  # P(B | A)
    lift: float  # confidence / P(B); > 1 means bought together more than by chance
    frequency: int  # number of baskets containing both A and B


class RecommendationResponse(BaseModel):
    target_item_id: str
    recommended_items: List[RecommendedItem]
    method: str


@router.post("/recommend-items", response_model=RecommendationResponse)
async def recommend_items(request: RecommendationRequest):
    """
    MEMBER A - Menu Recommendation
    For target item A, scores every co-purchased item B by the rule A -> B.
    Falls back to overall best-sellers when A has no basket history.
    """
    try:
        baskets = [set(b) for b in request.transactions if b]
        total = len(baskets)
        target = request.target_item_id
        name_of = lambda item_id: request.items.get(item_id, item_id)

        if total == 0:
            return RecommendationResponse(
                target_item_id=target, recommended_items=[], method="no-data"
            )

        # Frequent 1-itemsets (support counts)
        item_counts = Counter(item for basket in baskets for item in basket)
        target_baskets = [b for b in baskets if target in b]

        rules = []
        if target_baskets:
            pair_counts = Counter(
                other for basket in target_baskets for other in basket if other != target
            )
            for other, both in pair_counts.items():
                support = both / total
                if support < MIN_SUPPORT:
                    continue
                confidence = both / len(target_baskets)
                lift = confidence / (item_counts[other] / total)
                if lift <= MIN_LIFT:
                    continue
                rules.append(RecommendedItem(
                    id=other,
                    name=name_of(other),
                    support=round(support, 4),
                    confidence=round(confidence, 4),
                    lift=round(lift, 2),
                    frequency=both,
                ))

        if rules:
            # Rank by confidence, break ties with lift
            rules.sort(key=lambda r: (r.confidence, r.lift), reverse=True)
            return RecommendationResponse(
                target_item_id=target,
                recommended_items=rules[:TOP_N],
                method="association-rules",
            )

        # Fallback: most popular items overall (excluding the target)
        popular = [
            RecommendedItem(
                id=item_id,
                name=name_of(item_id),
                support=round(count / total, 4),
                confidence=round(count / total, 4),
                lift=1.0,
                frequency=count,
            )
            for item_id, count in item_counts.most_common()
            if item_id != target
        ][:TOP_N]

        return RecommendationResponse(
            target_item_id=target, recommended_items=popular, method="popularity-fallback"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

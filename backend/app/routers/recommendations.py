"""
GET /recommendations/{produce_id} — the app's core feature. Computes
SELL vs STORE vs PROCESS vs ALTERNATIVE BUYER for one produce entry
(see app/services/recommendation.py for the actual math), then
persists the results so the dashboard's "Active Recommendations" and
estimated-value/profit figures reflect real, already-computed data
rather than being recalculated silently behind the scenes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Produce, Recommendation
from app.schemas.recommendation import RecommendationResponse, RecommendationOption
from app.services.recommendation import evaluate_produce, risk_label

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("/{produce_id}", response_model=RecommendationResponse)
def get_recommendation(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce = db.get(Produce, produce_id)
    if produce is None or produce.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")

    results = evaluate_produce(produce, db, current_user)
    if not results:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No market price data is available for this crop yet.",
        )

    # Replace any previous recommendations for this produce with the fresh calculation
    db.query(Recommendation).filter(Recommendation.produce_id == produce_id).delete()
    for r in results:
        db.add(Recommendation(
            produce_id=produce_id,
            option=r.option,
            expected_revenue=r.expected_revenue,
            total_cost=r.total_cost,
            expected_profit=r.expected_profit,
            risk_score=r.risk_score,
            recommendation_score=r.recommendation_score,
            reason=r.reason,
        ))
    db.commit()

    return RecommendationResponse(
        produce_id=produce_id,
        crop_name=produce.crop_name,
        recommended_option=results[0].option,
        options=[
            RecommendationOption(
                option=r.option,
                expected_revenue=r.expected_revenue,
                total_cost=r.total_cost,
                expected_profit=r.expected_profit,
                risk_score=r.risk_score,
                risk_label=risk_label(r.risk_score),
                recommendation_score=r.recommendation_score,
                reason=r.reason,
            )
            for r in results
        ],
    )

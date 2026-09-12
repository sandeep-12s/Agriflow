"""
Dashboard summary for the logged-in farmer.

estimated_value and potential_profit now come from each produce
entry's best-scoring recommendation (Step 7) — a produce entry only
contributes once someone has actually opened its recommendation page
at least once (which computes and persists it). This keeps the
dashboard honest: numbers only appear once they're backed by a real
calculation, never estimated silently in the background.
available_buyers stays a simple count of the demo buyers seeded in Step 2.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Produce, Recommendation, Buyer
from app.schemas.dashboard import DashboardSummary, BuyerDashboardSummary
from app.services.recommendation import risk_label

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce_query = db.query(Produce).filter(Produce.farmer_id == current_user.id)
    total_entries = produce_query.count()
    total_quantity = (
        produce_query.with_entities(func.coalesce(func.sum(Produce.quantity), 0.0)).scalar()
    )

    all_recs = (
        db.query(Recommendation)
        .join(Produce, Recommendation.produce_id == Produce.id)
        .filter(Produce.farmer_id == current_user.id)
        .all()
    )

    # Each produce entry has up to 4 rows (one per option) — keep only the
    # best-scoring one per produce so sums below aren't inflated 4x.
    best_by_produce: dict[int, Recommendation] = {}
    for rec in all_recs:
        current_best = best_by_produce.get(rec.produce_id)
        if current_best is None or rec.recommendation_score > current_best.recommendation_score:
            best_by_produce[rec.produce_id] = rec

    winners = list(best_by_produce.values())
    recommendation_count = len(winners)
    estimated_value = sum(r.expected_revenue for r in winners)
    potential_profit = sum(r.expected_profit for r in winners)

    available_buyers = db.query(Buyer).count()

    if total_entries == 0:
        wastage_risk = "No data yet"
        next_action = "Add your first produce entry to get a recommendation."
    elif recommendation_count == 0:
        wastage_risk = "No data yet"
        next_action = "View a recommendation for your produce to see its risk and next steps."
    else:
        avg_risk = sum(r.risk_score for r in winners) / len(winners)
        wastage_risk = risk_label(avg_risk)
        next_action = "Check your recommendations to decide your next move."

    return DashboardSummary(
        total_produce_entries=total_entries,
        total_quantity=float(total_quantity),
        estimated_value=round(estimated_value, 2),
        potential_profit=round(potential_profit, 2),
        wastage_risk=wastage_risk,
        active_recommendations=recommendation_count,
        available_buyers=available_buyers,
        next_action=next_action,
    )


@router.get("/buyer-summary", response_model=BuyerDashboardSummary)
def get_buyer_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Procurement intelligence summary for buyers & wholesale agents."""
    from app.db.models import Market, MarketPrice

    # 1. Count buyer's active purchase requirements
    active_reqs = db.query(Buyer).filter(Buyer.user_id == current_user.id).count()

    # 2. Local farmer supply available
    produce_query = db.query(Produce)
    total_lots = produce_query.count()
    total_qty = produce_query.with_entities(func.coalesce(func.sum(Produce.quantity), 0.0)).scalar()

    # 3. Unique crops available
    unique_crops = db.query(Produce.crop_name).distinct().count()

    # 4. Market benchmarks
    avg_price = db.query(func.coalesce(func.avg(MarketPrice.price), 2250.0)).scalar()
    total_mandis = db.query(Market).count()

    if active_reqs == 0:
        next_action = "Post your first buying requirement to connect directly with local farmers."
    elif total_lots == 0:
        next_action = "Check regional APMC Mandi rates to benchmark your procurement prices."
    else:
        next_action = f"You have {total_lots} fresh farmer produce lots ready for direct procurement in your region."

    return BuyerDashboardSummary(
        active_requirements_count=active_reqs,
        total_farmer_produce_lots=total_lots,
        total_supply_quantity_qtl=float(total_qty),
        unique_crops_available=unique_crops,
        avg_market_price_qtl=round(float(avg_price), 2),
        active_mandis_count=total_mandis,
        next_action=next_action,
    )

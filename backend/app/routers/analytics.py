"""
Analytics — chart data drawn from the farmer's own produce,
recommendations, and transactions, plus the same market data used
elsewhere. Nothing here is a new simulation: revenue and profit come
from each produce entry's already-computed best recommendation, and
"wastage avoided" reuses the exact same STORE spoilage-loss formula
from the recommendation engine (Step 7) — recomputed on the fly since
that level of cost breakdown isn't persisted, not derived from a
separate estimate.
"""
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Produce, Recommendation, Transaction, ProduceStatus
from app.schemas.analytics import (
    AnalyticsDashboard, CropMetric, PriceTrendPoint, TransactionsSummary, ProduceStatusCount,
)
from app.routers.markets import compare_crop_prices
from app.services.recommendation import evaluate_produce

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _status_value(status) -> str:
    return status.value if hasattr(status, "value") else str(status)


@router.get("/dashboard", response_model=AnalyticsDashboard)
def get_analytics_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce_list = db.query(Produce).filter(Produce.farmer_id == current_user.id).all()
    produce_by_id = {p.id: p for p in produce_list}

    # ---- Produce quantity by crop ----
    quantity_by_crop: dict[str, float] = defaultdict(float)
    for p in produce_list:
        quantity_by_crop[p.crop_name] += p.quantity

    # ---- Revenue / profit by crop, from each produce's best-scoring persisted recommendation ----
    produce_ids = list(produce_by_id.keys())
    recs = (
        db.query(Recommendation).filter(Recommendation.produce_id.in_(produce_ids)).all()
        if produce_ids else []
    )
    best_by_produce: dict[int, Recommendation] = {}
    for rec in recs:
        current_best = best_by_produce.get(rec.produce_id)
        if current_best is None or rec.recommendation_score > current_best.recommendation_score:
            best_by_produce[rec.produce_id] = rec

    revenue_by_crop: dict[str, float] = defaultdict(float)
    profit_by_crop: dict[str, float] = defaultdict(float)
    for produce_id, rec in best_by_produce.items():
        crop = produce_by_id[produce_id].crop_name
        revenue_by_crop[crop] += rec.expected_revenue
        profit_by_crop[crop] += rec.expected_profit

    # ---- Wastage avoided: for produce that ended up SOLD, how much
    # spoilage loss the STORE option would have caused instead ----
    wastage_avoided = 0.0
    for p in produce_list:
        if p.status != ProduceStatus.sold:
            continue
        results = evaluate_produce(p, db, current_user)
        store_result = next((r for r in results if r.option == "STORE"), None)
        if store_result:
            wastage_avoided += store_result.detail.get("spoilage_loss", 0.0)

    # ---- Price trends for each crop the farmer actually has ----
    price_trends: list[PriceTrendPoint] = []
    seen_crops = set()
    for p in produce_list:
        if p.crop_name in seen_crops:
            continue
        seen_crops.add(p.crop_name)
        # Nearest market's trend as a representative sample for the crop —
        # markets.py already sorts compare_crop_prices() by distance_km.
        rows = compare_crop_prices(crop_name=p.crop_name, current_user=current_user, db=db)
        if rows and rows[0].previous_price is not None:
            price_trends.append(PriceTrendPoint(
                crop_name=p.crop_name,
                previous_price=rows[0].previous_price,
                current_price=rows[0].current_price,
            ))

    # ---- Transactions summary ----
    transactions = db.query(Transaction).filter(Transaction.farmer_id == current_user.id).all()
    by_status: dict[str, int] = defaultdict(int)
    total_value = 0.0
    total_quantity = 0.0
    for t in transactions:
        by_status[_status_value(t.status)] += 1
        total_value += t.quantity * t.price
        total_quantity += t.quantity

    # ---- Produce status breakdown ----
    status_counts: dict[str, int] = defaultdict(int)
    for p in produce_list:
        status_counts[_status_value(p.status)] += 1

    return AnalyticsDashboard(
        produce_quantity_by_crop=[CropMetric(crop_name=c, value=v) for c, v in quantity_by_crop.items()],
        revenue_by_crop=[CropMetric(crop_name=c, value=v) for c, v in revenue_by_crop.items()],
        profit_by_crop=[CropMetric(crop_name=c, value=v) for c, v in profit_by_crop.items()],
        wastage_avoided=round(wastage_avoided, 2),
        price_trends=price_trends,
        transactions_summary=TransactionsSummary(
            total_transactions=len(transactions),
            total_quantity=total_quantity,
            total_value=round(total_value, 2),
            by_status=dict(by_status),
        ),
        produce_status_breakdown=[ProduceStatusCount(status=s, count=c) for s, c in status_counts.items()],
    )

"""
Transparent SELL vs STORE vs PROCESS vs ALTERNATIVE BUYER calculator.

Every number here comes from plain arithmetic on real seeded data
(market prices, storage costs, processing costs, buyer offers) — no
ML model, no opaque scoring, per the spec's own instruction: "Do not
use complicated AI when a transparent calculation is more appropriate."

The constants below are demo economic assumptions, used only where the
app doesn't yet collect enough real input to compute them (e.g. no
farmer GPS coordinates for a real transport distance). They're named
and commented so they're easy to find and replace with real inputs
later — they are not hidden inside the formulas.
"""
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Produce, StorageFacility, ProcessingUnit, Buyer
from app.routers.markets import compare_crop_prices

# ---- Demo economic assumptions ----
TRANSPORT_RATE_PER_KM_PER_QUINTAL = 5.0   # ₹ per km per quintal moved
SELLING_COMMISSION_RATE = 0.02            # 2% mandi/broker commission on a direct sale
STORAGE_PERIOD_DAYS = 14                  # assumed 2-week hold for the STORE option
OTHER_PROCESSING_COST_RATE = 0.03         # packaging/handling during processing

SPOILAGE_RATE_BY_CROP = {
    # Fraction of value lost if stored ~2 weeks. Perishables are set higher,
    # grains near-zero — demo figures, not a lab-measured spoilage curve.
    "Tomato": 0.12, "Potato": 0.05, "Mango": 0.15,
    "Wheat": 0.01, "Rice": 0.01, "Onion": 0.04, "Milk": 0.20,
}

PROCESSED_PRODUCT_PRICE = {
    # ₹ per quintal of processed output — demo figures, not sourced from a market.
    "Tomato Puree": 6000, "Mango Pulp": 9000, "Paneer": 25000,
}


@dataclass
class OptionResult:
    option: str
    expected_revenue: float
    total_cost: float
    expected_profit: float
    risk_score: float
    recommendation_score: float = 0.0
    reason: str = ""
    detail: dict = field(default_factory=dict)


def risk_label(score: float) -> str:
    if score < 20:
        return "Low"
    if score < 50:
        return "Medium"
    return "High"


def evaluate_produce(produce: Produce, db: Session, current_user) -> list[OptionResult]:
    """Computes every available option for one produce entry, scores them,
    and returns them sorted best-first. Returns [] if there's no market
    price data for the crop at all (nothing to compute against)."""
    results: list[OptionResult] = []

    market_rows = compare_crop_prices(crop_name=produce.crop_name, current_user=current_user, db=db)
    if not market_rows:
        return results

    # Best market today = highest expected profit if sold right now
    best_row = None
    best_profit_today = None
    for row in market_rows:
        revenue = row.current_price * produce.quantity
        transport = row.distance_km * TRANSPORT_RATE_PER_KM_PER_QUINTAL * produce.quantity
        selling_cost = revenue * SELLING_COMMISSION_RATE
        profit = revenue - transport - selling_cost
        if best_profit_today is None or profit > best_profit_today:
            best_profit_today = profit
            best_row = row

    # ---- SELL NOW ----
    revenue = best_row.current_price * produce.quantity
    transport = best_row.distance_km * TRANSPORT_RATE_PER_KM_PER_QUINTAL * produce.quantity
    selling_cost = revenue * SELLING_COMMISSION_RATE
    profit = revenue - transport - selling_cost
    results.append(OptionResult(
        option="SELL_NOW",
        expected_revenue=round(revenue, 2),
        total_cost=round(transport + selling_cost, 2),
        expected_profit=round(profit, 2),
        risk_score=15.0,  # immediate sale — mainly just "did we pick the best market" risk
        detail={
            "market": best_row.market_name,
            "price_per_unit": best_row.current_price,
            "transport_cost": round(transport, 2),
            "selling_cost": round(selling_cost, 2),
        },
    ))

    # ---- STORE ----
    storage = (
        db.query(StorageFacility)
        .filter(StorageFacility.supported_crops.contains(produce.crop_name))
        .first()
    )
    if storage:
        weekly_change_pct = best_row.price_change_pct or 0.0
        projected_price = best_row.current_price * (
            1 + (weekly_change_pct / 100) * (STORAGE_PERIOD_DAYS / 7)
        )
        future_revenue = projected_price * produce.quantity
        store_transport = best_row.distance_km * TRANSPORT_RATE_PER_KM_PER_QUINTAL * produce.quantity
        storage_cost = storage.cost_per_unit * produce.quantity * STORAGE_PERIOD_DAYS
        spoilage_rate = SPOILAGE_RATE_BY_CROP.get(produce.crop_name, 0.08)
        spoilage_loss = future_revenue * spoilage_rate
        store_profit = future_revenue - store_transport - storage_cost - spoilage_loss

        risk = min(100.0, spoilage_rate * 100 + abs(weekly_change_pct) * 0.5)
        results.append(OptionResult(
            option="STORE",
            expected_revenue=round(future_revenue, 2),
            total_cost=round(store_transport + storage_cost + spoilage_loss, 2),
            expected_profit=round(store_profit, 2),
            risk_score=round(risk, 1),
            detail={
                "facility": storage.name,
                "projected_price_per_unit": round(projected_price, 2),
                "storage_cost": round(storage_cost, 2),
                "spoilage_loss": round(spoilage_loss, 2),
                "storage_days": STORAGE_PERIOD_DAYS,
            },
        ))

    # ---- PROCESS ----
    processor = (
        db.query(ProcessingUnit)
        .filter(ProcessingUnit.input_product == produce.crop_name)
        .first()
    )
    if processor and processor.output_product in PROCESSED_PRODUCT_PRICE:
        output_qty = produce.quantity * processor.estimated_output
        output_price = PROCESSED_PRODUCT_PRICE[processor.output_product]
        processed_revenue = output_qty * output_price
        processing_cost = processor.processing_cost * produce.quantity
        process_transport = processor.distance_km * TRANSPORT_RATE_PER_KM_PER_QUINTAL * produce.quantity
        other_costs = processed_revenue * OTHER_PROCESSING_COST_RATE
        process_profit = processed_revenue - processing_cost - process_transport - other_costs

        risk = min(100.0, 25.0 + processor.distance_km / 10)
        results.append(OptionResult(
            option="PROCESS",
            expected_revenue=round(processed_revenue, 2),
            total_cost=round(processing_cost + process_transport + other_costs, 2),
            expected_profit=round(process_profit, 2),
            risk_score=round(risk, 1),
            detail={
                "processor": processor.name,
                "output_product": processor.output_product,
                "output_quantity": round(output_qty, 2),
                "processing_cost": round(processing_cost, 2),
                "transport_cost": round(process_transport, 2),
                "other_costs": round(other_costs, 2),
            },
        ))

    # ---- ALTERNATIVE BUYER ----
    # Only buyers who can take the whole entry qualify, so every option is
    # compared apples-to-apples against the same total quantity.
    buyer = (
        db.query(Buyer)
        .filter(Buyer.product == produce.crop_name, Buyer.required_quantity >= produce.quantity)
        .order_by(Buyer.offered_price.desc())
        .first()
    )
    if buyer:
        # Assumes the buyer arranges their own pickup — common for wholesale
        # buyers — so no transport line here, unlike the other three options.
        buyer_revenue = buyer.offered_price * produce.quantity
        buyer_selling_cost = buyer_revenue * SELLING_COMMISSION_RATE
        buyer_profit = buyer_revenue - buyer_selling_cost
        results.append(OptionResult(
            option="ALT_BUYER",
            expected_revenue=round(buyer_revenue, 2),
            total_cost=round(buyer_selling_cost, 2),
            expected_profit=round(buyer_profit, 2),
            risk_score=10.0,  # price is locked in by the buyer's offer
            detail={
                "buyer": buyer.name,
                "offered_price": buyer.offered_price,
                "quality_requirement": buyer.quality_requirement,
            },
        ))

    # ---- Score every option relative to the best profit among them ----
    best_profit = max((r.expected_profit for r in results), default=0)
    for r in results:
        if best_profit <= 0 or r.expected_profit <= 0:
            profit_score = 0.0
        else:
            profit_score = min(100.0, 100.0 * r.expected_profit / best_profit)
        r.recommendation_score = round(0.65 * profit_score + 0.35 * (100 - r.risk_score), 1)

    results.sort(key=lambda r: r.recommendation_score, reverse=True)

    if results:
        for i, r in enumerate(results):
            r.reason = _build_reason(r, is_top=(i == 0))

    return results


def _build_reason(r: OptionResult, is_top: bool) -> str:
    label = {
        "SELL_NOW": "Selling now",
        "STORE": "Storing",
        "PROCESS": "Processing",
        "ALT_BUYER": "Selling to the matched buyer",
    }[r.option]
    lead = "provides the highest estimated value" if is_top else "is estimated at"
    return (
        f"{label} {lead} (₹{r.expected_profit:,.0f} expected profit) with "
        f"{risk_label(r.risk_score).lower()} risk, after accounting for the "
        f"relevant transport, storage, processing, or commission costs."
    )

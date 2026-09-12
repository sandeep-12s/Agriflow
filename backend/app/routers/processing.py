"""
Processing marketplace — "Turn Produce into Value". /processing lists
every processing unit; /processing/opportunities/{produce_id} computes
real input/output/cost/revenue/profit numbers for one produce entry,
reusing the exact same demo prices and cost model as the PROCESS
option in the recommendation engine (Step 7) so the two never disagree.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, ProcessingUnit, Produce
from app.schemas.processing import ProcessingUnitOut, ProcessingOpportunity
from app.services.recommendation import (
    PROCESSED_PRODUCT_PRICE,
    TRANSPORT_RATE_PER_KM_PER_QUINTAL,
    OTHER_PROCESSING_COST_RATE,
)

router = APIRouter(prefix="/processing", tags=["processing"])


@router.get("", response_model=list[ProcessingUnitOut])
def list_processing_units(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(ProcessingUnit).order_by(ProcessingUnit.distance_km).all()


@router.get("/opportunities/{produce_id}", response_model=list[ProcessingOpportunity])
def processing_opportunities(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce = db.get(Produce, produce_id)
    if produce is None or produce.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")

    units = (
        db.query(ProcessingUnit)
        .filter(ProcessingUnit.input_product.ilike(produce.crop_name))
        .all()
    )

    opportunities: list[ProcessingOpportunity] = []
    for unit in units:
        if unit.output_product not in PROCESSED_PRODUCT_PRICE:
            continue
        output_qty = produce.quantity * unit.estimated_output
        output_price = PROCESSED_PRODUCT_PRICE[unit.output_product]
        revenue = output_qty * output_price
        processing_cost = unit.processing_cost * produce.quantity
        transport = unit.distance_km * TRANSPORT_RATE_PER_KM_PER_QUINTAL * produce.quantity
        other_costs = revenue * OTHER_PROCESSING_COST_RATE
        profit = revenue - processing_cost - transport - other_costs

        opportunities.append(ProcessingOpportunity(
            processor_id=unit.id,
            processor_name=unit.name,
            input_product=unit.input_product,
            output_product=unit.output_product,
            input_quantity=produce.quantity,
            processing_cost=round(processing_cost, 2),
            expected_output=round(output_qty, 2),
            estimated_revenue=round(revenue, 2),
            potential_profit=round(profit, 2),
            processing_location=unit.location,
            distance_km=unit.distance_km,
        ))

    return opportunities

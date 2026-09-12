"""
Processing marketplace — "Turn Produce into Value". /processing lists
every processing unit; /processing/opportunities/{produce_id} computes
real input/output/cost/revenue/profit numbers for one produce entry,
reusing the exact same demo prices and cost model as the PROCESS
option in the recommendation engine (Step 7) so the two never disagree.
Dynamically computes distance based on the farmer's GPS coordinates or location.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, ProcessingUnit, Produce
from app.schemas.processing import ProcessingUnitOut, ProcessingOpportunity
from app.db.seed import seed_if_empty
from app.services.mandi_live_feed import get_coordinates_for_location, haversine_distance_km
from app.services.recommendation import (
    PROCESSED_PRODUCT_PRICE,
    TRANSPORT_RATE_PER_KM_PER_QUINTAL,
    OTHER_PROCESSING_COST_RATE,
)

router = APIRouter(prefix="/processing", tags=["processing"])


def _calculate_processing_distances(
    units: list[ProcessingUnit],
    user_lat: Optional[float],
    user_lon: Optional[float],
) -> list[ProcessingUnitOut]:
    result = []
    for u in units:
        dist = u.distance_km
        if user_lat is not None and user_lon is not None and u.latitude and u.longitude:
            dist = haversine_distance_km(user_lat, user_lon, u.latitude, u.longitude)
        
        result.append(ProcessingUnitOut(
            id=u.id,
            name=u.name,
            location=u.location,
            latitude=u.latitude,
            longitude=u.longitude,
            input_product=u.input_product,
            input_capacity=u.input_capacity,
            processing_cost=u.processing_cost,
            output_product=u.output_product,
            estimated_output=u.estimated_output,
            distance_km=dist,
            contact_email=u.contact_email,
            contact_phone=u.contact_phone,
            description=u.description,
        ))
    result.sort(key=lambda x: x.distance_km)
    return result


@router.get("", response_model=list[ProcessingUnitOut])
def list_processing_units(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(ProcessingUnit).count() == 0:
        seed_if_empty(db)

    units = db.query(ProcessingUnit).all()
    user_lat, user_lon = latitude, longitude
    if user_lat is None or user_lon is None:
        user_coords = get_coordinates_for_location(current_user.location)
        if user_coords:
            user_lat, user_lon = user_coords

    return _calculate_processing_distances(units, user_lat, user_lon)


@router.get("/opportunities/{produce_id}", response_model=list[ProcessingOpportunity])
def processing_opportunities(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce = db.get(Produce, produce_id)
    if produce is None or produce.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")

    if db.query(ProcessingUnit).count() == 0:
        seed_if_empty(db)

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
            processing_cost=processing_cost,
            expected_output=output_qty,
            estimated_revenue=revenue,
            potential_profit=profit,
            processing_location=unit.location,
            distance_km=unit.distance_km,
        ))

    opportunities.sort(key=lambda x: x.potential_profit, reverse=True)
    return opportunities

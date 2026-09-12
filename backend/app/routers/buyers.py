"""
Buyer marketplace. /buyers and /buyers/{id} are general browsing —
every buyer posting is visible to any logged-in farmer, same as a real
marketplace. /buyers/matching/{produce_id} is scoped to the caller's
own produce, since "does this fit MY entry" only makes sense per farmer.
Dynamically computes distance based on the farmer's GPS coordinates or location.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Buyer, Produce
from app.schemas.buyer import BuyerOut, BuyerCreate, BuyerUpdate
from app.db.seed import seed_if_empty
from app.services.mandi_live_feed import get_coordinates_for_location, haversine_distance_km

router = APIRouter(prefix="/buyers", tags=["buyers"])


def _calculate_buyer_distances(
    buyers: list[Buyer],
    user_lat: Optional[float],
    user_lon: Optional[float],
) -> list[BuyerOut]:
    result = []
    for b in buyers:
        dist = None
        if user_lat is not None and user_lon is not None and b.latitude and b.longitude:
            dist = haversine_distance_km(user_lat, user_lon, b.latitude, b.longitude)
        
        result.append(BuyerOut(
            id=b.id,
            user_id=b.user_id,
            name=b.name,
            product=b.product,
            required_quantity=b.required_quantity,
            offered_price=b.offered_price,
            location=b.location,
            latitude=b.latitude,
            longitude=b.longitude,
            quality_requirement=b.quality_requirement,
            contact=b.contact,
            distance_km=dist,
        ))
    if user_lat is not None and user_lon is not None:
        result.sort(key=lambda x: (x.distance_km if x.distance_km is not None else 99999, -x.offered_price))
    else:
        result.sort(key=lambda x: x.offered_price, reverse=True)
    return result


@router.get("", response_model=list[BuyerOut])
def list_buyers(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(Buyer).count() == 0:
        seed_if_empty(db)

    buyers = db.query(Buyer).all()
    user_lat, user_lon = latitude, longitude
    if user_lat is None or user_lon is None:
        user_coords = get_coordinates_for_location(current_user.location)
        if user_coords:
            user_lat, user_lon = user_coords

    return _calculate_buyer_distances(buyers, user_lat, user_lon)


@router.post("", response_model=BuyerOut, status_code=status.HTTP_201_CREATED)
def create_buyer_requirement(
    payload: BuyerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows a registered buyer or trader to post what produce they want to purchase."""
    buyer = Buyer(
        user_id=current_user.id,
        name=payload.name or current_user.name,
        product=payload.product,
        required_quantity=payload.required_quantity,
        offered_price=payload.offered_price,
        location=payload.location or current_user.location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        quality_requirement=payload.quality_requirement,
        contact=payload.contact or current_user.phone or current_user.email,
    )
    db.add(buyer)
    db.commit()
    db.refresh(buyer)
    return buyer


@router.get("/my-requirements", response_model=list[BuyerOut])
def get_my_requirements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists requirements posted by the logged-in buyer user."""
    return db.query(Buyer).filter(Buyer.user_id == current_user.id).order_by(Buyer.id.desc()).all()


@router.get("/matching/{produce_id}", response_model=list[BuyerOut])
def matching_buyers(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Buyers who want this produce's crop and can take the whole quantity."""
    produce = db.get(Produce, produce_id)
    if produce is None or produce.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")

    if db.query(Buyer).count() == 0:
        seed_if_empty(db)

    buyers = (
        db.query(Buyer)
        .filter(Buyer.product.ilike(produce.crop_name), Buyer.required_quantity >= produce.quantity)
        .all()
    )

    user_coords = get_coordinates_for_location(current_user.location)
    user_lat, user_lon = user_coords if user_coords else (None, None)
    return _calculate_buyer_distances(buyers, user_lat, user_lon)


@router.get("/{buyer_id}", response_model=BuyerOut)
def get_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buyer = db.get(Buyer, buyer_id)
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer not found")
    
    user_coords = get_coordinates_for_location(current_user.location)
    dist = None
    if user_coords and buyer.latitude and buyer.longitude:
        dist = haversine_distance_km(user_coords[0], user_coords[1], buyer.latitude, buyer.longitude)
    
    return BuyerOut(
        id=buyer.id,
        user_id=buyer.user_id,
        name=buyer.name,
        product=buyer.product,
        required_quantity=buyer.required_quantity,
        offered_price=buyer.offered_price,
        location=buyer.location,
        latitude=buyer.latitude,
        longitude=buyer.longitude,
        quality_requirement=buyer.quality_requirement,
        contact=buyer.contact,
        distance_km=dist,
    )


@router.put("/{buyer_id}", response_model=BuyerOut)
def update_buyer_requirement(
    buyer_id: int,
    payload: BuyerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buyer = db.get(Buyer, buyer_id)
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found")
    if buyer.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to edit this requirement")

    if payload.name is not None:
        buyer.name = payload.name
    if payload.product is not None:
        buyer.product = payload.product
    if payload.required_quantity is not None:
        buyer.required_quantity = payload.required_quantity
    if payload.offered_price is not None:
        buyer.offered_price = payload.offered_price
    if payload.location is not None:
        buyer.location = payload.location
    if payload.latitude is not None:
        buyer.latitude = payload.latitude
    if payload.longitude is not None:
        buyer.longitude = payload.longitude
    if payload.quality_requirement is not None:
        buyer.quality_requirement = payload.quality_requirement
    if payload.contact is not None:
        buyer.contact = payload.contact

    db.commit()
    db.refresh(buyer)
    return buyer


@router.delete("/{buyer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_buyer_requirement(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buyer = db.get(Buyer, buyer_id)
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer requirement not found")
    if buyer.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to delete this requirement")

    db.delete(buyer)
    db.commit()

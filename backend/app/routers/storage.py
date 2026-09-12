"""
Storage finder. /storage is a general listing; /storage/nearby sorts
by distance_km and can filter to facilities that support a given crop.
Dynamically computes distance based on the farmer's GPS coordinates or location.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, StorageFacility
from app.schemas.storage import StorageFacilityOut
from app.db.seed import seed_if_empty
from app.services.mandi_live_feed import get_coordinates_for_location, haversine_distance_km

router = APIRouter(prefix="/storage", tags=["storage"])


def _calculate_storage_distances(
    facilities: list[StorageFacility],
    user_lat: Optional[float],
    user_lon: Optional[float],
) -> list[StorageFacilityOut]:
    result = []
    for f in facilities:
        dist = f.distance_km
        if user_lat is not None and user_lon is not None and f.latitude and f.longitude:
            dist = haversine_distance_km(user_lat, user_lon, f.latitude, f.longitude)
        
        result.append(StorageFacilityOut(
            id=f.id,
            name=f.name,
            location=f.location,
            latitude=f.latitude,
            longitude=f.longitude,
            type=f.type,
            distance_km=dist,
            capacity=f.capacity,
            available_capacity=f.available_capacity,
            cost_per_unit=f.cost_per_unit,
            supported_crops=f.supported_crops,
        ))
    result.sort(key=lambda x: x.distance_km)
    return result


@router.get("", response_model=list[StorageFacilityOut])
def list_storage(
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(StorageFacility).count() == 0:
        seed_if_empty(db)

    facilities = db.query(StorageFacility).all()
    user_lat, user_lon = latitude, longitude
    if user_lat is None or user_lon is None:
        user_coords = get_coordinates_for_location(current_user.location)
        if user_coords:
            user_lat, user_lon = user_coords

    return _calculate_storage_distances(facilities, user_lat, user_lon)


@router.get("/nearby", response_model=list[StorageFacilityOut])
def nearby_storage(
    crop_name: Optional[str] = None,
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.query(StorageFacility).count() == 0:
        seed_if_empty(db)

    query = db.query(StorageFacility)
    if crop_name:
        query = query.filter(StorageFacility.supported_crops.contains(crop_name))
    facilities = query.all()

    user_lat, user_lon = latitude, longitude
    if user_lat is None or user_lon is None:
        user_coords = get_coordinates_for_location(current_user.location)
        if user_coords:
            user_lat, user_lon = user_coords

    return _calculate_storage_distances(facilities, user_lat, user_lon)

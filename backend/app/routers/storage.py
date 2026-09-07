"""
Storage finder. /storage is a general listing; /storage/nearby sorts
by the same demo distance_km used elsewhere (see Market,
ProcessingUnit) and can filter to facilities that support a given crop.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, StorageFacility
from app.schemas.storage import StorageFacilityOut

router = APIRouter(prefix="/storage", tags=["storage"])


@router.get("", response_model=list[StorageFacilityOut])
def list_storage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(StorageFacility).order_by(StorageFacility.distance_km).all()


@router.get("/nearby", response_model=list[StorageFacilityOut])
def nearby_storage(
    crop_name: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(StorageFacility)
    if crop_name:
        query = query.filter(StorageFacility.supported_crops.contains(crop_name))
    return query.order_by(StorageFacility.distance_km).all()

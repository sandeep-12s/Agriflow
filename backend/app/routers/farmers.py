from fastapi import APIRouter, Depends, Query

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.get("/detect-region")
def detect_farmer_region(
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    location: str | None = Query(default=None, max_length=120),
    state: str | None = Query(default=None, max_length=80),
    district: str | None = Query(default=None, max_length=80),
):
    """
    Detect Indian state and district from coordinates or location text,
    and return the recommended regional language for the farmer.
    """
    from app.services.mandi_live_feed import resolve_region_and_language

    return resolve_region_and_language(
        latitude=latitude,
        longitude=longitude,
        location_text=location,
        state=state,
        district=district,
    )


@router.get("/me", response_model=UserOut)
def read_current_farmer(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/seed-demo-data")
def seed_demo_data_endpoint(db = Depends(get_db)):
    """Triggers verified demo seeding across all Indian states."""
    from app.db.seed import seed_if_empty
    seed_if_empty(db)
    from app.db.models import Buyer, StorageFacility, ProcessingUnit, Market
    return {
        "status": "seeded",
        "buyers_count": db.query(Buyer).count(),
        "storage_count": db.query(StorageFacility).count(),
        "processing_count": db.query(ProcessingUnit).count(),
        "markets_count": db.query(Market).count(),
    }


"""
Buyer marketplace. /buyers and /buyers/{id} are general browsing —
every buyer posting is visible to any logged-in farmer, same as a real
marketplace. /buyers/matching/{produce_id} is scoped to the caller's
own produce, since "does this fit MY entry" only makes sense per farmer.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Buyer, Produce
from app.schemas.buyer import BuyerOut

router = APIRouter(prefix="/buyers", tags=["buyers"])


@router.get("", response_model=list[BuyerOut])
def list_buyers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Buyer).order_by(Buyer.offered_price.desc()).all()


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

    return (
        db.query(Buyer)
        .filter(Buyer.product == produce.crop_name, Buyer.required_quantity >= produce.quantity)
        .order_by(Buyer.offered_price.desc())
        .all()
    )


@router.get("/{buyer_id}", response_model=BuyerOut)
def get_buyer(
    buyer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buyer = db.get(Buyer, buyer_id)
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer not found")
    return buyer

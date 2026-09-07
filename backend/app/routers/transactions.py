"""
Transaction creation. A transaction starts "pending" — nothing else in
the app currently advances that status automatically; a future step
could add buyer-side confirmation. Creating one for a produce entry's
full quantity marks that produce "sold" so it stops showing as
available elsewhere in the app.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Buyer, Produce, Transaction, TransactionStatus, ProduceStatus
from app.schemas.transaction import TransactionCreate, TransactionOut

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    produce = db.get(Produce, payload.produce_id)
    if produce is None or produce.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")

    if produce.status == ProduceStatus.sold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This produce entry has already been sold",
        )

    buyer = db.get(Buyer, payload.buyer_id)
    if buyer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer not found")

    if payload.quantity > produce.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction quantity can't exceed the produce entry's quantity",
        )
    if payload.quantity > buyer.required_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This buyer can't take that much quantity",
        )

    transaction = Transaction(
        farmer_id=current_user.id,
        buyer_id=payload.buyer_id,
        produce_id=payload.produce_id,
        quantity=payload.quantity,
        price=payload.price,
        status=TransactionStatus.pending,
    )
    db.add(transaction)

    # Mark the produce sold once a transaction covers its full quantity
    if payload.quantity >= produce.quantity:
        produce.status = ProduceStatus.sold

    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Transaction)
        .filter(Transaction.farmer_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

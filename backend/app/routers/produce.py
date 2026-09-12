"""
Produce CRUD. Every route is scoped to the logged-in farmer — a farmer
can only ever see, edit, or delete their own produce, enforced by
filtering on farmer_id everywhere and by _get_owned_produce() below.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Produce
from app.schemas.produce import ProduceCreate, ProduceUpdate, ProduceOut

router = APIRouter(prefix="/produce", tags=["produce"])


def _get_owned_produce(produce_id: int, current_user: User, db: Session) -> Produce:
    item = db.get(Produce, produce_id)
    if item is None or item.farmer_id != current_user.id:
        # 404, not 403 — this also avoids revealing that a given id
        # belongs to someone else's account.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produce not found")
    return item


@router.post("", response_model=ProduceOut, status_code=status.HTTP_201_CREATED)
def create_produce(
    payload: ProduceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = Produce(farmer_id=current_user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[ProduceOut])
def list_produce(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "buyer":
        return (
            db.query(Produce)
            .order_by(Produce.created_at.desc())
            .all()
        )
    return (
        db.query(Produce)
        .filter(Produce.farmer_id == current_user.id)
        .order_by(Produce.created_at.desc())
        .all()
    )


@router.get("/{produce_id}", response_model=ProduceOut)
def get_produce(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_produce(produce_id, current_user, db)


@router.put("/{produce_id}", response_model=ProduceOut)
def update_produce(
    produce_id: int,
    payload: ProduceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_produce(produce_id, current_user, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{produce_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_produce(
    produce_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = _get_owned_produce(produce_id, current_user, db)
    db.delete(item)
    db.commit()
    return None

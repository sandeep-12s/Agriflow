"""
Market listing and price data. Every figure here traces back to
Step 2/6's seed script — clearly demo data, never presented as a live
mandi feed. See app/db/seed.py's module docstring for the disclosure.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Market, MarketPrice
from app.schemas.market import MarketOut, MarketPriceOut, CropPriceComparisonRow

router = APIRouter(prefix="/markets", tags=["markets"])


@router.get("", response_model=list[MarketOut])
def list_markets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Market).order_by(Market.distance_km).all()


@router.get("/crops", response_model=list[str])
def list_crops(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Distinct crop names that have price data — drives the frontend's crop picker."""
    rows = db.query(MarketPrice.crop_name).distinct().order_by(MarketPrice.crop_name).all()
    return [row[0] for row in rows]


@router.get("/{market_id}/prices", response_model=list[MarketPriceOut])
def get_market_prices(
    market_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    market = db.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found")

    return (
        db.query(MarketPrice)
        .filter(MarketPrice.market_id == market_id)
        .order_by(MarketPrice.crop_name, MarketPrice.date.desc())
        .all()
    )


@router.get("/compare/{crop_name}", response_model=list[CropPriceComparisonRow])
def compare_crop_prices(
    crop_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Current vs previous price for one crop, across every market — this
    is what the price-comparison table on the frontend is built from.
    """
    markets = db.query(Market).order_by(Market.distance_km).all()
    rows: list[CropPriceComparisonRow] = []

    for market in markets:
        recent_prices = (
            db.query(MarketPrice)
            .filter(MarketPrice.market_id == market.id, MarketPrice.crop_name == crop_name)
            .order_by(MarketPrice.date.desc())
            .limit(2)
            .all()
        )
        if not recent_prices:
            continue

        current = recent_prices[0]
        previous = recent_prices[1] if len(recent_prices) > 1 else None

        if previous:
            change = current.price - previous.price
            change_pct = (change / previous.price) * 100 if previous.price else None
            trend = "up" if change > 0 else "down" if change < 0 else "flat"
        else:
            change = None
            change_pct = None
            trend = "unknown"

        rows.append(CropPriceComparisonRow(
            market_id=market.id,
            market_name=market.name,
            distance_km=market.distance_km,
            current_price=current.price,
            previous_price=previous.price if previous else None,
            price_change=change,
            price_change_pct=change_pct,
            trend=trend,
            demand=current.demand,
        ))

    return rows

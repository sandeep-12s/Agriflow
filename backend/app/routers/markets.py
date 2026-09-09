"""Market listings plus live mandi price lookup."""
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Market, MarketPrice
from app.schemas.market import MarketOut, MarketPriceOut, CropPriceComparisonRow, LiveMarketPrice
from app.core.config import settings
from app.services.crop_catalog import INDIA_CROPS

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
    """Return the India-wide crop catalog, plus any seeded custom crops."""
    rows = db.query(MarketPrice.crop_name).distinct().order_by(MarketPrice.crop_name).all()
    return sorted(set(INDIA_CROPS).union(row[0] for row in rows))


@router.get("/live-prices", response_model=list[LiveMarketPrice])
def get_live_prices(
    crop_name: str = Query(min_length=2, max_length=80),
    state: str | None = Query(default=None, max_length=80),
    district: str | None = Query(default=None, max_length=80),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Read AGMARKNET data.gov.in prices when an API key is configured.

    Without a key, return local demo rows with is_live=false instead of
    presenting estimates as real mandi data.
    """
    fetched_at = datetime.now(timezone.utc)
    if settings.DATA_GOV_API_KEY:
        params = {
            "api-key": settings.DATA_GOV_API_KEY,
            "format": "json",
            "limit": 100,
            "filters[commodity]": crop_name,
        }
        if state:
            params["filters[state]"] = state
        if district:
            params["filters[district]"] = district
        try:
            response = requests.get(
                f"https://api.data.gov.in/resource/{settings.DATA_GOV_MANDI_RESOURCE_ID}",
                params=params,
                timeout=8,
            )
            response.raise_for_status()
            records = response.json().get("records", [])
            return [LiveMarketPrice(
                market_name=str(record.get("market", "Unknown market")),
                state=record.get("state"),
                district=record.get("district"),
                commodity=str(record.get("commodity", crop_name)),
                variety=record.get("variety"),
                min_price=_number(record.get("min_price")),
                max_price=_number(record.get("max_price")),
                modal_price=_number(record.get("modal_price")),
                arrival_date=record.get("arrival_date"),
                source="AGMARKNET / data.gov.in",
                is_live=True,
                fetched_at=fetched_at,
            ) for record in records]
        except (requests.RequestException, ValueError):
            pass

    rows = db.query(MarketPrice, Market).join(Market).filter(
        MarketPrice.crop_name.ilike(crop_name)
    ).order_by(MarketPrice.date.desc()).all()
    latest_by_market: dict[int, MarketPrice] = {}
    for price, market in rows:
        latest_by_market.setdefault(market.id, price)
    return [LiveMarketPrice(
        market_name=db.get(Market, market_id).name,
        commodity=crop_name,
        modal_price=price.price,
        source="AgriFlow demo seed data",
        is_live=False,
        fetched_at=fetched_at,
    ) for market_id, price in latest_by_market.items()]


def _number(value: object) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


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

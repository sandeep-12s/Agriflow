from datetime import date
from typing import Optional

from pydantic import BaseModel


class MarketOut(BaseModel):
    id: int
    name: str
    location: str
    latitude: float
    longitude: float
    distance_km: float

    model_config = {"from_attributes": True}


class MarketPriceOut(BaseModel):
    id: int
    market_id: int
    crop_name: str
    price: float
    demand: str
    date: date

    model_config = {"from_attributes": True}


class CropPriceComparisonRow(BaseModel):
    """One row of the price-comparison table: a single market's current
    vs previous price for one crop, plus the computed change and trend."""
    market_id: int
    market_name: str
    distance_km: float
    current_price: float
    previous_price: Optional[float]
    price_change: Optional[float]       # current - previous
    price_change_pct: Optional[float]
    trend: str                          # "up" / "down" / "flat" / "unknown"
    demand: str

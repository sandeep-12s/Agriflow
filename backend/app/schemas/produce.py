from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProduceCreate(BaseModel):
    crop_name: str = Field(min_length=2, max_length=80)
    quantity: float = Field(gt=0)
    unit: str = Field(default="Quintal", max_length=20)
    quality: str = Field(default="Grade A", max_length=20)
    harvest_date: date
    location: str = Field(min_length=2, max_length=120)
    expected_sell_date: Optional[date] = None


class ProduceUpdate(BaseModel):
    """
    All fields optional so a caller can send just what changed. Status
    isn't editable here on purpose — it's driven by the recommendation
    engine (Step 7) and transactions (Step 8), not typed in freehand.
    """
    crop_name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = None
    quality: Optional[str] = None
    harvest_date: Optional[date] = None
    location: Optional[str] = None
    expected_sell_date: Optional[date] = None


class ProduceOut(BaseModel):
    id: int
    farmer_id: int
    crop_name: str
    quantity: float
    unit: str
    quality: str
    harvest_date: date
    location: str
    expected_sell_date: Optional[date]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

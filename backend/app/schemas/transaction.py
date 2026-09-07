from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    buyer_id: int
    produce_id: int
    quantity: float = Field(gt=0)
    price: float = Field(gt=0)


class TransactionOut(BaseModel):
    id: int
    farmer_id: int
    buyer_id: Optional[int]
    produce_id: int
    quantity: float
    price: float
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

from pydantic import BaseModel


class BuyerCreate(BaseModel):
    name: str
    product: str
    required_quantity: float
    offered_price: float
    location: str
    quality_requirement: str = "Grade A"
    contact: str
    latitude: float | None = None
    longitude: float | None = None


class BuyerUpdate(BaseModel):
    name: str | None = None
    product: str | None = None
    required_quantity: float | None = None
    offered_price: float | None = None
    location: str | None = None
    quality_requirement: str | None = None
    contact: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class BuyerOut(BaseModel):
    id: int
    user_id: int | None = None
    name: str
    product: str
    required_quantity: float
    offered_price: float
    location: str
    latitude: float | None = None
    longitude: float | None = None
    quality_requirement: str
    contact: str
    distance_km: float | None = None

    model_config = {"from_attributes": True}

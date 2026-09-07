from pydantic import BaseModel


class BuyerOut(BaseModel):
    id: int
    name: str
    product: str
    required_quantity: float
    offered_price: float
    location: str
    quality_requirement: str
    contact: str

    model_config = {"from_attributes": True}

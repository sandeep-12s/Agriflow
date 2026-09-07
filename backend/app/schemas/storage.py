from pydantic import BaseModel


class StorageFacilityOut(BaseModel):
    id: int
    name: str
    location: str
    type: str
    distance_km: float
    capacity: float
    available_capacity: float
    cost_per_unit: float
    supported_crops: str  # comma-separated, as stored

    model_config = {"from_attributes": True}

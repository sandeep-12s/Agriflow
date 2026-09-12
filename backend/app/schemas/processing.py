from typing import Optional

from pydantic import BaseModel


class ProcessingUnitOut(BaseModel):
    id: int
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    input_product: str
    input_capacity: float
    processing_cost: float
    output_product: str
    estimated_output: float
    distance_km: float
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class ProcessingOpportunity(BaseModel):
    """One processing opportunity for a specific produce entry — mirrors
    the spec's 'Turn Produce into Value' field list exactly."""
    processor_id: int
    processor_name: str
    input_product: str
    output_product: str
    input_quantity: float
    processing_cost: float
    expected_output: float
    estimated_revenue: float
    potential_profit: float
    processing_location: str
    distance_km: float

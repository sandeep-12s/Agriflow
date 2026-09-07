from pydantic import BaseModel


class ProcessingUnitOut(BaseModel):
    id: int
    name: str
    location: str
    input_product: str
    input_capacity: float
    processing_cost: float
    output_product: str
    estimated_output: float
    distance_km: float

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

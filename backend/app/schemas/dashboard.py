from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_produce_entries: int
    total_quantity: float
    estimated_value: float
    potential_profit: float
    wastage_risk: str
    active_recommendations: int
    available_buyers: int
    next_action: str

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


class BuyerDashboardSummary(BaseModel):
    active_requirements_count: int
    total_farmer_produce_lots: int
    total_supply_quantity_qtl: float
    unique_crops_available: int
    avg_market_price_qtl: float
    active_mandis_count: int
    next_action: str

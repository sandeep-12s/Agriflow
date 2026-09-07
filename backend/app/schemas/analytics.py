from pydantic import BaseModel


class CropMetric(BaseModel):
    crop_name: str
    value: float


class PriceTrendPoint(BaseModel):
    crop_name: str
    previous_price: float
    current_price: float


class TransactionsSummary(BaseModel):
    total_transactions: int
    total_quantity: float
    total_value: float
    by_status: dict[str, int]


class ProduceStatusCount(BaseModel):
    status: str
    count: int


class AnalyticsDashboard(BaseModel):
    produce_quantity_by_crop: list[CropMetric]
    revenue_by_crop: list[CropMetric]
    profit_by_crop: list[CropMetric]
    wastage_avoided: float
    price_trends: list[PriceTrendPoint]
    transactions_summary: TransactionsSummary
    produce_status_breakdown: list[ProduceStatusCount]

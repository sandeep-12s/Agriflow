from pydantic import BaseModel


class RecommendationOption(BaseModel):
    option: str
    expected_revenue: float
    total_cost: float
    expected_profit: float
    risk_score: float
    risk_label: str
    recommendation_score: float
    reason: str


class RecommendationResponse(BaseModel):
    produce_id: int
    crop_name: str
    recommended_option: str
    options: list[RecommendationOption]

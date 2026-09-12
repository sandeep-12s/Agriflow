from typing import Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: str = "en"  # "en" or "hi"


class ChatResponse(BaseModel):
    reply: str
    source: str  # "ai" or "fallback"


class CropImageAnalysisRequest(BaseModel):
    image_base64: str
    crop_hint: Optional[str] = None
    language: str = "en"


class CropImageAnalysisResponse(BaseModel):
    crop_name: str
    condition: str
    severity: str  # "Healthy" | "Mild" | "Moderate" | "Severe"
    confidence_pct: int
    symptoms: str
    chemical_treatment: str
    organic_remedy: str
    prevention: str
    summary: str

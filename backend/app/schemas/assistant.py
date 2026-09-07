from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: str = "en"  # "en" or "hi"


class ChatResponse(BaseModel):
    reply: str
    source: str  # "ai" or "fallback"

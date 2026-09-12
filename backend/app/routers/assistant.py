from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.models import User
from app.schemas.assistant import (
    ChatRequest,
    ChatResponse,
    CropImageAnalysisRequest,
    CropImageAnalysisResponse,
)
from app.services.assistant import get_assistant_reply
from app.services.crop_vision import diagnose_crop_image

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    reply, source = get_assistant_reply(payload.message, payload.language)
    return ChatResponse(reply=reply, source=source)


@router.post("/analyze-crop-image", response_model=CropImageAnalysisResponse)
def analyze_crop_image(
    payload: CropImageAnalysisRequest,
    current_user: User = Depends(get_current_user),
):
    """Diagnose crop health and diseases from an uploaded photo or camera capture."""
    diagnosis = diagnose_crop_image(
        image_base64=payload.image_base64,
        crop_hint=payload.crop_hint,
        language=payload.language,
    )
    return CropImageAnalysisResponse(**diagnosis)

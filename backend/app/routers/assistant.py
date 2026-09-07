from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.models import User
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.assistant import get_assistant_reply

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    reply, source = get_assistant_reply(payload.message, payload.language)
    return ChatResponse(reply=reply, source=source)

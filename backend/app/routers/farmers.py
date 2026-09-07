from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.models import User
from app.schemas.user import UserOut

router = APIRouter(prefix="/farmers", tags=["farmers"])


@router.get("/me", response_model=UserOut)
def read_current_farmer(current_user: User = Depends(get_current_user)):
    return current_user

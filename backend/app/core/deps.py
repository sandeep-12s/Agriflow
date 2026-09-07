"""
Shared FastAPI dependency for protecting routes.

Uses HTTPBearer rather than OAuth2PasswordBearer on purpose: our
/auth/login takes a plain JSON body (email + password), not an OAuth2
form submission, and HTTPBearer's "Authorize" dialog in the /docs page
just asks for the raw token — which matches what /auth/login and
/auth/register actually return. Using OAuth2PasswordBearer here would
make Swagger UI show a login form that doesn't match our real endpoint
and confuse testing.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models import User

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error

    return user

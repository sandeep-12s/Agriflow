"""
Password hashing and JWT helpers.

Password hashing (bcrypt via passlib): one-way — we can check a
password against the stored hash, but never recover the original
password from it. The plaintext password is never stored or logged.

JWT: a signed token encoding the user's id and an expiry time. The
server stays stateless — it doesn't keep a session table — because
anyone holding a valid, unexpired token is trusted. That's exactly why
SECRET_KEY must stay out of git and out of frontend code: it's the
only thing standing between a valid token and a forged one.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours — fine for a hackathon demo


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Returns the user id encoded in the token, or None if it's invalid or expired."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return int(user_id) if user_id is not None else None
    except JWTError:
        return None

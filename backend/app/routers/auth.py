"""Registration, phone verification, login, and logout endpoints."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.db.models import User, RegistrationOTP
from app.schemas.user import UserCreate, UserLogin, Token, OTPRequest, OTPResponse
from app.services.otp import send_otp_sms, twilio_configured

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_EXPIRY_SECONDS = 300
OTP_MAX_ATTEMPTS = 5


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_otp(phone: str, code: str) -> str:
    return hashlib.sha256(f"{phone}:{code}:{settings.SECRET_KEY}".encode()).hexdigest()


@router.post("/request-otp", response_model=OTPResponse)
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this phone already exists",
        )

    recent = (
        db.query(RegistrationOTP)
        .filter(RegistrationOTP.phone == payload.phone)
        .order_by(RegistrationOTP.created_at.desc())
        .first()
    )
    if recent and (utc_now() - recent.created_at).total_seconds() < 60:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait before requesting another verification code",
        )

    code = f"{secrets.randbelow(1_000_000):06d}"
    sms_sent = False
    if twilio_configured():
        try:
            send_otp_sms(payload.phone, code)
            sms_sent = True
        except RuntimeError as error:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error))
    elif settings.ENV != "development":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS delivery is not configured on this server",
        )

    db.add(RegistrationOTP(
        phone=payload.phone,
        code_hash=hash_otp(payload.phone, code),
        expires_at=utc_now() + timedelta(seconds=OTP_EXPIRY_SECONDS),
    ))
    db.commit()

    return OTPResponse(
        message="Verification code sent to your phone." if sms_sent else "Development verification code generated.",
        expires_in=OTP_EXPIRY_SECONDS,
        dev_code=code if not sms_sent and settings.ENV == "development" else None,
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    phone_clean = payload.phone.strip()
    existing = (
        db.query(User)
        .filter((func.lower(User.email) == email_clean) | (User.phone == phone_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email or phone already exists",
        )

    otp = (
        db.query(RegistrationOTP)
        .filter(RegistrationOTP.phone == phone_clean, RegistrationOTP.used.is_(False))
        .order_by(RegistrationOTP.created_at.desc())
        .first()
    )
    if otp is None or otp.expires_at <= utc_now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification code expired or not requested")
    if otp.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many incorrect verification attempts")

    otp.attempts += 1
    if otp.code_hash != hash_otp(phone_clean, payload.otp):
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect verification code")
    otp.used = True

    role_val = payload.role.strip().lower()
    user_role = "buyer" if role_val == "buyer" else "farmer"

    user = User(
        name=payload.name.strip(),
        phone=phone_clean,
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=user_role,
        location=payload.location.strip(),
        language=payload.language,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return Token(access_token=create_access_token(user.id))


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email_clean).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    return Token(access_token=create_access_token(user.id))


@router.post("/logout")
def logout():
    """
    JWTs are stateless — the server never stored a session to begin
    with, so there's nothing here to invalidate server-side. Logging
    out means the frontend deletes its stored token so it stops
    sending it. This endpoint exists so the frontend has a clear place
    to call, and so a token-blocklist could be added later without
    changing the frontend's flow.
    """
    return {"message": "Logged out. Discard the token on the client."}

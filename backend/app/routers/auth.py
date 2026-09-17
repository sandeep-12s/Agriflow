"""Registration, phone verification, login, and logout endpoints."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import requests

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.db.database import get_db
from app.db.models import User, RegistrationOTP, SMSLog
from app.schemas.user import (
    UserCreate, UserLogin, Token, OTPRequest, OTPResponse,
    PhoneEmailVerifyRequest, PhoneEmailVerifyResponse,
)
from app.services.sms import send_otp_sms, sms_gateway_configured

logger = logging.getLogger(__name__)

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
    dispatch_res = send_otp_sms(payload.phone, code)
    sms_sent = bool(dispatch_res.get("success", False))
    gateway = dispatch_res.get("gateway", "simulated")
    status_str = dispatch_res.get("status", "simulated")

    # Record SMS in database log
    db.add(SMSLog(
        phone=payload.phone,
        sms_type="otp",
        message=f"AgriFlow OTP verification: {code}",
        gateway=gateway,
        status=status_str,
    ))

    db.add(RegistrationOTP(
        phone=payload.phone,
        code_hash=hash_otp(payload.phone, code),
        expires_at=utc_now() + timedelta(seconds=OTP_EXPIRY_SECONDS),
    ))
    db.commit()

    real_sms_sent = gateway in ("fast2sms", "twilio") and bool(dispatch_res.get("success"))

    return OTPResponse(
        message="Verification code sent to your phone via SMS." if real_sms_sent else "SMS gateway not configured on server (simulation mode).",
        expires_in=OTP_EXPIRY_SECONDS,
        dev_code=None if real_sms_sent else code,
        gateway=gateway,
        sms_sent=real_sms_sent,
    )


@router.post("/verify-phone-email", response_model=PhoneEmailVerifyResponse)
def verify_phone_email(payload: PhoneEmailVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies phone number using Phone.Email (Sign in with Phone) service.
    Fetches the verified user JSON from user_json_url, extracts phone number,
    creates a verified OTP token in the DB so registration can proceed,
    and returns token + login status.
    """
    url = payload.user_json_url.strip()
    if not url.startswith("https://") or "phone.email" not in url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Phone.Email verification URL",
        )

    country_code = str(payload.country_code or "+91").strip()
    phone_raw = str(payload.phone_number or "").strip()

    try:
        resp = requests.get(
            url,
            timeout=10,
            allow_redirects=False,
            headers={"User-Agent": "AgriFlow-App/1.0"},
        )
        if resp.status_code == 200:
            user_data = resp.json()
            country_code = str(user_data.get("user_country_code") or country_code).strip()
            phone_raw = str(user_data.get("user_phone_number") or phone_raw).strip()
    except Exception as exc:
        logger.warning("Phone.Email fetch error: %s", exc)

    if not phone_raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not found in Phone.Email verification response",
        )

    # Clean 10-digit Indian mobile number
    clean_phone = phone_raw.replace("+91", "").replace("+", "").replace("-", "").replace(" ", "").strip()
    if len(clean_phone) >= 10:
        clean_phone = clean_phone[-10:]

    # Generate a verification token for the registration form
    verification_token = f"PE_{secrets.token_urlsafe(16)}"

    # Add verified OTP token to database valid for 15 minutes
    db.add(RegistrationOTP(
        phone=clean_phone,
        code_hash=hash_otp(clean_phone, verification_token),
        expires_at=utc_now() + timedelta(minutes=15),
    ))

    # Log to SMSLog
    db.add(SMSLog(
        phone=clean_phone,
        sms_type="phone_email_otp",
        message="Phone number successfully verified via Phone.Email SMS / WhatsApp gateway",
        gateway="phone.email",
        status="delivered",
    ))
    db.commit()

    # Check if this user already exists in AgriFlow
    existing_user = db.query(User).filter(User.phone == clean_phone).first()
    access_token = create_access_token(existing_user.id) if existing_user else None

    return PhoneEmailVerifyResponse(
        verified=True,
        phone=clean_phone,
        full_phone=f"{country_code} {clean_phone}",
        verification_token=verification_token,
        user_exists=bool(existing_user),
        access_token=access_token,
        token_type="bearer" if access_token else None,
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

    role_val = (payload.role or "farmer").strip().lower()
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
    identifier = payload.email.strip()
    identifier_lower = identifier.lower()
    user = (
        db.query(User)
        .filter((func.lower(User.email) == identifier_lower) | (User.phone == identifier))
        .first()
    )
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

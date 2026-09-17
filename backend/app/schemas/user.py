"""
Pydantic schemas — these define exactly what shape of JSON the API
accepts and returns. UserOut never includes password_hash, so a
password can never leak out through a response, even by accident.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=20)
    email: EmailStr
    password: str = Field(min_length=6, description="At least 6 characters")
    location: str = Field(min_length=2, max_length=120)
    language: str = Field(default="en", max_length=10)
    role: str = Field(default="farmer", description="User role: farmer or buyer")
    otp: str | None = Field(default=None, description="Optional OTP code (deprecated)")


class OTPRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)


class OTPResponse(BaseModel):
    message: str
    expires_in: int
    dev_code: str | None = None
    gateway: str = "simulated"
    sms_sent: bool = False


class PhoneEmailVerifyRequest(BaseModel):
    user_json_url: str
    phone_number: str | None = None
    country_code: str | None = None


class PhoneEmailVerifyResponse(BaseModel):
    verified: bool
    phone: str
    full_phone: str
    verification_token: str
    user_exists: bool
    access_token: str | None = None
    token_type: str | None = None


class UserLogin(BaseModel):
    email: str = Field(min_length=3, max_length=120, description="Email or phone number")
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    email: EmailStr
    location: str
    language: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}  # lets us return an ORM object directly


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

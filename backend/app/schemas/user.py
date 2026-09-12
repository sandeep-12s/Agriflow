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
    otp: str = Field(pattern=r"^\d{6}$", description="Six-digit phone verification code")


class OTPRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)


class OTPResponse(BaseModel):
    message: str
    expires_in: int
    dev_code: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
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

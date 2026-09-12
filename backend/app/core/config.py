"""
Centralized app settings.
Everything here is read from environment variables (see .env.example)
so no secret ever lives in the source code.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Some hosts hand out DATABASE_URL with the
# legacy "postgres://" scheme. Modern SQLAlchemy only accepts
# "postgresql://" — this normalizes it once at startup so a production
# deploy doesn't fail on a URL scheme mismatch outside our control.
_database_url = os.getenv("DATABASE_URL", "sqlite:///./agriflow.db")
if _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql://", 1)


class Settings:
    APP_NAME: str = "AgriFlow"
    ENV: str = os.getenv("ENV", "development")

    # Comma-separated list in .env, split into a Python list here
    CORS_ORIGINS: list[str] = [origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://agriflow-1-nc1a.onrender.com",
    ).split(",") if origin.strip()]

    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DATABASE_URL: str = _database_url
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_PHONE: str = os.getenv("TWILIO_FROM_PHONE", "")
    OTP_COUNTRY_CODE: str = os.getenv("OTP_COUNTRY_CODE", "+91")

    # AI assistant (Step 10) — optional. Leave ANTHROPIC_API_KEY unset to
    # use the rule-based fallback responses only; nothing else breaks
    # without it, per the spec's own fallback requirement.
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ASSISTANT_MODEL: str = os.getenv("ASSISTANT_MODEL", "claude-haiku-4-5-20251001")
    DATA_GOV_API_KEY: str = os.getenv("DATA_GOV_API_KEY", "")
    DATA_GOV_MANDI_RESOURCE_ID: str = os.getenv(
        "DATA_GOV_MANDI_RESOURCE_ID",
        "9ef84268-d588-465a-a308-a864a43d0070",
    )


settings = Settings()

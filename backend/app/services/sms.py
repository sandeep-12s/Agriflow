import logging
import requests
from datetime import datetime, timezone
from typing import Optional, Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def twilio_configured() -> bool:
    return all((
        settings.TWILIO_ACCOUNT_SID.strip(),
        settings.TWILIO_AUTH_TOKEN.strip(),
        settings.TWILIO_FROM_PHONE.strip(),
    ))


def fast2sms_configured() -> bool:
    return bool(settings.FAST2SMS_API_KEY.strip())


def sms_gateway_configured() -> bool:
    return fast2sms_configured() or twilio_configured()


def _clean_indian_phone(phone: str) -> str:
    """Extract clean 10-digit Indian mobile number."""
    cleaned = phone.replace("+91", "").replace("+", "").replace("-", "").replace(" ", "").strip()
    return cleaned.lstrip("0")[-10:]


def _format_international_phone(phone: str) -> str:
    """Format phone for Twilio international E.164 format."""
    normalized = phone.strip().replace(" ", "").replace("-", "")
    if normalized.startswith("+"):
        return normalized
    return f"{settings.OTP_COUNTRY_CODE}{normalized.lstrip('0')}"


def send_sms_via_fast2sms(phone: str, message: str, is_otp: bool = False, otp_code: str = "") -> dict[str, Any]:
    """
    Sends SMS using Fast2SMS (India's premier telecom gateway).
    Supports both Quick SMS (custom messages, unicode Hindi/English) and OTP routes.
    """
    if not fast2sms_configured():
        return {"success": False, "error": "Fast2SMS API key not configured"}

    clean_phone = _clean_indian_phone(phone)
    if len(clean_phone) != 10:
        return {"success": False, "error": f"Invalid Indian phone number: {phone}"}

    api_key = settings.FAST2SMS_API_KEY.strip()

    # Route 1: If OTP and code provided, try Fast2SMS dedicated OTP route
    if is_otp and otp_code:
        try:
            resp = requests.post(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={"authorization": api_key},
                data={
                    "variables_values": otp_code,
                    "route": "otp",
                    "numbers": clean_phone,
                },
                timeout=12,
            )
            data = resp.json()
            if data.get("return"):
                logger.info("Fast2SMS OTP successfully delivered to %s", clean_phone[-4:])
                return {"success": True, "gateway": "fast2sms", "status": "delivered", "response": data}
            logger.warning("Fast2SMS OTP route response: %s", data)
        except Exception as err:
            logger.warning("Fast2SMS OTP route attempt failed: %s", err)

    # Route 2: Quick SMS route (supports custom weather alerts & fallback OTP)
    try:
        resp = requests.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": api_key},
            data={
                "route": "q",
                "message": message,
                "numbers": clean_phone,
                "language": "unicode",
                "flash": "0",
            },
            timeout=12,
        )
        data = resp.json()
        if data.get("return"):
            logger.info("Fast2SMS Quick SMS delivered to %s", clean_phone[-4:])
            return {"success": True, "gateway": "fast2sms", "status": "delivered", "response": data}
        logger.warning("Fast2SMS Quick SMS response: %s", data)
        return {"success": False, "error": data.get("message", "Fast2SMS error"), "gateway": "fast2sms"}
    except Exception as err:
        logger.error("Fast2SMS request error: %s", err)
        return {"success": False, "error": str(err), "gateway": "fast2sms"}


def send_sms_via_twilio(phone: str, message: str) -> dict[str, Any]:
    """Sends SMS using Twilio global gateway."""
    if not twilio_configured():
        return {"success": False, "error": "Twilio not configured"}

    formatted_phone = _format_international_phone(phone)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
    try:
        resp = requests.post(
            url,
            data={
                "From": settings.TWILIO_FROM_PHONE,
                "To": formatted_phone,
                "Body": message,
            },
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            timeout=12,
        )
        if resp.status_code in (200, 201):
            logger.info("Twilio SMS delivered to %s", formatted_phone[-4:])
            return {"success": True, "gateway": "twilio", "status": "delivered", "response": resp.json()}
        logger.warning("Twilio SMS error (%d): %s", resp.status_code, resp.text)
        return {"success": False, "error": resp.text, "gateway": "twilio"}
    except Exception as err:
        logger.error("Twilio request error: %s", err)
        return {"success": False, "error": str(err), "gateway": "twilio"}


def dispatch_sms(phone: str, message: str, is_otp: bool = False, otp_code: str = "") -> dict[str, Any]:
    """
    Main dispatch engine.
    Tries Fast2SMS first for Indian numbers, then Twilio, or returns simulated status.
    """
    # 1. Fast2SMS
    if fast2sms_configured():
        res = send_sms_via_fast2sms(phone, message, is_otp=is_otp, otp_code=otp_code)
        if res.get("success"):
            return res

    # 2. Twilio
    if twilio_configured():
        res = send_sms_via_twilio(phone, message)
        if res.get("success"):
            return res

    # 3. Fallback / Test mode
    logger.info("[SMS SIMULATOR] To: %s | Message: %s", phone, message)
    return {
        "success": True,
        "gateway": "simulated",
        "status": "simulated",
        "message": message,
        "note": "SMS simulated in development mode. To deliver real cellular SMS to phones, set FAST2SMS_API_KEY in Render environment variables."
    }


def send_otp_sms(phone: str, code: str, language: str = "hi") -> dict[str, Any]:
    """Format and send OTP verification SMS."""
    if language == "hi":
        message = f"एग्रीफ्लो (AgriFlow): आपका पंजीकरण सत्यापन कोड {code} है। यह 5 मिनट के लिए मान्य है। किसी के साथ साझा न करें।"
    else:
        message = f"Your AgriFlow verification code is {code}. Valid for 5 minutes. Do not share with anyone."

    return dispatch_sms(phone, message, is_otp=True, otp_code=code)


def send_weather_alert_sms(
    phone: str,
    farmer_name: str,
    alert_title: str,
    alert_message: str,
    crops: Optional[list[str]] = None,
    language: str = "hi",
) -> dict[str, Any]:
    """Format and send bad weather danger alert SMS to the farmer."""
    crops_text = f" ({', '.join(crops[:3])})" if crops else ""
    farmer_greeting = f"नमस्ते {farmer_name} जी, " if farmer_name and language == "hi" else (f"Dear {farmer_name}, " if farmer_name else "")

    if language == "hi":
        message = (
            f"⚠️ एग्रीफ्लो मौसम चेतावनी: {farmer_greeting}आपके क्षेत्र में {alert_title} की संभावना है। "
            f"फसल{crops_text} सुरक्षा सलाह: {alert_message} - एग्रीफ्लो किसान सहायक"
        )
    else:
        message = (
            f"⚠️ AGRIFLOW WEATHER ALERT: {farmer_greeting}{alert_title} expected in your area. "
            f"Crop{crops_text} protection advisory: {alert_message} - AgriFlow Kisan Sahayak"
        )

    # Truncate if too long for single SMS segment while preserving message
    if len(message) > 160:
        message = message[:157] + "..."

    return dispatch_sms(phone, message)


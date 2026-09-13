import logging
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def twilio_configured() -> bool:
    return all((
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_FROM_PHONE,
    ))


def fast2sms_configured() -> bool:
    return bool(settings.FAST2SMS_API_KEY.strip())


def sms_gateway_configured() -> bool:
    return fast2sms_configured() or twilio_configured()


def _format_phone(phone: str) -> str:
    normalized = phone.strip().replace(" ", "")
    if normalized.startswith("+"):
        return normalized
    return f"{settings.OTP_COUNTRY_CODE}{normalized.lstrip('0')}"


def send_otp_sms(phone: str, code: str) -> None:
    """Dispatches OTP verification code via Fast2SMS (India) or Twilio (Global)."""
    # 1. Try Fast2SMS for Indian numbers
    if fast2sms_configured():
        clean_10digit = phone.replace("+91", "").replace("+", "").strip().lstrip("0")
        try:
            resp = requests.post(
                "https://www.fast2sms.com/dev/bulkV2",
                headers={"authorization": settings.FAST2SMS_API_KEY.strip()},
                data={
                    "variables_values": code,
                    "route": "otp",
                    "numbers": clean_10digit,
                },
                timeout=10,
            )
            data = resp.json()
            if data.get("return"):
                logger.info("Fast2SMS OTP delivered to %s", clean_10digit[-4:])
                return
            logger.warning("Fast2SMS message: %s", data.get("message"))
        except Exception as err:
            logger.error("Fast2SMS API error: %s", err)

    # 2. Try Twilio
    if twilio_configured():
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        )
        try:
            response = requests.post(
                url,
                data={
                    "From": settings.TWILIO_FROM_PHONE,
                    "To": _format_phone(phone),
                    "Body": f"Your AgriFlow verification code is {code}. It expires in 5 minutes.",
                },
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                timeout=10,
            )
            response.raise_for_status()
            logger.info("Twilio SMS delivered successfully to %s", phone[-4:])
            return
        except requests.RequestException as error:
            raise RuntimeError("SMS delivery failed. Check Twilio configuration.") from error

    if not sms_gateway_configured():
        logger.info("No live SMS gateway configured. Development code generated: %s", code)
import requests

from app.core.config import settings


def twilio_configured() -> bool:
    return all((
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_FROM_PHONE,
    ))


def _format_phone(phone: str) -> str:
    normalized = phone.strip().replace(" ", "")
    if normalized.startswith("+"):
        return normalized
    return f"{settings.OTP_COUNTRY_CODE}{normalized.lstrip('0')}"


def send_otp_sms(phone: str, code: str) -> None:
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
    except requests.RequestException as error:
        raise RuntimeError("SMS delivery failed. Check the Twilio configuration and phone number.") from error
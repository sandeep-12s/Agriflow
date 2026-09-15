"""
OTP Service compatibility wrapper forwarding to app.services.sms.
"""
from app.services.sms import (
    send_otp_sms,
    sms_gateway_configured,
    fast2sms_configured,
    twilio_configured,
    dispatch_sms,
)

__all__ = [
    "send_otp_sms",
    "sms_gateway_configured",
    "fast2sms_configured",
    "twilio_configured",
    "dispatch_sms",
]
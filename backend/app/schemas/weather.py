from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WeatherOut(BaseModel):
    latitude: float
    longitude: float
    temperature_c: float
    apparent_temperature_c: float
    humidity_percent: int
    wind_speed_kmh: float
    weather_code: int
    observed_at: datetime
    source: str
    condition_text: str = "Clear sky"
    advisory_alerts: list[dict] = []


class WeatherSMSAlertRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    force_test: bool = False


class WeatherSMSAlertResponse(BaseModel):
    success: bool
    sms_sent: bool
    gateway: str
    phone: str
    alert_title: str
    message: str
    status: str
    dispatched_at: datetime
    note: Optional[str] = None


class SMSLogItem(BaseModel):
    id: int
    phone: str
    sms_type: str
    message: str
    gateway: str
    status: str
    created_at: datetime
from datetime import datetime

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
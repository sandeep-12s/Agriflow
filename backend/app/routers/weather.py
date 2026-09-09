import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_current_user
from app.db.models import User
from app.schemas.weather import WeatherOut

router = APIRouter(prefix="/weather", tags=["weather"])


@router.get("", response_model=WeatherOut)
def get_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    current_user: User = Depends(get_current_user),
):
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
                "timezone": "auto",
            },
            timeout=8,
        )
        response.raise_for_status()
        current = response.json()["current"]
        return WeatherOut(
            latitude=latitude,
            longitude=longitude,
            temperature_c=current["temperature_2m"],
            apparent_temperature_c=current["apparent_temperature"],
            humidity_percent=current["relative_humidity_2m"],
            wind_speed_kmh=current["wind_speed_10m"],
            weather_code=current["weather_code"],
            observed_at=current["time"],
            source="Open-Meteo",
        )
    except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is temporarily unavailable",
        ) from exc
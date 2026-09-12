import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.deps import get_current_user
from app.db.models import User
from app.schemas.weather import WeatherOut

router = APIRouter(prefix="/weather", tags=["weather"])


WEATHER_DESCRIPTIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def calculate_advisories(current: dict) -> list[dict]:
    alerts = []
    w_code = int(current.get("weather_code") or 0)
    wind = float(current.get("wind_speed_10m") or 0.0)
    temp = float(current.get("temperature_2m") or 0.0)

    if w_code in {65, 82, 95, 96, 99}:
        alerts.append({
            "level": "high",
            "title": "Storm & Heavy Rain Alert",
            "message": "Heavy rainfall or storm expected. Protect harvested produce and ensure field drainage channels are clear."
        })
    elif w_code in {61, 63, 80, 81}:
        alerts.append({
            "level": "medium",
            "title": "Rain Forecast",
            "message": "Showers expected. Check soil moisture before irrigating to avoid waterlogging."
        })
    if wind >= 35:
        alerts.append({
            "level": "high",
            "title": "High Wind Risk",
            "message": "High wind gusts. Secure nursery shade nets, support tall crop stalks, and cover open storage piles."
        })
    if temp <= 4:
        alerts.append({
            "level": "high",
            "title": "Frost Risk",
            "message": "Near-freezing temperatures expected. Provide protective light irrigation or mulching overnight."
        })
    elif temp >= 40:
        alerts.append({
            "level": "medium",
            "title": "Heat Stress Advisory",
            "message": "High temperature alert. Irrigate in early mornings or evenings to mitigate moisture evaporation."
        })

    if not alerts:
        alerts.append({
            "level": "low",
            "title": "Optimal Field Conditions",
            "message": "Weather conditions are stable and favorable for harvesting, drying, and field operations."
        })

    return alerts


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
        w_code = current["weather_code"]
        return WeatherOut(
            latitude=latitude,
            longitude=longitude,
            temperature_c=current["temperature_2m"],
            apparent_temperature_c=current["apparent_temperature"],
            humidity_percent=current["relative_humidity_2m"],
            wind_speed_kmh=current["wind_speed_10m"],
            weather_code=w_code,
            observed_at=current["time"],
            source="Open-Meteo & Krishi Sahayak Advisories",
            condition_text=WEATHER_DESCRIPTIONS.get(w_code, "Weather data available"),
            advisory_alerts=calculate_advisories(current),
        )
    except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is temporarily unavailable",
        ) from exc
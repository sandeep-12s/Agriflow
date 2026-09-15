import logging
from datetime import datetime, timezone
import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.database import get_db
from app.db.models import User, Produce, SMSLog
from app.schemas.weather import (
    WeatherOut,
    WeatherSMSAlertRequest,
    WeatherSMSAlertResponse,
    SMSLogItem,
)
from app.services.sms import send_weather_alert_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["weather"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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


def build_crop_specific_weather_advice(alert_title: str, crops: list[str], language: str = "hi") -> str:
    """Provides specific agronomic actions based on the farmer's registered crops."""
    crop_names_lower = [c.lower() for c in crops]
    has_cereal = any(c in crop_names_lower for c in ["wheat", "गेहूं", "paddy", "धान", "rice", "चावल"])
    has_veg = any(c in crop_names_lower for c in ["tomato", "टमाटर", "potato", "आलू", "chilli", "मिर्च", "onion", "प्याज"])
    has_oilseed = any(c in crop_names_lower for c in ["mustard", "सरसों", "soybean", "सोयाबीन"])

    if "storm" in alert_title.lower() or "rain" in alert_title.lower():
        if has_veg:
            return "जल निकासी नालियां खोलें व कवकनाशी छिड़काव रोकें" if language == "hi" else "Open field drains to prevent root rot; postpone fungal sprays."
        if has_cereal or has_oilseed:
            return "कटी फसल तिरपाल से ढकें व जलभराव न होने दें" if language == "hi" else "Cover harvested heaps with tarpaulin; ensure no standing water."
        return "खेत में जलभराव रोकें व कीटनाशक छिड़काव स्थगित करें" if language == "hi" else "Clear drainage channels and postpone chemical spraying."

    if "wind" in alert_title.lower():
        return "लंबी फसलों को सहारा दें व खुले तिरपाल बांधें" if language == "hi" else "Support tall crop stalks and tie down loose storage tarps."

    if "frost" in alert_title.lower():
        return "शाम को हल्की सिंचाई करें व क्यारियों में धुआं करें" if language == "hi" else "Provide light evening irrigation to protect plant cells from frost."

    if "heat" in alert_title.lower():
        return "सुबह या शाम हल्की सिंचाई कर नमी बनाए रखें" if language == "hi" else "Irrigate early morning or evening to reduce transpiration stress."

    return "मौसम अनुसार कृषि कार्य सावधानी से करें" if language == "hi" else "Perform harvesting and drying with standard weather precautions."


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


@router.post("/send-alert-sms", response_model=WeatherSMSAlertResponse)
def send_weather_sms_alert(
    payload: WeatherSMSAlertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sends an urgent SMS notification to the farmer when weather conditions
    threaten crops (heavy rain, hailstorm, frost, heatwave, gale winds).
    """
    lat = payload.latitude or 28.6139
    lon = payload.longitude or 77.2090

    # 1. Fetch farmer's registered crops
    farmer_produce = db.query(Produce).filter(Produce.farmer_id == current_user.id).all()
    crops = list({p.crop_name for p in farmer_produce})

    # 2. Query weather conditions
    active_alert = None
    try:
        resp = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
                "timezone": "auto",
            },
            timeout=8,
        )
        if resp.ok:
            current_data = resp.json().get("current", {})
            advisories = calculate_advisories(current_data)
            # Find high or medium priority alerts
            for adv in advisories:
                if adv.get("level") in ("high", "medium"):
                    active_alert = adv
                    break
    except Exception as exc:
        logger.warning("Weather fetch for SMS alert failed: %s", exc)

    # If no severe weather currently, but force_test is enabled, simulate storm/heavy rain alert
    if not active_alert:
        if payload.force_test:
            active_alert = {
                "level": "high",
                "title": "Storm & Heavy Rain Alert (परीक्षण चेतावनी)",
                "message": "Heavy rainfall and sudden wind gusts forecast. Protect standing crops and clear drainage.",
            }
        else:
            return WeatherSMSAlertResponse(
                success=True,
                sms_sent=False,
                gateway="none",
                phone=current_user.phone,
                alert_title="Normal Weather",
                message="Weather is currently favorable. No severe harm detected for your crops.",
                status="skipped",
                dispatched_at=utc_now(),
                note="No severe weather alert triggered. Use force_test=true to test SMS delivery.",
            )

    # 3. Build localized advisory
    lang = getattr(current_user, "language", "hi")
    advice = build_crop_specific_weather_advice(active_alert["title"], crops, language=lang)

    # 4. Dispatch SMS
    sms_res = send_weather_alert_sms(
        phone=current_user.phone,
        farmer_name=current_user.name,
        alert_title=active_alert["title"],
        alert_message=advice,
        crops=crops,
        language=lang,
    )

    gateway = sms_res.get("gateway", "simulated")
    status_str = sms_res.get("status", "simulated")
    sent_message = sms_res.get("message", f"{active_alert['title']}: {advice}")

    # 5. Record in database SMSLog
    log_entry = SMSLog(
        user_id=current_user.id,
        phone=current_user.phone,
        sms_type="weather_alert",
        message=sent_message,
        gateway=gateway,
        status=status_str,
    )
    db.add(log_entry)
    db.commit()

    return WeatherSMSAlertResponse(
        success=True,
        sms_sent=True,
        gateway=gateway,
        phone=current_user.phone,
        alert_title=active_alert["title"],
        message=sent_message,
        status=status_str,
        dispatched_at=utc_now(),
        note=sms_res.get("note"),
    )


@router.get("/sms-history", response_model=list[SMSLogItem])
def get_weather_sms_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns recent SMS alerts sent to the current user."""
    logs = (
        db.query(SMSLog)
        .filter((SMSLog.user_id == current_user.id) | (SMSLog.phone == current_user.phone))
        .order_by(SMSLog.created_at.desc())
        .limit(25)
        .all()
    )
    return [
        SMSLogItem(
            id=l.id,
            phone=l.phone,
            sms_type=l.sms_type,
            message=l.message,
            gateway=l.gateway,
            status=l.status,
            created_at=l.created_at,
        )
        for l in logs
    ]


@router.post("/toggle-sms-alerts")
def toggle_sms_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle weather SMS alerts on or off for the current user."""
    current_user.sms_weather_alerts = not bool(current_user.sms_weather_alerts)
    db.commit()
    return {
        "sms_weather_alerts": current_user.sms_weather_alerts,
        "message": "Weather SMS alerts enabled" if current_user.sms_weather_alerts else "Weather SMS alerts disabled",
    }
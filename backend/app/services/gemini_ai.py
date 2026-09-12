"""
Google Gemini AI service integration for AgriFlow.
Inspired by Krishi Sahayak's AI architecture.
Supports farm assistant conversations and next-crop advisory reasoning.
Falls back gracefully if GEMINI_API_KEY is not configured.
"""
import logging
import requests
from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def is_gemini_configured() -> bool:
    return bool(settings.GEMINI_API_KEY.strip())


def call_gemini(prompt: str, system_instruction: str = "") -> str | None:
    """Execute a text generation call to Google Gemini."""
    if not is_gemini_configured():
        return None

    url = GEMINI_API_URL.format(model=settings.GEMINI_MODEL) + f"?key={settings.GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}

    payload: dict = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 800,
        }
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts and "text" in parts[0]:
                return parts[0]["text"].strip()
    except Exception as exc:
        logger.warning("Gemini AI API call failed: %s", exc)

    return None


def generate_farm_chat_reply(message: str, language: str = "en") -> str | None:
    """Generate agricultural advisor advice using Gemini."""
    system_prompt = (
        "You are AgriFlow Assistant, an empathetic, highly knowledgeable agricultural expert and "
        "farm doctor for Indian farmers. "
        "CRITICAL LIMITATION: You MUST ONLY answer questions strictly related to agriculture, farming, crops, "
        "plant diseases, soil health, fertilizers, irrigation, harvesting, weather, livestock/dairy, APMC mandi rates, "
        "post-harvest storage, and agro-processing. "
        "If the user asks ANY off-topic or non-agricultural question (such as programming, coding, software, math, "
        "general science, politics, movies, celebrities, history, etc.), you MUST politely refuse to answer and state "
        "that you are an agricultural assistant dedicated solely to farming and crop management. Guide them to ask an "
        "agriculture-related question instead. "
        "Keep your answer helpful, grounded in Indian farming practices, and within 3-4 concise paragraphs."
    )
    if language == "hi":
        system_prompt += " Answer in natural, encouraging, and clear Hindi (Devanagari script)."

    return call_gemini(message, system_instruction=system_prompt)


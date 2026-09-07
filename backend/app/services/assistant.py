"""
AI agriculture assistant.

Tries a real Claude API call if ANTHROPIC_API_KEY is set in the
environment. If it's not set — or the call fails for any reason
(network error, bad key, rate limit, unexpected response) — falls
back to a small set of rule-based answers covering the example
questions from the spec, in English or Hindi. The caller always finds
out which path was used via the returned `source`, so a fallback
answer is never silently presented as if it came from the model.
"""
from typing import Optional

import requests

from app.core.config import settings

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_VERSION = "2023-06-01"

LANGUAGE_NAMES = {"en": "English", "hi": "Hindi"}

SYSTEM_PROMPT = (
    "You are AgriFlow's agriculture assistant for Indian farmers. "
    "Answer in {language_name}. Keep answers to 2-4 short sentences, "
    "practical and actionable, focused on selling, storing, or "
    "processing crops. Do not invent specific prices or numbers you "
    "don't have — speak in general good practice instead."
)


def call_llm(message: str, language: str) -> Optional[str]:
    """Returns a reply from the Claude API, or None if it's unavailable
    for any reason. Callers should treat None as "use the fallback"."""
    if not settings.ANTHROPIC_API_KEY:
        print("[assistant] No ANTHROPIC_API_KEY set — using fallback.")
        return None

    language_name = LANGUAGE_NAMES.get(language, "English")
    try:
        response = requests.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": ANTHROPIC_API_VERSION,
                "content-type": "application/json",
            },
            json={
                "model": settings.ASSISTANT_MODEL,
                "max_tokens": 300,
                "system": SYSTEM_PROMPT.format(language_name=language_name),
                "messages": [{"role": "user", "content": message}],
            },
            timeout=15,
        )
        response.raise_for_status()
        data = response.json()
        text = "".join(
            block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
        ).strip()
        return text or None
    except requests.exceptions.HTTPError as e:
        # The API responded but rejected the request — its response body
        # usually names the exact problem (bad key, wrong model, etc).
        print(f"[assistant] Claude API returned an error: {e.response.status_code} {e.response.text}")
        return None
    except Exception as e:
        # Network hiccup, timeout, unexpected response shape — any of
        # these fall back gracefully. The chat should never crash.
        print(f"[assistant] Claude API call failed: {type(e).__name__}: {e}")
        return None


# ---- Fallback: small keyword-matched rule set covering the spec's example questions ----

FALLBACK_RULES = [
    # (keywords to match against the lowercased message, English answer, Hindi answer)
    (
        ["falling", "drop", "price down", "low price"],
        "If prices are falling, check the Market page for other markets, or wait a few days "
        "if storage is affordable for your crop. Perishables like tomato usually don't "
        "benefit from waiting — consider Process or Alternative Buyer instead.",
        "अगर कीमतें गिर रही हैं, तो Market पेज पर दूसरी मंडियों के भाव देखें, या अगर भंडारण सस्ता है "
        "तो कुछ दिन रुकें। टमाटर जैसी जल्दी खराब होने वाली फसलों के लिए इंतज़ार करना अक्सर फायदेमंद नहीं "
        "होता — Process या वैकल्पिक खरीदार पर विचार करें।",
    ),
    (
        ["where can i sell", "where to sell", "sell my", "find buyer"],
        "Check the Market page to compare prices across markets, or open the Buyers page "
        "to see who's currently looking for your crop. Add your produce first so AgriFlow "
        "can match you with buyers automatically.",
        "Market पेज पर विभिन्न मंडियों के भाव तुलना करें, या Buyers पेज पर देखें कि कौन आपकी फसल "
        "खरीदना चाहता है। पहले अपनी उपज दर्ज करें ताकि AgriFlow अपने आप खरीदारों से मिला सके।",
    ),
    (
        ["should i store", "better to store", "store or sell", "storage"],
        "Storage makes sense when prices are expected to rise and your crop doesn't spoil "
        "quickly. Check your produce's Recommendation page — it compares Store against "
        "Sell Now using real storage cost and spoilage risk for your crop.",
        "भंडारण तभी फायदेमंद है जब कीमतें बढ़ने की उम्मीद हो और फसल जल्दी खराब न होती हो। अपनी उपज के "
        "Recommendation पेज पर जाएं — यह वास्तविक भंडारण लागत और खराब होने के जोखिम के आधार पर "
        "Store और Sell Now की तुलना करता है।",
    ),
    (
        ["surplus", "what can i make", "process", "extra"],
        "Surplus produce can often be converted into a higher-value product — tomatoes into "
        "puree, mangoes into pulp, milk into paneer. Check the Processing page to see which "
        "processing units accept your crop and what they pay.",
        "अतिरिक्त उपज को अक्सर अधिक मूल्य वाले उत्पाद में बदला जा सकता है — टमाटर से प्यूरी, आम से पल्प, "
        "दूध से पनीर। Processing पेज पर देखें कि कौन सी प्रोसेसिंग यूनिट आपकी फसल स्वीकार करती है और "
        "कितना भुगतान करती है।",
    ),
]

DEFAULT_FALLBACK_EN = (
    'I can help with selling, storing, or processing decisions for your crops. Try asking '
    'something like "should I store my tomatoes?" or "where can I sell my wheat?", or check '
    "your produce's Recommendation page for a full breakdown."
)
DEFAULT_FALLBACK_HI = (
    "मैं आपकी फसल बेचने, भंडारण करने या प्रोसेसिंग से जुड़े फैसलों में मदद कर सकता हूँ। "
    '"क्या मुझे टमाटर स्टोर करने चाहिए?" जैसे सवाल पूछें, या पूरी जानकारी के लिए अपनी उपज के '
    "Recommendation पेज पर जाएं।"
)


def get_fallback_response(message: str, language: str) -> str:
    lowered = message.lower()
    for keywords, en_answer, hi_answer in FALLBACK_RULES:
        if any(keyword in lowered for keyword in keywords):
            return hi_answer if language == "hi" else en_answer
    return DEFAULT_FALLBACK_HI if language == "hi" else DEFAULT_FALLBACK_EN


def get_assistant_reply(message: str, language: str) -> tuple[str, str]:
    """Returns (reply_text, source) where source is "ai" or "fallback"."""
    ai_reply = call_llm(message, language)
    if ai_reply:
        return ai_reply, "ai"
    return get_fallback_response(message, language), "fallback"

"""
Next Crop Prediction & Agronomic Advisory Service.
Adapted from Krishi Sahayak's agronomic rotation benchmarks and state mandi data.
Recommends the most profitable and soil-healthy crop after a harvest/transaction.
"""
from datetime import date
from typing import TypedDict, List, Optional
from app.services.gemini_ai import call_gemini

# Comprehensive regional mandi benchmarks from Krishi Sahayak
MANDI_BENCHMARKS = [
    {"state": "Uttar Pradesh", "district": "Agra", "commodity": "Potato", "variety": "Desi / Local", "modal_price": 1480, "yield_qtl_acre": 90, "cost_acre": 45000, "season": "Rabi", "water_need": "Medium"},
    {"state": "Uttar Pradesh", "district": "Agra", "commodity": "Tomato", "variety": "Hybrid Red", "modal_price": 2200, "yield_qtl_acre": 110, "cost_acre": 60000, "season": "Rabi / Zaid", "water_need": "Medium"},
    {"state": "Uttar Pradesh", "district": "Aligarh", "commodity": "Wheat", "variety": "Sharbati", "modal_price": 2480, "yield_qtl_acre": 19, "cost_acre": 22000, "season": "Rabi", "water_need": "Medium"},
    {"state": "Uttar Pradesh", "district": "Mathura", "commodity": "Mustard", "variety": "Pusa Bold", "modal_price": 5450, "yield_qtl_acre": 8.5, "cost_acre": 16000, "season": "Rabi", "water_need": "Low"},
    {"state": "Uttar Pradesh", "district": "Bareilly", "commodity": "Moong (Green Gram)", "variety": "Pusa Vishal", "modal_price": 7800, "yield_qtl_acre": 5, "cost_acre": 12000, "season": "Zaid / Kharif", "water_need": "Low"},
    {"state": "Maharashtra", "district": "Nashik", "commodity": "Onion", "variety": "Red Garwa", "modal_price": 2150, "yield_qtl_acre": 85, "cost_acre": 45000, "season": "Rabi", "water_need": "Medium"},
    {"state": "Maharashtra", "district": "Pune", "commodity": "Soybean", "variety": "Yellow", "modal_price": 4500, "yield_qtl_acre": 10, "cost_acre": 18000, "season": "Kharif", "water_need": "Low"},
    {"state": "Maharashtra", "district": "Nagpur", "commodity": "Cotton", "variety": "Medium Staple", "modal_price": 7200, "yield_qtl_acre": 9, "cost_acre": 28000, "season": "Kharif", "water_need": "Medium"},
    {"state": "Punjab", "district": "Ludhiana", "commodity": "Wheat", "variety": "PBW 550", "modal_price": 2420, "yield_qtl_acre": 20, "cost_acre": 24000, "season": "Rabi", "water_need": "Medium"},
    {"state": "Punjab", "district": "Jalandhar", "commodity": "Paddy (Basmati)", "variety": "Pusa 1121", "modal_price": 3900, "yield_qtl_acre": 17, "cost_acre": 26000, "season": "Kharif", "water_need": "High"},
    {"state": "Madhya Pradesh", "district": "Indore", "commodity": "Soybean", "variety": "JS 9560", "modal_price": 4600, "yield_qtl_acre": 9.5, "cost_acre": 17000, "season": "Kharif", "water_need": "Low"},
    {"state": "Madhya Pradesh", "district": "Ujjain", "commodity": "Gram (Chana)", "variety": "Desi", "modal_price": 5800, "yield_qtl_acre": 8, "cost_acre": 15000, "season": "Rabi", "water_need": "Low"},
    {"state": "Rajasthan", "district": "Jaipur", "commodity": "Mustard", "variety": "Mustard Seed", "modal_price": 5550, "yield_qtl_acre": 8.5, "cost_acre": 15000, "season": "Rabi", "water_need": "Low"},
    {"state": "Rajasthan", "district": "Bikaner", "commodity": "Moong (Green Gram)", "variety": "Medium", "modal_price": 7900, "yield_qtl_acre": 4.5, "cost_acre": 11000, "season": "Kharif", "water_need": "Low"},
    {"state": "Gujarat", "district": "Rajkot", "commodity": "Groundnut", "variety": "G-20", "modal_price": 6350, "yield_qtl_acre": 11, "cost_acre": 26000, "season": "Kharif", "water_need": "Medium"},
    {"state": "Haryana", "district": "Karnal", "commodity": "Paddy (Basmati)", "variety": "Basmati Traditional", "modal_price": 4150, "yield_qtl_acre": 16, "cost_acre": 25000, "season": "Kharif", "water_need": "High"},
    {"state": "Bihar", "district": "Purnea", "commodity": "Maize", "variety": "Yellow Hybrid", "modal_price": 2220, "yield_qtl_acre": 28, "cost_acre": 25000, "season": "Rabi / Kharif", "water_need": "Medium"},
]

# Rotation compatibility matrix: previous crop -> recommended rotation types
ROTATION_RULES = {
    # Solanaceous heavy feeders -> rotate with nitrogen-fixing pulses or root crops
    "tomato": ["Moong (Green Gram)", "Gram (Chana)", "Mustard", "Wheat"],
    "potato": ["Moong (Green Gram)", "Maize", "Paddy (Basmati)", "Soybean"],
    # Cereal exhaustive feeders -> rotate with legumes or oilseeds
    "wheat": ["Moong (Green Gram)", "Soybean", "Groundnut", "Maize"],
    "rice": ["Wheat", "Mustard", "Gram (Chana)", "Potato"],
    "paddy": ["Wheat", "Mustard", "Gram (Chana)", "Potato"],
    "maize": ["Mustard", "Wheat", "Potato", "Gram (Chana)"],
    # Legumes & Pulses -> followed by high-yield cereals or vegetables
    "soybean": ["Wheat", "Mustard", "Gram (Chana)"],
    "moong": ["Mustard", "Wheat", "Potato"],
    "gram": ["Maize", "Paddy (Basmati)", "Moong (Green Gram)"],
    # Oilseeds & Others
    "mustard": ["Moong (Green Gram)", "Maize", "Soybean"],
    "onion": ["Soybean", "Maize", "Wheat"],
    "cotton": ["Wheat", "Gram (Chana)", "Mustard"],
    "mango": ["Moong (Green Gram)", "Vegetables (Intercropping)"],
}


class NextCropRecommendation(TypedDict):
    crop_name: str
    variety: str
    reason: str
    rotation_benefit: str
    expected_yield_per_acre: str
    estimated_modal_price: float
    estimated_revenue_per_acre: float
    estimated_cost_per_acre: float
    estimated_profit_per_acre: float
    roi_potential: str
    water_need: str
    season: str
    benchmark_mandi: str
    ai_advisory: str


def current_agricultural_season() -> str:
    month = date.today().month
    if 6 <= month <= 10:
        return "Kharif"
    elif 11 <= month or month <= 3:
        return "Rabi"
    else:
        return "Zaid"


def predict_next_crop(
    previous_crop: str,
    farmer_location: str = "Uttar Pradesh",
    language: str = "en",
) -> NextCropRecommendation:
    """
    Predicts the next most profitable and agronomically sound crop for the farmer.
    Blends Krishi Sahayak rotation logic, regional mandi price benchmarks, and Gemini AI.
    """
    prev_norm = previous_crop.strip().lower()
    
    # 1. Identify candidate rotation crops
    candidates = ROTATION_RULES.get(prev_norm)
    if not candidates:
        for key in ROTATION_RULES:
            if key in prev_norm:
                candidates = ROTATION_RULES[key]
                break
    if not candidates:
        candidates = ["Moong (Green Gram)", "Mustard", "Gram (Chana)", "Wheat"]

    # 2. Match with regional mandi benchmarks
    loc_norm = farmer_location.lower()
    matched_benchmarks = []
    
    # Try finding in state/district first
    for bench in MANDI_BENCHMARKS:
        if bench["commodity"] in candidates:
            score = 1
            if bench["state"].lower() in loc_norm or bench["district"].lower() in loc_norm:
                score += 3
            matched_benchmarks.append((score, bench))

    if not matched_benchmarks:
        # Fallback to any candidate
        for bench in MANDI_BENCHMARKS:
            if bench["commodity"] in candidates:
                matched_benchmarks.append((1, bench))

    if not matched_benchmarks:
        matched_benchmarks = [(1, MANDI_BENCHMARKS[4])]  # Moong in Bareilly

    matched_benchmarks.sort(key=lambda x: x[0], reverse=True)
    best_benchmark = matched_benchmarks[0][1]

    crop_name = best_benchmark["commodity"]
    variety = best_benchmark["variety"]
    modal_price = float(best_benchmark["modal_price"])
    yield_qtl = float(best_benchmark["yield_qtl_acre"])
    cost = float(best_benchmark["cost_acre"])
    
    revenue = yield_qtl * modal_price
    profit = max(0.0, revenue - cost)
    
    # ROI label
    roi_ratio = profit / max(cost, 1.0)
    if roi_ratio > 1.2:
        roi_potential = "Very High"
    elif roi_ratio > 0.6:
        roi_potential = "High"
    else:
        roi_potential = "Medium"

    # Rotation rationale
    if "moong" in crop_name.lower() or "gram" in crop_name.lower() or "soybean" in crop_name.lower():
        rotation_benefit = (
            "Nitrogen-fixing legume that naturally restores soil organic nitrogen after exhaustive harvest, "
            "reducing chemical fertilizer costs by up to 25% for the subsequent cycle."
        )
    elif "mustard" in crop_name.lower():
        rotation_benefit = (
            "Low-water oilseed that breaks solanaceous pest cycles and offers strong cash margins with minimal irrigation."
        )
    else:
        rotation_benefit = (
            "Crop rotation breaks continuous pest/weed cycles, protects soil structure, and optimizes seasonal mandi demand."
        )

    reason = (
        f"Following {previous_crop.title()}, planting {crop_name} is agronomically ideal for {best_benchmark['state']}. "
        f"It requires {best_benchmark['water_need']} irrigation and commands favorable mandi prices (₹{int(modal_price)}/qtl)."
    )

    # 3. AI advisory generation via Gemini (or heuristic fallback)
    prompt = (
        f"As an agronomy expert, give a 2-sentence practical advice to an Indian farmer in {farmer_location} "
        f"who just harvested {previous_crop} and is planning to plant {crop_name} ({variety}). "
        f"Mention soil preparation and mandi profitability."
    )
    if language == "hi":
        prompt += " Reply in clear, natural Hindi."

    ai_advisory = call_gemini(prompt)
    if not ai_advisory:
        if language == "hi":
            ai_advisory = (
                f"{previous_crop} की कटाई के बाद {crop_name} की बुवाई खेत की उर्वरता को वापस लाती है। "
                f"स्थानीय मंडी में इसका अच्छा भाव (₹{int(modal_price)}/क्विंटल) मिल रहा है।"
            )
        else:
            ai_advisory = (
                f"Sowing {crop_name} after {previous_crop} balances soil micronutrients while capturing "
                f"strong regional mandi prices (₹{int(modal_price)}/qtl) with low input risk."
            )

    return {
        "crop_name": crop_name,
        "variety": variety,
        "reason": reason,
        "rotation_benefit": rotation_benefit,
        "expected_yield_per_acre": f"{yield_qtl} Quintals / Acre",
        "estimated_modal_price": modal_price,
        "estimated_revenue_per_acre": revenue,
        "estimated_cost_per_acre": cost,
        "estimated_profit_per_acre": profit,
        "roi_potential": roi_potential,
        "water_need": best_benchmark["water_need"],
        "season": best_benchmark["season"],
        "benchmark_mandi": f"{best_benchmark['district']}, {best_benchmark['state']}",
        "ai_advisory": ai_advisory,
    }

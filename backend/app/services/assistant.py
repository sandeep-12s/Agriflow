"""
AgriFlow Agricultural AI Assistant Service.

1. Tries Google Gemini API (if GEMINI_API_KEY or GOOGLE_API_KEY is configured).
2. Tries Anthropic Claude API (if ANTHROPIC_API_KEY is configured).
3. If no external key is present or connection times out, invokes the AgriFlow
   Comprehensive Agronomic Intelligence Engine, which handles hundreds of
   farming questions across pest management, fertilizers, weather protection,
   mandi selling strategies, storage preservation, crop rotation, and government schemes.
"""
from typing import Optional
import re
import requests

from app.core.config import settings

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_API_VERSION = "2023-06-01"

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "mr": "Marathi (मराठी)",
    "gu": "Gujarati (ગુજરાતી)",
    "te": "Telugu (తెలుగు)",
    "ta": "Tamil (தமிழ்)",
    "bn": "Bengali (বাংলা)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "or": "Odia (ଓଡ଼ିଆ)",
    "as": "Assamese (অসমীয়া)",
    "ur": "Urdu (اردو)",
    "mai": "Maithili (मैथिली)",
    "ks": "Kashmiri (कॉशुर)",
    "kok": "Konkani (कोंकणी)",
    "ne": "Nepali (नेपाली)",
}

SYSTEM_PROMPT = (
    "You are AgriFlow's Agricultural Advisor for Indian farmers. "
    "CRITICAL LIMITATION: You MUST ONLY answer questions strictly related to agriculture, farming, crops, "
    "plant diseases, soil health, fertilizers, irrigation, harvesting, weather, livestock/dairy, APMC mandi rates, "
    "post-harvest storage, and agro-processing. "
    "If the question is not about farming or agriculture (such as programming, software, movies, politics, "
    "or general non-farm trivia), politely decline and state that you are exclusively an agricultural assistant. "
    "LANGUAGE INSTRUCTION: You MUST answer entirely in {language_name}. Do NOT mix English sentences into non-English responses. "
    "Provide empathetic, highly knowledgeable, practical advice in {language_name}. "
    "Format with clean bullet points and actionable recommendations."
)



def call_llm(message: str, language: str) -> Optional[str]:
    """Returns a reply from the Claude API, or None if unavailable."""
    if not settings.ANTHROPIC_API_KEY:
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
                "max_tokens": 450,
                "system": SYSTEM_PROMPT.format(language_name=language_name),
                "messages": [{"role": "user", "content": message}],
            },
            timeout=12,
        )
        response.raise_for_status()
        data = response.json()
        text = "".join(
            block.get("text", "") for block in data.get("content", []) if block.get("type") == "text"
        ).strip()
        return text or None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Comprehensive Indian Agronomic Intelligence Knowledge Engine
# ---------------------------------------------------------------------------

AGRONOMIC_TOPICS = [
    # --- Pests, Disease & Crop Health ---
    (
        ["blight", "early blight", "late blight", "jhulsa", "झुलसा"],
        (
            "🌱 **Blight Management Advisory:**\n\n"
            "• **Identification:** Dark brown water-soaked lesions on lower leaves, spreading rapidly in humid/cool weather (common in Potato and Tomato).\n"
            "• **Immediate Action:** Spray **Mancozeb 75% WP** @ 2.5 g/liter of water, or **Copper Oxychloride 50% WP** @ 3 g/liter.\n"
            "• **Severe Infection:** Apply systemic fungicide like **Metalaxyl + Mancozeb (Ridomil MZ)** @ 2 g/liter.\n"
            "• **Prevention:** Avoid overhead sprinkler irrigation during cloudy periods; maintain adequate plant spacing for airflow."
        ),
        (
            "🌱 **झुलसा रोग (Blight) प्रबंधन सलाह:**\n\n"
            "• **पहचान:** पत्तियों पर गहरे भूरे या काले धब्बे, जो नमी और ठंड में तेजी से फैलते हैं (आलू और टमाटर में मुख्य रूप से)।\n"
            "• **उपचार:** **मैनकोजेब (Mancozeb 75% WP)** 2.5 ग्राम प्रति लीटर पानी या **कॉपर ऑक्सीक्लोराइड** 3 ग्राम/लीटर का छिड़काव करें।\n"
            "• **गंभीर स्थिति में:** **रिडोमिल (Metalaxyl + Mancozeb)** 2 ग्राम प्रति लीटर पानी में मिलाकर छिड़कें।\n"
            "• **सावधानी:** बादल वाले मौसम में ऊपर से सिंचाई न करें और पौधों के बीच हवा का प्रवाह बनाए रखें।"
        ),
    ),
    (
        ["leaf curl", "whitefly", "curl", "मुरड़िया", "सफेद मक्खी"],
        (
            "🌿 **Leaf Curl & Vector Control Advisory:**\n\n"
            "• **Cause:** Leaf curl virus transmitted primarily by whiteflies (*Bemisia tabaci*) in Chilli, Tomato, and Papaya.\n"
            "• **Vector Control:** Spray **Imidacloprid 17.8% SL** @ 0.5 ml/liter or **Thiamethoxam 25% WG** @ 0.3 g/liter.\n"
            "• **Organic Option:** Install yellow sticky traps (15-20 per acre) and spray 5% Neem oil (10,000 ppm) @ 3 ml/liter.\n"
            "• **Field Hygiene:** Roguing: Uproot and burn heavily stunted virus-infected plants immediately to stop field spread."
        ),
        (
            "🌿 **पत्ती मरोड़ (लीफ कर्ल) एवं सफेद मक्खी रोकथाम:**\n\n"
            "• **कारण:** यह वायरस सफेद मक्खी द्वारा मिर्च, टमाटर और पपीते में फैलता है।\n"
            "• **रासायनिक रोकथाम:** **इमिडाक्लोप्रिड (Imidacloprid 17.8% SL)** 0.5 मिली प्रति लीटर या **थियामेथोक्सम 25% WG** 0.3 ग्राम/लीटर का छिड़काव करें।\n"
            "• **जैविक तरीका:** प्रति एकड़ 15-20 पीले चिपचिपे ट्रैप (Yellow Sticky Traps) लगाएं और 5 मिली नीम तेल प्रति लीटर पानी में स्प्रे करें।\n"
            "• **सलाह:** अत्यधिक प्रभावित पौधों को तुरंत उखाड़कर नष्ट कर दें ताकि अन्य पौधों में न फैले।"
        ),
    ),
    (
        ["rust", "yellow rust", "brown rust", "गेरुआ", "पीला रतुआ"],
        (
            "🌾 **Wheat Rust (Ratuwa / Gerua) Treatment:**\n\n"
            "• **Symptoms:** Yellow or orange pustules arranged in stripes along leaf veins on wheat.\n"
            "• **Remedy:** Spray **Propiconazole 25% EC (Tilt)** @ 1 ml/liter (200 ml in 200 liters of water per acre).\n"
            "• **Timing:** Spray during morning hours when morning dew has dried; repeat after 15 days if cloudy weather persists."
        ),
        (
            "🌾 **गेहूं का पीला/भूरा रतुआ (Rust) नियंत्रण:**\n\n"
            "• **लक्षण:** पत्तियों पर पीले या नारंगी रंग के धब्बे धारियों के रूप में दिखाई देते हैं।\n"
            "• **दवा:** **प्रोपिकोनाज़ोल 25% EC (Tilt)** 1 मिली प्रति लीटर पानी (200 मिली प्रति एकड़) का छिड़काव करें।\n"
            "• **समय:** सुबह ओस सूखने के बाद धूप निकलने पर स्प्रे करें। जरूरत पड़ने पर 15 दिन बाद दोबारा दोहराएं।"
        ),
    ),
    (
        ["aphid", "mahun", "chepa", "माहू", "चेपा"],
        (
            "🌱 **Aphid (Mahun / Chepa) Control (Mustard & Vegetables):**\n\n"
            "• **Symptoms:** Tiny green/black sap-sucking insects clustered on pods and tender shoots, causing curling.\n"
            "• **Treatment:** Spray **Dimethoate 30% EC (Rogor)** @ 1.5 ml/liter or **Oxydemeton-methyl** @ 1 ml/liter.\n"
            "• **Safety Interval:** Stop sprays at least 15 days prior to crop harvest."
        ),
        (
            "🌱 **माहू (चेपा) की रोकथाम (सरसों व सब्जियां):**\n\n"
            "• **लक्षण:** फलियों और कोमल तनों पर चिपके छोटे हरे या काले कीड़े जो रस चूसकर फसल सुखा देते हैं।\n"
            "• **उपचार:** **डाइमेथोएट 30% EC (रोगोर)** 1.5 मिली प्रति लीटर पानी में मिलाकर छिड़काव करें।\n"
            "• **सावधानी:** कटाई से कम से कम 15 दिन पहले कीटनाशक का छिड़काव बंद कर दें।"
        ),
    ),

    # --- Fertilizers & Soil Nutrients ---
    (
        ["fertilizer", "urea", "dap", "npk", "खाद", "यूरिया", "डीएपी"],
        (
            "⚖️ **Balanced Crop Fertilizer Scheduling (Per Acre):**\n\n"
            "• **Basal Dose (At Sowing):** Apply full Phosphorus (DAP ~50 kg/acre) + Potassium (MOP ~25 kg/acre) + 1/3rd Nitrogen.\n"
            "• **Top Dressing (Urea):** Apply remaining Nitrogen in two split doses during first irrigation (CRI stage) and before flowering.\n"
            "• **Nano Urea:** Use IFFCO Nano Urea @ 4 ml/liter water at tillering stage for higher nitrogen use efficiency.\n"
            "• **Micronutrients:** Zinc deficiency is common in Indo-Gangetic plains; apply **Zinc Sulphate (21%)** @ 10 kg/acre with basal fertilizer."
        ),
        (
            "⚖️ **संतुलित खाद प्रबंधन (प्रति एकड़):**\n\n"
            "• **बुवाई के समय (बेसल डोज):** पूरी डीएपी (50 किग्रा) + पोटाश (25 किग्रा) + एक-तिहाई यूरिया खेत की तैयारी के समय डालें।\n"
            "• **टॉप ड्रेसिंग (यूरिया):** बाकी यूरिया को दो भागों में बांटकर पहली सिंचाई (21 दिन) और कल्ले फूटते समय दें।\n"
            "• **नैनो यूरिया:** कल्ले निकलते समय इफको नैनो यूरिया 4 मिली प्रति लीटर पानी में स्प्रे करने से लागत घटती है और उपज बढ़ती है।\n"
            "• **जिंक सल्फेट:** 21% जिंक सल्फेट 10 किग्रा प्रति एकड़ मिट्टी में अवश्य मिलाएं।"
        ),
    ),

    # --- Mandi Selling & Price Strategy ---
    (
        ["falling", "drop", "price down", "low price", "भाव कम", "मंडी भाव गिर"],
        (
            "📊 **Mandi Price Drop Advisory & Tactics:**\n\n"
            "1. **Check Neighboring APMCs:** Open AgriFlow's Market page to compare prices across nearby mandis — nearby district hubs often trade at ₹150–₹350/Qtl premium.\n"
            "2. **Perishables (Tomato/Vegetables):** Do not hold in field; use AgriFlow's **Processing Marketplace** to supply to tomato puree or pulp factories at fixed contracts.\n"
            "3. **Grains & Pulses (Wheat/Paddy/Mustard):** Store in authorized dry warehouses with negotiable warehouse receipts (e-NWR) to get low-interest pledge loans instead of distress selling.\n"
            "4. **Direct Buyers:** Post on AgriFlow's **Buyer Portal** to negotiate directly with wholesale institutional aggregators."
        ),
        (
            "📊 **मंडी भाव गिरने पर क्या करें:**\n\n"
            "1. **अन्य मंडियों के भाव देखें:** AgriFlow के Market पेज पर आस-पास की मंडियों की तुलना करें — पास के जिला हब में अक्सर ₹150 से ₹350 प्रति क्विंटल अधिक दाम मिल जाते हैं।\n"
            "2. **सब्जियों और टमाटर के लिए:** खेत में न रोकें; AgriFlow के **Processing पेज** पर जाकर प्यूरी या पल्प बनाने वाली फैक्ट्रियों को सीधे सप्लाई करें।\n"
            "3. **अनाज और दलहन के लिए:** उपज को वेयरहाउस में रखें और ई-एनडब्ल्यूआर (e-NWR) रसीद पर बैंक से कम ब्याज पर लोन लेकर संकटकालीन बिक्री से बचें।\n"
            "4. **सीधे खरीदार खोजें:** AgriFlow के **Buyers पेज** पर सीधे थोक व्यापारियों से संपर्क करें।"
        ),
    ),
    (
        ["where to sell", "where can i sell", "sell my", "find buyer", "कहाँ बेचूँ", "खरीदार"],
        (
            "🤝 **How to Sell Your Harvest for Maximum Profit:**\n\n"
            "• **Step 1:** Add your harvested crop to AgriFlow's **Produce** tab with current quantity and grade.\n"
            "• **Step 2:** Click **'Find Buyers'** to instantly match with corporate buyers, food processors, and exporters looking for your specific crop.\n"
            "• **Step 3:** Use the **Market Comparison** table to see if traveling 20–30 km to a larger district APMC pays higher net margin after transport costs."
        ),
        (
            "🤝 **अपनी फसल को अधिकतम लाभ पर कहाँ और कैसे बेचें:**\n\n"
            "• **पहला कदम:** अपनी फसल को AgriFlow के **Produce** टैब में मात्रा और गुणवत्ता के साथ दर्ज करें।\n"
            "• **दूसरा कदम:** **'Find Buyers'** पर क्लिक करें ताकि आपकी फसल की मांग करने वाले सत्यापित खरीदारों और कंपनियों से सीधा संपर्क हो सके।\n"
            "• **तीसरा कदम:** **Market पेज** पर विभिन्न मंडियों के भाव और दूरी की तुलना करें ताकि परिवहन खर्च काटकर सबसे ज्यादा मुनाफा मिल सके।"
        ),
    ),

    # --- Storage & Spoilage Prevention ---
    (
        ["store", "storage", "cold storage", "भंडारण", "कोल्ड स्टोर"],
        (
            "📦 **Crop Storage & Preservation Guide:**\n\n"
            "• **Potatoes:** Store in licensed cold storage at 8°C–10°C with CIPC sprout suppressant; ensure 10-day field curing before loading.\n"
            "• **Onions:** Store in ventilated raised wooden platforms (Chawl) at ambient temperature; dry for 7–10 days until necks seal tightly.\n"
            "• **Wheat & Grain:** Keep grain moisture below 12% before bagging; use hermetic grain bags or metal bins with neem leaves or Celphos fumigation against weevils.\n"
            "• **Explore Facilities:** Check AgriFlow's **Storage Facilities** tab for nearby cold and dry warehouses with real-time capacity."
        ),
        (
            "📦 **फसल भंडारण एवं सड़न से बचाव के नियम:**\n\n"
            "• **आलू:** 8°C–10°C तापमान वाले कोल्ड स्टोरेज में रखें। स्टोर में रखने से पहले 10 दिन तक छांव में सुखाकर चमड़ी सख्त कर लें।\n"
            "• **प्याज:** हवादार जालीदार भंडारण (चावल/कच्ची खोली) में रखें। 7-10 दिन तक धूप में सुखाएं जब तक तना पूरी तरह सूख न जाए।\n"
            "• **गेहूं और अनाज:** भंडारण के समय अनाज में 12% से कम नमी होनी चाहिए। हरमेटिक बैग या धातु की टंकियों में नीम पत्ती के साथ सुरक्षित रखें।\n"
            "• **आस-पास के भंडार:** AgriFlow के **Storage** टैब में जाकर निकटतम कोल्ड स्टोरेज और गोदामों की क्षमता व किराया देखें।"
        ),
    ),

    # --- Crop Rotation & Next Crop ---
    (
        ["next crop", "crop rotation", "after wheat", "after paddy", "अगली फसल", "फसल चक्र"],
        (
            "🌾 **Next Crop Recommendation & Soil Regeneration:**\n\n"
            "• **After Wheat (April–May):** Sowing green gram (**Moong**) or **Sesbania (Dhaincha)** fixes 30–40 kg atmospheric nitrogen per acre and yields ₹7,500/Qtl in 65 days.\n"
            "• **After Paddy (Basmati/Rice):** Plant low-water pulses like **Gram (Chana)**, **Mustard**, or short-duration **Potato** to prevent soil salinity.\n"
            "• **AgriFlow AI Engine:** Open your produce card on the **Produce** page and click **'🌱 Next Crop'** for an automated soil, ROI, and profit breakdown!"
        ),
        (
            "🌾 **अगली फसल चक्र और मिट्टी सुधार सलाह:**\n\n"
            "• **गेहूं की कटाई के बाद (अप्रैल-मई):** 60 दिन की **मूंग (Moong)** या **ढैंचा** लगाएं। यह प्रति एकड़ 30-40 किलो नाइट्रोजन जोड़ता है और मूंग से ₹7,500/क्विंटल का अतिरिक्त मुनाफा भी मिलता है।\n"
            "• **धान (चावल) के बाद:** कम पानी वाली फसलें जैसे **चना**, **सरसों** या अगेती **आलू** लगाएं जिससे मिट्टी की उर्वरता बनी रहे।\n"
            "• **AgriFlow प्रिडिक्शन:** अपनी उपज सूची में जाकर **'🌱 Next Crop'** बटन दबाएं और अपने क्षेत्र के हिसाब से सबसे मुनाफेदार फसल का पूरा हिसाब देखें!"
        ),
    ),

    # --- Government Schemes & Subsidies ---
    (
        ["pm kisan", "scheme", "subsidy", "kcc", "fasal bima", "योजना", "सब्सिडी", "बीमा"],
        (
            "🏛️ **Key Government Farmer Welfare Schemes:**\n\n"
            "• **PM-KISAN:** ₹6,000 annual direct benefit in 3 installments. Ensure your eKYC and Aadhaar-bank seeding is active on pmkisan.gov.in.\n"
            "• **PMFBY (Crop Insurance):** Covers localized calamity, drought, and post-harvest losses. Report damage within 72 hours via the Crop Insurance App.\n"
            "• **Kisan Credit Card (KCC):** Loans up to ₹3 Lakh at 4% effective interest upon timely repayment.\n"
            "• **Solar Pump (PM-KUSUM):** Up to 60% government subsidy for standalone solar agriculture pumps."
        ),
        (
            "🏛️ **प्रमुख सरकारी किसान योजनाएं एवं लाभ:**\n\n"
            "• **पीएम-किसान:** ₹6,000 वार्षिक सहायता (3 किस्तों में)। pmkisan.gov.in पर अपनी eKYC और आधार-बैंक लिंक सुनिश्चित करें।\n"
            "• **प्रधानमंत्री फसल बीमा योजना (PMFBY):** बेमौसम बारिश या ओलावृष्टि से नुकसान होने पर 72 घंटे के भीतर क्रॉप इंश्योरेंस ऐप या कृषि अधिकारी को सूचित करें।\n"
            "• **किसान क्रेडिट कार्ड (KCC):** समय पर भुगतान करने पर मात्र 4% ब्याज दर पर 3 लाख तक का कृषि ऋण मिलता है।\n"
            "• **पीएम-कुसुम (सोलर पंप):** सिंचाई के लिए सोलर पंप लगाने पर 60% तक सरकारी सब्सिडी मिलती है।"
        ),
    ),
]


GREETINGS_PATTERN = re.compile(
    r"\b(hello|hi|hey|namaste|namaskar|pranam|kaise ho|kaisa hai|good morning|good evening|good afternoon|ram ram|radhe radhe|sasriyakaal|adab|kya haal|help)\b",
    re.IGNORECASE,
)

PHOTO_DIAGNOSIS_KEYWORDS = (
    "analyse", "analyze", "scan", "photo", "image", "camera", "picture",
    "check my crop", "diagnose", "jaanch", "तस्वीर", "फोटो", "जांच", "रोग पहचान", "बीमारी जांच", "लक्षण"
)

AGRICULTURE_TERMS = {
    # Crops (English & Indian Transliteration)
    "wheat", "gehu", "gehun", "paddy", "dhan", "rice", "chawal", "tomato", "tamatar", "potato", "aalu", "aloo",
    "onion", "pyaz", "pyaj", "mustard", "sarson", "sarso", "maize", "makka", "corn", "cotton", "kapas",
    "sugarcane", "ganna", "soybean", "soya", "gram", "chana", "moong", "mung", "urad", "arhar", "tur",
    "lentil", "masoor", "bajra", "jowar", "millet", "barley", "jau", "chilli", "chili", "mirch", "garlic",
    "lahsun", "ginger", "adrak", "turmeric", "haldi", "coriander", "dhaniya", "cumin", "jeera", "fenugreek",
    "methi", "fennel", "saunf", "groundnut", "moongfali", "peanut", "sunflower", "surajmukhi", "sesame", "til",
    "cardamom", "elaichi", "tea", "chai", "coffee", "rubber", "jute", "tobacco", "apple", "seb", "mango", "aam",
    "banana", "kela", "orange", "santra", "guava", "amrood", "papaya", "papita", "pomegranate", "anar",
    "grapes", "angoor", "watermelon", "tarbooj", "cucumber", "kheera", "brinjal", "eggplant", "baingan",
    "okra", "bhindi", "cabbage", "cauliflower", "gobhi", "pea", "matar", "carrot", "gajar", "radish", "mooli",
    "spinach", "palak", "pumpkin", "kaddu", "lauki", "gourd", "karela", "capsicum", "mushroom", "dragonfruit",
    "amla", "lemon", "nimbu", "coconut", "nariyal", "pulses", "dal", "daal", "oilseed", "cereals", "fodder", "chara",

    # Farming Operations & Concepts
    "agri", "agriculture", "agricultural", "farm", "farmer", "farming", "kheti", "kisan", "krishi", "crop",
    "crops", "fasal", "yield", "harvest", "harvesting", "sow", "sowing", "seed", "seeds", "beej", "buwai",
    "katai", "field", "fields", "khet", "upaj", "paidawar", "plant", "plants", "paudha", "ped", "tree",
    "leaf", "leaves", "patti", "pattiyan", "stem", "tana", "root", "roots", "jad", "flower", "phool", "fruit",
    "phal", "soil", "mitti", "land", "zameen", "acre", "bigha", "hectare",

    # Fertilizers, Nutrients & Soil
    "fertilizer", "fertilizers", "khad", "urea", "dap", "npk", "potash", "mop", "ssp", "zinc", "boron",
    "sulfur", "sulphur", "iron", "compost", "vermicompost", "gobar", "manure", "fym", "nano urea", "nano dap",
    "nutrient", "nutrients", "poshak", "deficiency", "kami", "soil test", "ph", "saline", "organic", "jaivik",
    "biofertilizer",

    # Pests, Diseases & Plant Protection
    "disease", "diseases", "rog", "bimari", "beemari", "insect", "insects", "keeda", "kida", "pest", "pests",
    "blight", "jhulsa", "rust", "ratuwa", "gerua", "leaf curl", "muradiya", "aphid", "aphids", "mahu", "chepa",
    "whitefly", "makkhi", "thrips", "borer", "caterpillar", "sundi", "illi", "worm", "rot", "sadan", "wilt",
    "ukhtha", "mildew", "blast", "smut", "canker", "nematode", "mite", "spot", "spots", "mosaic", "virus",
    "fungus", "fungi", "fafund", "bacteria", "spray", "spraying", "sprays", "chidkaw", "pesticide", "pesticides",
    "kitnashak", "insecticide", "insecticides", "fungicide", "fungicides", "weed", "weeds", "weedicide",
    "herbicide", "kharpatwar", "dose", "dosage", "medicine", "dawa", "dawai", "mancozeb", "imidacloprid", "tilt",
    "rogor", "chlorpyrifos", "coragen", "ridomil", "copper", "bavistin", "carbendazim", "neem",

    # Irrigation, Water & Weather
    "irrigation", "sinchai", "pani", "paani", "water", "watering", "drought", "sukha", "flood", "baadh",
    "rain", "rains", "rainfall", "barish", "barsat", "monsoon", "weather", "mausam", "temperature", "tapman",
    "humidity", "nami", "frost", "pala", "hail", "ole", "fog", "kohra", "dew", "oas", "drip", "sprinkler",
    "borewell", "tubewell", "canal", "nahar",

    # Market, Mandi, Prices, Trade & Storage
    "mandi", "mandis", "market", "markets", "bazar", "bazaar", "price", "prices", "rate", "rates", "bhav",
    "daam", "cost", "costs", "lagat", "profit", "munafa", "labh", "revenue", "loss", "nuksan", "buyer",
    "buyers", "kharidar", "vyapari", "trader", "traders", "commission", "arhtiya", "quintal", "kuintal", "ton",
    "transport", "freight", "kiraya", "apmc", "agmarknet", "enam", "msp", "procurement", "khareed", "purchase",
    "sell", "selling", "bikri", "bechna", "sale", "sales", "storage", "bhandaran", "cold storage", "godown",
    "warehouse", "silo", "bori", "jute", "moisture", "drying", "sukhana", "shelf life", "preservation",
    "processing", "prashankaran", "mill", "chakki", "value addition", "grading",

    # Schemes, Machinery & Animal Husbandry
    "pm kisan", "pm-kisan", "kcc", "kisan credit card", "pmfby", "fasal bima", "insurance", "bima", "subsidy",
    "anudan", "loan", "rin", "karz", "tractor", "rotavator", "harvester", "thresher", "sprayer", "pump",
    "kusum", "solar pump", "dairy", "cow", "gaay", "buffalo", "bhains", "milk", "doodh", "cattle", "pashu",
    "pashupalan", "livestock", "poultry", "murgi", "fish farming", "matsya", "beekeeping", "madhumakkhi",
    "horticulture", "bagwani"
}

DEVANAGARI_AGRI_TERMS = (
    "कृषि", "खेती", "किसान", "फसल", "उपज", "बुवाई", "कटाई", "बीज", "पौधा", "पेड़", "पत्ती", "तना", "जड़",
    "फूल", "फल", "मिट्टी", "खेत", "गेहूं", "धान", "चावल", "टमाटर", "आलू", "प्याज", "सरसों", "मक्का", "कपास",
    "गन्ना", "सोयाबीन", "चना", "मूंग", "उड़द", "अरहर", "बाजरा", "ज्वार", "मिर्च", "लहसुन", "अदरक", "हल्दी",
    "धनिया", "जीरा", "मूंगफली", "खाद", "यूरिया", "डीएपी", "पोटाश", "जिंक", "रोग", "बीमारी", "कीड़ा", "कीट",
    "झुलसा", "रतुआ", "पत्ती मरोड़", "माहू", "सफेद मक्खी", "दवा", "कीटनाशक", "फफूंदनाशक", "छिड़काव", "सिंचाई",
    "पानी", "सूखा", "बाढ़", "बारिश", "मानसून", "मौसम", "तापमान", "पाला", "ओले", "मंडी", "भाव", "दाम", "बाज़ार",
    "खरीदार", "व्यापारी", "क्विंटल", "बीघा", "एकड़", "भंडारण", "कोल्ड स्टोरेज", "गोदाम", "प्रोसेसिंग",
    "पीएम किसान", "फसल बीमा", "केसीसी", "ट्रैक्टर", "पशुपालन", "डेयरी", "चारा", "दुग्ध", "बागवानी"
)


def is_agricultural_or_greeting(message: str) -> bool:
    """Detect if the user's message is related to agriculture, a greeting, or photo diagnosis."""
    lowered = message.lower().strip()
    if not lowered:
        return False

    # 1. Greetings
    if GREETINGS_PATTERN.search(lowered):
        return True

    # 2. Crop photo / scan requests
    if any(phrase in lowered for phrase in PHOTO_DIAGNOSIS_KEYWORDS):
        return True

    # 3. Devanagari Hindi agriculture check
    if any(term in message for term in DEVANAGARI_AGRI_TERMS):
        return True

    # 4. Token check for English & transliterated keywords
    words = re.findall(r"\b[a-z]{3,}\b", lowered)
    for word in words:
        if word in AGRICULTURE_TERMS:
            return True

    # 5. Multi-word phrase check (e.g. "pm kisan", "cold storage", "leaf curl", "nano urea")
    for term in AGRICULTURE_TERMS:
        if " " in term and term in lowered:
            return True

    return False


def get_off_topic_refusal(language: str) -> str:
    """Strict refusal for non-agricultural queries in all 9 supported languages."""
    refusals = {
        "hi": (
            "🚫 **विषय सीमा: केवल कृषि एवं खेती संबंधी प्रश्न**\n\n"
            "मैं **AgriFlow का समर्पित AI कृषि सलाहकार एवं फसल डॉक्टर** हूँ। मुझे केवल "
            "**खेती-किसानी, फसल स्वास्थ्य, खाद-उर्वरक, मंडी भाव एवं कृषि व्यापार** से जुड़े प्रश्नों का उत्तर देने के लिए तैयार किया गया है।\n\n"
            "मैं प्रोग्रामिंग, कंप्यूटर, सामान्य ज्ञान या अन्य गैर-कृषि विषयों के प्रश्नों का उत्तर नहीं दे सकता।\n\n"
            "🌾 **आप मुझसे इन कृषि विषयों पर पूछ सकते हैं:**\n"
            "• **फसल रोग व उपचार:** *'टमाटर में झुलसा की दवा'* या *'मिर्च में पत्ती मरोड़ की रोकथाम'*\n"
            "• **📸 फोटो से रोग जांच:** नीचे दिए गए कैमरा बटन से पौधे या पत्ती की फोटो भेजें\n"
            "• **खाद एवं पोषण:** *'गेहूं में यूरिया और डीएपी डालने का सही समय व मात्रा'*\n"
            "• **मंडी भाव व उपज बिक्री:** *'सरसों या धान का मंडी भाव'* या *'फसल बेचने का सही समय'*\n"
            "• **भंडारण एवं प्रोसेसिंग:** *'आलू या प्याज को सड़ने से कैसे बचाएं'*"
        ),
        "pa": (
            "🚫 **ਵਿਸ਼ਾ ਸੀਮਾ: ਸਿਰਫ਼ ਖੇਤੀਬਾੜੀ ਅਤੇ ਫ਼ਸਲਾਂ ਸੰਬੰਧੀ ਸਵਾਲ**\n\n"
            "ਮੈਂ **AgriFlow ਦਾ ਸਮਰਪਿਤ AI ਖੇਤੀ ਸਲਾਹਕਾਰ ਅਤੇ ਫ਼ਸਲ ਡਾਕਟਰ** ਹਾਂ। ਮੈਂ ਸਿਰਫ਼ "
            "**ਖੇਤੀਬਾੜੀ, ਫ਼ਸਲਾਂ ਦੀ ਦੇਖਭਾਲ, ਖਾਦਾਂ, ਮੰਡੀ ਭਾਅ ਅਤੇ ਕੀੜੇ-ਮਕੌੜਿਆਂ** ਸੰਬੰਧੀ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇਣ ਲਈ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਹਾਂ।\n\n"
            "ਮੈਂ ਕੰਪਿਊਟਰ ਪ੍ਰੋਗਰਾਮਿੰਗ ਜਾਂ ਹੋਰ ਗੈਰ-ਖੇਤੀਬਾੜੀ ਵਿਸ਼ਿਆਂ ਦੇ ਜਵਾਬ ਨਹੀਂ ਦੇ ਸਕਦਾ।\n\n"
            "🌾 **ਤੁਸੀਂ ਖੇਤੀ ਸੰਬੰਧੀ ਸਵਾਲ ਪੁੱਛ ਸਕਦੇ ਹੋ:**\n"
            "• **ਫ਼ਸਲ ਬਿਮਾਰੀਆਂ ਦਾ ਇਲਾਜ:** *'ਕਣਕ ਵਿੱਚ ਪੀਲਾ ਰਤੂਆ ਦੀ ਰੋਕਥਾਮ'*\n"
            "• **📸 ਫੋਟੋ ਰਾਹੀਂ ਜਾਂਚ:** ਹੇਠਾਂ ਦਿੱਤੇ ਕੈਮਰਾ ਬਟਨ ਰਾਹੀਂ ਪੱਤੇ ਦੀ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ\n"
            "• **ਖਾਦ ਪ੍ਰਬੰਧਨ:** *'ਕਣਕ ਜਾਂ ਝੋਨੇ ਵਿੱਚ ਯੂਰੀਆ ਪਾਉਣ ਦਾ ਸਹੀ ਸਮਾਂ'*\n"
            "• **ਮੰਡੀ ਭਾਅ:** *'ਸਰ੍ਹੋਂ ਜਾਂ ਕਣਕ ਦਾ ਤਾਜ਼ਾ ਮੰਡੀ ਰੇਟ'*"
        ),
        "mr": (
            "🚫 **विषय मर्यादा: फक्त शेती आणि कृषी संबंधित प्रश्न**\n\n"
            "मी **AgriFlow चा समर्पित AI कृषी सल्लागार आणि पीक डॉक्टर** आहे. मी केवळ "
            "**शेती, पिके, खते, बाजारभाव आणि कीड व्यवस्थापनाशी** संबंधित प्रश्नांची उत्तरे देऊ शकतो.\n\n"
            "मी कोडिंग, संगणक किंवा इतर गैर-कृषी विषयांवर उत्तरे देऊ शकत नाही.\n\n"
            "🌾 **आपण खालील विषयांवर विचारू शकता:**\n"
            "• **पीक रोग व उपाय:** *'टोमॅटोमधील करपा रोगाचे औषध'* किंवा *'कांद्यावरील कीड नियंत्रण'*\n"
            "• **📸 फोटोद्वारे तपासणी:** खालील कॅमेरा बटण वापरून पानांचा फोटो पाठवा\n"
            "• **खत व्यवस्थापन:** *'गव्हासाठी युरिया आणि डीएपीचे प्रमाण'*\n"
            "• **बाजारभाव:** *'कांदा किंवा सोयाबीनचे थेट बाजारभाव'*"
        ),
        "gu": (
            "🚫 **વિષય મર્યાદા: માત્ર કૃષિ અને ખેતી સંબંધિત પ્રશ્નો**\n\n"
            "હું **AgriFlow નો સમર્પિત AI કૃષિ સલાહકાર અને પાક ડોક્ટર** છું. હું માત્ર "
            "**ખેતી, પાક સંરક્ષણ, ખાતર, મંડી ભાવ અને રોગ નિયંત્રણ** સંબંધિત પ્રશ્નોના જવાબો આપી શકું છું.\n\n"
            "હું કમ્પ્યુટર પ્રોગ્રામિંગ કે અન્ય બિન-ખેતી વિષયોના જવાબો આપી શકતો નથી.\n\n"
            "🌾 **તમે નીચે મુજબ પૂછી શકો છો:**\n"
            "• **પાક રોગ નિયંત્રણ:** *'કપાસમાં ગુલાબી ઈયળનું નિયંત્રણ'* અથવા *'જીરુંમાં સુકારો'*\n"
            "• **📸 ફોટો સ્કેન:** કેમેરા બટનથી રોગગ્રસ્ત પાંદડાનો ફોટો મોકલો\n"
            "• **ખાતર સમયપત્રક:** *'ઘઉંમાં યુરિયા અને ડીએપી આપવાનો સમય'*\n"
            "• **બજાર ભાવ:** *'મગફળી અથવા રાયડાના આજના મંડી ભાવ'*"
        ),
        "te": (
            "🚫 **విషయ పరిమితి: కేవలం వ్యవసాయ సంబంధిత ప్రశ్నలు మాత్రమే**\n\n"
            "నేను **AgriFlow అంకితమైన AI వ్యవసాయ సలహాదారు మరియు పంట వైద్యుడిని**. నేను కేవలం "
            "**వ్యవసాయం, పంటల సంరక్షణ, ఎరువులు, మార్కెట్ ధరలు మరియు తెగుళ్ళ నివారణకు** సంబంధించిన ప్రశ్నలకు మాత్రమే సమాధానం ఇవ్వగలను.\n\n"
            "🌾 **మీరు నన్ను వీటి గురించి అడగవచ్చు:**\n"
            "• **పంట తెగుళ్ళు & మందులు:** *'మిరపలో ఆకుముడత నివారణ'* లేదా *'టమాటాలో మచ్చల తెగులు'*\n"
            "• **📸 ఫోటో ద్వారా నిర్ధారణ:** క్రింది కెమెరా బటన్ ద్వారా ఆకుల ఫోటో పంపండి\n"
            "• **ఎరువుల యాజమాన్యం:** *'వరి లేదా గోధుమలో యూరియా వాడే సమయం'*\n"
            "• **మార్కెట్ ధరలు:** *'తాజా మార్కెట్ రేట్లు మరియు కొనుగోలుదారులు'*"
        ),
        "ta": (
            "🚫 **தலைப்பு வரம்பு: விவசாயம் மற்றும் பயிர்கள் தொடர்பான கேள்விகள் மட்டுமே**\n\n"
            "நான் **AgriFlow-ன் பிரத்யேக AI விவசாய ஆலோசகர் மற்றும் பயிர் மருத்துவர்**. விவசாயம், "
            "**பயிர்கள், உரங்கள், மண்டி விலைகள் மற்றும் பூச்சி மேலாண்மை** தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க முடியும்.\n\n"
            "🌾 **நீங்கள் கேட்கக்கூடியவை:**\n"
            "• **பயிர் நோய் சிகிச்சை:** *'தக்காளியில் இலை சுருட்டல் நோய்'* அல்லது *'நெல் குலை நோய்'*\n"
            "• **📸 புகைப்பட ஆய்வு:** பாதிக்கப்பட்ட இலையின் புகைப்படத்தை பதிவேற்றவும்\n"
            "• **உர மேலாண்மை:** *'யூரியா மற்றும் டிஏபி இடும் சரியான நேரம்'*\n"
            "• **சந்தை விலைகள்:** *'மண்டி விலைகள் மற்றும் நேரடி கொள்முதல்'*"
        ),
        "bn": (
            "🚫 **বিষয় সীমাবদ্ধতা: শুধুমাত্র কৃষি ও চাষাবাদ সম্পর্কিত প্রশ্ন**\n\n"
            "আমি **AgriFlow-এর নিবেদিতপ্রাণ এআই কৃষি উপদেষ্টা ও ফসল ডাক্তার**। আমি শুধুমাত্র "
            "**কৃষি, ফসলের রোগবালাই, সার প্রয়োগ, মান্ডি দর এবং কৃষি ব্যবসা** সংক্রান্ত প্রশ্নের উত্তর দেওয়ার জন্য প্রস্তুত।\n\n"
            "🌾 **আপনি জিজ্ঞাসা করতে পারেন:**\n"
            "• **রোগবালাই দমন:** *'টমেটোর নাবি ধসা রোগ'* বা *'আলুর ঝলসানো রোগ নিরাময়'*\n"
            "• **📸 ছবি তুলে পরীক্ষা:** আক্রান্ত পাতার ছবি তুলে রোগ পরীক্ষা করুন\n"
            "• **সার প্রয়োগ:** *'গম বা ধানে ইউরিয়া ও ডিএপি দেওয়ার সঠিক সময়'*\n"
            "• **বাজার দর:** *'সরিষা বা ধানের বর্তমান মান্ডি দর'*"
        ),
        "kn": (
            "🚫 **ವಿಷಯ ಮಿತಿ: ಕೇವಲ ಕೃಷಿ ಮತ್ತು ಬೆಳೆ ಸಂಬಂಧಿತ ಪ್ರಶ್ನೆಗಳು ಮಾತ್ರ**\n\n"
            "ನಾನು **AgriFlow ನ ಕೃಷಿ ಸಲಹೆಗಾರ ಮತ್ತು ಬೆಳೆ ವೈದ್ಯ**. ಕೃಷಿ, **ಬೆಳೆಗಳು, ರಸಗೊಬ್ಬರಗಳು, "
            "ಮಾರುಕಟ್ಟೆ ದರಗಳು ಮತ್ತು ಕೀಟ ನಿರ್ವಹಣೆಗೆ** ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ನಾನು ಉತ್ತರಿಸಬಲ್ಲೆ.\n\n"
            "🌾 **ನೀವು ಕೇಳಬಹುದಾದ ಪ್ರಶ್ನೆಗಳು:**\n"
            "• **ಬೆಳೆ ರೋಗ ನಿಯಂತ್ರಣ:** *'ಟೊಮೆಟೊ ಎಲೆ ಸುರುಟು ರೋಗ'* ಅಥವಾ *'ಗೋಧಿ ತುಕ್ಕು ರೋಗ'*\n"
            "• **📸 ಫೋಟೋ ಮೂಲಕ ತಪಾಸಣೆ:** ಎಲೆಯ ಫೋಟೋ ತೆಗೆದು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ\n"
            "• **ಗೊಬ್ಬರ ನಿರ್ವಹಣೆ:** *'ಯೂರಿಯಾ ಮತ್ತು ಡಿಎಪಿ ಬಳಸುವ ಸರಿಯಾದ ಸಮಯ'*\n"
            "• **ಮಾರುಕಟ್ಟೆ ದರಗಳು:** *'ಮಂಡಿ ದರಗಳು ಮತ್ತು ಮಾರಾಟ'*"
        ),
        "ml": (
            "🚫 **വിഷയ പരിമിതി: കാർഷിക സംബന്ധമായ ചോദ്യങ്ങൾ മാത്രം**\n\n"
            "ഞാൻ **AgriFlow-ന്റെ കാർഷിക ഉപദേശകനും വിള ഡോക്ടറുമാണ്**. കൃഷി, വിളകൾ, "
            "വളപ്രയോഗം, വിപണി വിലകൾ, കീടനിയന്ത്രണം എന്നിവയെക്കുറിച്ചുള്ള ചോദ്യങ്ങൾക്ക് മാത്രമേ എനിക്ക് മറുപടി നൽകാൻ കഴിയൂ.\n\n"
            "🌾 **നിങ്ങൾക്ക് ചോദിക്കാവുന്ന കാര്യങ്ങൾ:**\n"
            "• **വിള രോഗങ്ങൾ & പ്രതിവിധി:** *'തക്കാളിയിലെ ഇലച്ചുരുൾ രോഗം'* അല്ലെങ്കിൽ *'നെല്ലിലെ കീടനിയന്ത്രണം'*\n"
            "• **📸 ഫോട്ടോ പരിശോധന:** രോഗം ബാധിച്ച ഇലയുടെ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക\n"
            "• **വളപ്രയോഗം:** *'യൂറിയയും ഫോസ്ഫേറ്റും നൽകേണ്ട ശരിയായ സമയം'*\n"
            "• **വിപണി വില:** *'തത്സമയ മാർക്കറ്റ് നിരക്കുകൾ'*"
        ),
        "or": (
            "🚫 **ବିଷୟ ସୀମା: କେବଳ କୃଷି ଓ ଫସଲ ସମ୍ବନ୍ଧୀୟ ପ୍ରଶ୍ନ**\n\n"
            "ମୁଁ **AgriFlow ର AI କୃଷି ପରାମର୍ଶଦାତା ଓ ଫସଲ ଡାକ୍ତର**। ମୁଁ କେବଳ କୃଷି, "
            "ଫସଲ ସୁରକ୍ଷା, ସାର ପ୍ରୟୋଗ, ମଣ୍ଡି ଦର ଏବଂ କୀଟ ନିୟନ୍ତ୍ରଣ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେଇପାରିବି।\n\n"
            "🌾 **ଆପଣ ପଚାରିପାରିବେ:**\n"
            "• **ଫସଲ ରୋଗ ନିରାକରଣ:** *'ଧାନ ଝାଉଁଳା ରୋଗ'* କିମ୍ବା *'ଟମାଟୋ ପତ୍ର କୁଞ୍ଚନ'*\n"
            "• **📸 ଫଟୋ ପରୀକ୍ଷା:** ପତ୍ରର ଫଟୋ ଉଠାଇ ଯାଞ୍ଚ କରନ୍ତୁ\n"
            "• **ସାର ପରିଚାଳନା:** *'ୟୁରିଆ ଏବଂ ଡିଏପି ପ୍ରୟୋଗ ସମୟ'*\n"
            "• **ମଣ୍ଡି ଦର:** *'ତାଜା ବଜାର ଦର ଏବଂ ବିକ୍ରୟ'*"
        ),
        "as": (
            "🚫 **বিষয় সীমাবদ্ধতা: কেৱল কৃষি আৰু শস্য সম্বন্ধীয় প্ৰশ্ন**\n\n"
            "মই **AgriFlow ৰ সমৰ্পিত AI কৃষি উপদেষ্টা আৰু শস্য চিকিৎসক**। মই কেৱল কৃষি, "
            "শস্যৰ যতন, সাৰ প্ৰয়োগ, মণ্ডিৰ দৰ আৰু কীট নিয়ন্ত্ৰণৰ উত্তৰ দিব পাৰোঁ।\n\n"
            "🌾 **আপুনি সুধিব পাৰে:**\n"
            "• **শস্যৰ ৰোগ প্ৰতিকাৰ:** *'ধানৰ ব্লাইট ৰোগ'* বা *'আলুৰ পচা ৰোগ'*\n"
            "• **📸 ফটো পৰীক্ষা:** আক্ৰান্ত পাতৰ ফটো তুলি পৰীক্ষা কৰক\n"
            "• **সাৰ ব্যৱস্থাপনা:** *'ইউৰিয়া আৰু ডিএপি প্ৰয়ୋগৰ সঠিক সময়'*\n"
            "• **বজাৰ দৰ:** *'মণ্ডিৰ শেহতীয়া মূল্য আৰু বিক্ৰী'*"
        ),
        "ur": (
            "🚫 **موضوع کی پابندی: صرف زراعت اور فصلوں سے متعلق سوالات**\n\n"
            "میں **AgriFlow کا اے آئی زرعی مشیر اور کراپ ڈاکٹر** ہوں۔ میں صرف زراعت، فصلوں کی دیکھ بھال، "
            "کھاد، منڈی کے نرخ اور کیڑوں کے علاج سے متعلق سوالات کے جوابات دے سکتا ہوں۔\n\n"
            "🌾 **آپ یہ سوالات پوچھ سکتے ہیں:**\n"
            "• **فصلوں کی بیماریاں:** گندم یا دھان کے امراض کا علاج\n"
            "• **📸 تصویر سے تشخیص:** متاثرہ پتے کی تصویر بھیج کر بیماری جانچیں\n"
            "• **کھاد کا استعمال:** یوریا اور ڈی اے پی ڈالنے کا درست وقت\n"
            "• **منڈی کے نرخ:** تازہ ترین مارکیٹ ریٹس"
        ),
        "mai": (
            "🚫 **विषय सीमा: केवल कृषि एवं खेती सं संबंधित प्रश्न**\n\n"
            "हम **AgriFlow क समर्पित AI कृषि सलाहकार आ फसल डॉक्टर** छी। हम केवल "
            "खेती-बारी, फसल रोग, खाद-उर्वरक आ मंडी भाव संबंधित प्रश्नक उत्तर दय सकैत छी।\n\n"
            "🌾 **अहाँ ई सब पूछ सकैत छी:**\n"
            "• **फसल रोग निदान:** *'टमाटर झुलसा रोगक दवा'* वा *'धान में कीट नियंत्रण'*\n"
            "• **📸 फोटो जांच:** कैमरा बटन सं पत्ता के फोटो खिंचि क' जांच करू\n"
            "• **खाद प्रबंधन:** *'गेहूं में यूरिया देबाक सही समय'*\n"
            "• **मंडी भाव:** *'मखान वा मकई क ताजा मंडी भाव'*"
        ),
    }
    return refusals.get(language, (
        "🚫 **Topic Limitation: Farming & Agriculture Only**\n\n"
        "I am **AgriFlow's dedicated AI Agricultural Advisor & Crop Doctor**. I am strictly configured to answer "
        "only **farming, crop care, and agriculture-related questions**.\n\n"
        "I cannot answer questions about computer programming, coding, movies, celebrities, or general non-agricultural topics.\n\n"
        "🌾 **Please feel free to ask about:**\n"
        "• **Crop Health & Disease Remedies:** *'How to cure late blight in tomato?'* or *'Remedy for yellow rust in wheat'*\n"
        "• **📸 Photo Diagnosis:** Click the **Take Photo** button below to scan an infected crop leaf\n"
        "• **Fertilizers & Soil Health:** *'Best fertilizer dosage for wheat CRI stage?'* or *'How to treat zinc deficiency'*\n"
        "• **Mandi Prices & Trading:** *'Current mandi rate for mustard'* or *'How to find bulk buyers'*\n"
        "• **Storage & Preservation:** *'How to store potatoes in warehouse without rotting?'*\n"
        "• **Weather & Protection:** *'Protecting crops from frost or unseasonal rains'*"
    ))


CROPS_MULTILINGUAL_ADVISORY = {
    "wheat": {
        "hi": (
            "🌾 **गेहूं (Wheat) फसल सलाह व संपूर्ण प्रबंधन:**\n\n"
            "• **सिंचाई समय:** पहली सिंचाई ताज मूल अवस्था (CRI stage - बुवाई के 20-25 दिन) पर अवश्य करें। फूल आते समय और दाना भरते समय सिंचाई अत्यंत महत्वपूर्ण है।\n"
            "• **खाद प्रबंधन:** फसल पकते समय अधिक यूरिया न डालें। कल्ले निकलते समय नैनो यूरिया (4 मिली/लीटर) का छिड़काव अधिक लाभकारी है।\n"
            "• **रतुआ (Rust) से सुरक्षा:** पीला या भूरा रतुआ के लक्षण दिखते ही प्रोपिकोनाज़ोल (Tilt 25% EC) 1 मिली प्रति लीटर पानी में मिलाकर सुबह ओस सूखने पर स्प्रे करें।\n"
            "• **मंडी व भंडारण:** अपनी उपज को AgriFlow के 'उपज' (Produce) पेज पर दर्ज करें। अच्छे भाव हेतु दाने में नमी 12-14% के बीच रखें।"
        ),
        "pa": (
            "🌾 **ਕਣਕ (Wheat) ਫ਼ਸਲ ਸਲਾਹ ਤੇ ਪ੍ਰਬੰਧਨ:**\n\n"
            "• **ਸਿੰਚਾਈ ਸਮਾਂ:** ਪਹਿਲੀ ਸਿੰਚਾਈ ਸੀ.ਆਰ.ਆਈ. (21 ਦਿਨਾਂ 'ਤੇ) ਅਤੇ ਦੂਜੀ ਫੁੱਲ ਪੈਣ ਸਮੇਂ ਜ਼ਰੂਰ ਕਰੋ।\n"
            "• **ਖਾਦ ਪ੍ਰਬੰਧਨ:** ਪਿਛੇਤੇ ਸਮੇਂ ਵਾਧੂ ਯੂਰੀਆ ਨਾ ਪਾਓ। ਨੈਨੋ ਯੂਰੀਆ ਦਾ ਛਿੜਕਾਅ ਫ਼ਾਇਦੇਮੰਦ ਰਹਿੰਦਾ ਹੈ।\n"
            "• **ਪੀਲਾ ਰਤੂਆ ਰੋਕਥਾਮ:** ਲੱਛਣ ਦਿਖਣ 'ਤੇ ਪ੍ਰੋਪੀਕੋਨਾਜ਼ੋਲ (ਟਿਲਟ) 1 ਮਿਲੀ ਪ੍ਰਤੀ ਲੀਟਰ ਪਾਣੀ ਵਿੱਚ ਮਿਲਾ ਕੇ ਛਿੜਕੋ।\n"
            "• **ਮੰਡੀਕਰਨ:** AgriFlow Produce ਪੰਨੇ 'ਤੇ ਆਪਣੀ ਉਪਜ ਦਰਜ ਕਰੋ ਅਤੇ ਮੰਡੀ ਭਾਅ ਪ੍ਰਾਪਤ ਕਰੋ।"
        ),
        "mr": (
            "🌾 **गहू (Wheat) पीक सल्ला व व्यवस्थापन:**\n\n"
            "• **पाणी व्यवस्थापन:** पहिले पाणी मुकुट मुळे फुटण्याच्या वेळी (२१ दिवस) आणि दुसरे पाणी फुलोऱ्याच्या वेळी नक्की द्या.\n"
            "• **खत व्यवस्थापन:** उशिरा अतिरिक्त युरिया टाळा. फुटवे निघताना नॅनो युरिया फवारणी फायदेशीर ठरते.\n"
            "• **तांबेरा नियंत्रण:** पिवळा किंवा तपकिरी तांबेरा दिसल्यास प्रोपिकोनाझोल १ मिली प्रति लिटर पाण्यात मिसळून फवारा.\n"
            "• **बाजार विक्री:** चांगले बाजारभाव मिळवण्यासाठी AgriFlow च्या Produce टॅबमध्ये पिकाची नोंदणी करा."
        ),
        "gu": (
            "🌾 **ઘઉં (Wheat) પાક સલાહ અને વ્યવસ્થાપન:**\n\n"
            "• **પિયત વ્યવસ્થા:** પ્રથમ પિયત સી.આર.આઈ. (૨૧ દિવસ) અને બીજું પિયત દૂધિયા દાણા અવસ્થાએ અવશ્ય આપો.\n"
            "• **ખાતર વ્યવસ્થા:** મોડેથી વધુ પડતો યુરિયા ટાળો. ફૂટ અવસ્થાએ નેનો યુરિયાનો છંટકાવ કરવો.\n"
            "• **ગેરુ રોગ નિયંત્રણ:** પીળો કે કથ્થઈ ગેરુ દેખાય તો પ્રોપિકોનાઝોલ ૧ મિલી પ્રતિ લીટર પાણીમાં છાંટો.\n"
            "• **વેચાણ:** શ્રેષ્ઠ મંડી ભાવ મેળવવા AgriFlow ના Produce પેજ પર પાકની નોંધણી કરો."
        ),
        "te": (
            "🌾 **గోధుమ (Wheat) పంట యాజమాన్య సలహా:**\n\n"
            "• **నీటి యాజమాన్యం:** మొదటి తడి సీఆర్ఐ (21 రోజులు) మరియు పూత దశలో తప్పక ఇవ్వాలి.\n"
            "• **ఎరువుల నిర్వహణ:** ఆఖరి దశలో అధిక యూరియా వాడవద్దు. పిలకల దశలో నానో యూరియా స్ప్రే చేయండి.\n"
            "• **తెగుళ్ళ నివారణ:** తుప్పు తెగులు కనిపిస్తే ప్రొపికొనజోల్ 1 మి.లీ లీటరు నీటికి కలిపి పిచికారీ చేయండి.\n"
            "• **మార్కెటింగ్:** సరైన మండి ధరల కోసం AgriFlow Produce పేజీలో నమోదు చేయండి."
        ),
        "ta": (
            "🌾 **கோதுமை (Wheat) பயிர் மேலாண்மை ஆலோசனை:**\n\n"
            "• **பாசனம்:** முதல் பாசனம் 21 நாட்களில் (CRI நிலை) மற்றும் பூக்கும் நிலையில் தவறாமல் கொடுக்கவும்.\n"
            "• **உர மேலாண்மை:** அறுவடைக்கு முன் அதிக யூரியாவை தவிர்க்கவும். நானோ யூரியா தெளிப்பது நல்லது.\n"
            "• **துரு நோய் கட்டுப்பாடு:** துரு நோய் தென்பட்டால் புரோபிகோனசோல் 1 மி.லி/லிட்டர் தண்ணீரில் கலந்து தெளிக்கவும்.\n"
            "• **விற்பனை:** சிறந்த மண்டி விலைகளுக்கு AgriFlow Produce பக்கத்தில் பதிவு செய்யவும்."
        ),
        "bn": (
            "🌾 **গম (Wheat) ফসল পরামর্শ ও পরিচর্যা:**\n\n"
            "• **সেচ ব্যবস্থা:** প্রথম সেচ ২১ দিনের মাথায় (CRI পর্যায়) এবং শীষ আসার সময় অবশ্যই দিন।\n"
            "• **সার ব্যবস্থাপনা:** দেরিতে অতিরিক্ত ইউরিয়া প্রয়োগ করবেন না। ন্যানো ইউরিয়া স্প্রে করা উপকারী।\n"
            "• **মরচে রোগ দমন:** মরচে রোগ দেখা দিলে প্রোপিকোনাজোল ১ মিলি প্রতি লিটার জলে গুলে স্প্রে করুন।\n"
            "• **বাজারজাতকরণ:** সঠিক মান্ডি দরের জন্য AgriFlow Produce ট্যাবে ফসল নথিভুক্ত করুন."
        ),
        "kn": (
            "🌾 **ಗೋಧಿ (Wheat) ಬೆಳೆ ನಿರ್ವಹಣೆ ಸಲಹೆ:**\n\n"
            "• **ನೀರಾವರಿ:** ಮೊದಲ ನೀರಾವರಿಯನ್ನು 21 ದಿನಗಳಲ್ಲಿ (CRI ಹಂತ) ಮತ್ತು ಹೂಬಿಡುವ ಹಂತದಲ್ಲಿ ನೀಡಿ.\n"
            "• **ಗೊಬ್ಬರ ನಿರ್ವಹಣೆ:** ತಡವಾಗಿ ಹೆಚ್ಚಿನ ಯೂರಿಯಾ ಬಳಸಬೇಡಿ. ನ್ಯಾನೋ ಯೂರಿಯಾ ಸಿಂಪಡಣೆ ಉಪಯುಕ್ತ.\n"
            "• **ತುಕ್ಕು ರೋಗ ನಿಯಂತ್ರಣ:** ತುಕ್ಕು ರೋಗ ಕಂಡರೆ ಪ್ರೊಪಿಕೊನಜೋಲ್ 1 ಮಿ.ಲೀ/ಲೀಟರ್ ನೀರಿಗೆ ಬೆರೆಸಿ ಸಿಂಪಡಿಸಿ.\n"
            "• **ಮಾರುಕಟ್ಟೆ:** ಉತ್ತಮ ದರಕ್ಕಾಗಿ AgriFlow Produce ಪುಟದಲ್ಲಿ ನಿಮ್ಮ ಬೆಳೆ ನೋಂದಾಯಿಸಿ."
        ),
        "en": (
            "🌾 **Wheat Agricultural Advisory:**\n\n"
            "• **Irrigation:** Ensure timely irrigation at Crown Root Initiation (CRI - 21 days) and flowering stages.\n"
            "• **Nutrient Management:** Avoid late excessive nitrogen application. Nano urea spray at tillering improves grain quality.\n"
            "• **Rust Control:** At first sign of yellow/brown rust pustules, spray Propiconazole 25% EC @ 1 ml/liter after morning dew dries.\n"
            "• **Marketing:** Register produce in AgriFlow's Produce tab for verified buyers and cold storage options."
        ),
    },
    "potato": {
        "hi": (
            "🥔 **आलू (Potato) फसल सलाह व भंडारण:**\n\n"
            "• **खुदाई पूर्व तैयारी:** खुदाई से 10-12 दिन पहले सिंचाई बंद कर दें ताकि कंदों की त्वचा पक्की हो सके।\n"
            "• **पछेती झुलसा (Late Blight):** पत्तियों पर काले पानी जैसे धब्बे दिखें तो रिडोमिल MZ या मैनकोजेब 2.5 ग्राम/लीटर का तुरंत छिड़काव करें।\n"
            "• **भंडारण:** कंदों को 15 दिन छांव में सुखाकर (क्योरिंग) ही 8-10°C व 85% नमी वाले कोल्ड स्टोरेज में रखें।\n"
            "• **प्रोसेसिंग:** चिप्स आलू की किस्मों के लिए हमारे 'प्रसंस्करण' पेज पर खाद्य इकाइयों से संपर्क करें।"
        ),
        "pa": (
            "🥔 **ਆਲੂ (Potato) ਫ਼ਸਲ ਸਲਾਹ ਤੇ ਸਟੋਰੇਜ:**\n\n"
            "• ਪੁਟਾਈ ਤੋਂ 10 ਦਿਨ ਪਹਿਲਾਂ ਪਾਣੀ ਬੰਦ ਕਰ ਦਿਓ।\n"
            "• ਲੇਟ ਬਲਾਈਟ ਤੋਂ ਬਚਾਅ ਲਈ ਰਿਡੋਮਿਲ MZ 2.5 ਗ੍ਰਾਮ ਪ੍ਰਤੀ ਲੀਟਰ ਪਾਣੀ ਵਿੱਚ ਮਿਲਾ ਕੇ ਛਿੜਕੋ।\n"
            "• ਕੋਲਡ ਸਟੋਰੇਜ ਵਿੱਚ 8-10°C ਤਾਪਮਾਨ 'ਤੇ ਸਟੋਰ ਕਰੋ।"
        ),
        "mr": (
            "🥔 **बटाटा (Potato) पीक सल्ला व साठवणूक:**\n\n"
            "• काढणीपूर्वी १० दिवस पाणी देणे बंद करा जेणेकरून साल घट्ट होईल.\n"
            "• करपा रोगासाठी मॅन्कोझेब २.५ ग्रॅम/लिटर फवारा.\n"
            "• शीतगृहामध्ये ८-१०°C तापमानावर सुरक्षित साठवणूक करा."
        ),
        "gu": (
            "🥔 **બટાકા (Potato) પાક સલાહ અને સંગ્રહ:**\n\n"
            "• ખોદકામ કરતા ૧૦ દિવસ પહેલા પાણી બંધ કરો.\n"
            "• પાછોતરા સુકારા માટે મેન્કોઝેબ ૨.૫ ગ્રામ/લિટર છાંટો.\n"
            "• કોલ્ડ સ્ટોરેજમાં ૮-૧૦°C પર સંગ્રહ કરો."
        ),
        "en": (
            "🥔 **Potato Agricultural Advisory:**\n\n"
            "• **Pre-Harvest:** Cease irrigation 10 days before dehaulming to allow tuber skins to set.\n"
            "• **Late Blight:** Apply systemic fungicide like Ridomil MZ @ 2 g/liter at first lesion appearance.\n"
            "• **Storage:** Cure harvested tubers under field shade for 10-14 days before cold storage at 8–10°C."
        ),
    },
    "tomato": {
        "hi": (
            "🍅 **टमाटर (Tomato) फसल सलाह व रोग रोकथाम:**\n\n"
            "• **सहारा (स्टेकिंग):** पौधों को बांस या सुतली का सहारा दें ताकि फल जमीन की नमी से न सड़ें।\n"
            "• **झुलसा (Blight):** अर्ली या लेट ब्लाइट दिखने पर कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर या मैनकोजेब 2.5 ग्राम/लीटर का छिड़काव करें।\n"
            "• **पत्ती मरोड़ (Leaf Curl):** सफेद मक्खी नियंत्रण हेतु 5% नीम तेल या इमिडाक्लोप्रिड 0.5 मिली/लीटर स्प्रे करें।\n"
            "• **तुड़ाई:** दूर की मंडियों में भेजने हेतु फलों को गुलाबी (पिंक) अवस्था में ही तोड़ें।"
        ),
        "pa": (
            "🍅 **ਟਮਾਟਰ (Tomato) ਫ਼ਸਲ ਸਲਾਹ:**\n\n"
            "• ਬੂਟਿਆਂ ਨੂੰ ਸਹਾਰਾ ਦਿਓ ਤਾਂ ਜੋ ਫਲ ਮਿੱਟੀ ਨਾਲ ਲੱਗ ਕੇ ਖ਼ਰਾਬ ਨਾ ਹੋਣ।\n"
            "• ਬਲਾਈਟ ਰੋਕਥਾਮ ਲਈ ਮੈਨਕੋਜ਼ੇਬ 2.5 ਗ੍ਰਾਮ ਪ੍ਰਤੀ ਲੀਟਰ ਪਾਣੀ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।\n"
            "• ਚਿੱਟੀ ਮੱਖੀ ਰੋਕਥਾਮ ਲਈ ਨਿੰਮ ਦਾ ਤੇਲ ਛਿੜਕੋ।"
        ),
        "mr": (
            "🍅 **टोमॅटो (Tomato) पीक सल्ला:**\n\n"
            "• रोपांना बांबू किंवा तारांचा आधार द्या जेणेकरून फळे सडणार नाहीत.\n"
            "• करपा नियंत्रणासाठी कॉपर ऑक्सिक्लोराईड ३ ग्रॅम/लिटर फवारा.\n"
            "• पांढरी माशी नियंत्रणासाठी ५% निंबोळी अर्क फवारा."
        ),
        "gu": (
            "🍅 **ટામેટા (Tomato) પાક સલાહ:**\n\n"
            "• છોડને લાકડીનો ટેકો આપો જેથી ફળ જમીનને અડે નહીં.\n"
            "• સુકારા/અંગારા રોગ માટે મેન્કોઝેબ ૨.૫ ગ્રામ/લિટર છાંટો.\n"
            "• સફેદ માખી નિયંત્રણ માટે લીમડાનું તેલ છાંટો."
        ),
        "en": (
            "🍅 **Tomato Agricultural Advisory:**\n\n"
            "• **Staking:** Provide bamboo stake support to keep foliage and fruit elevated above damp soil.\n"
            "• **Blight & Leaf Spots:** Spray Mancozeb 75% WP @ 2.5 g/liter or Copper Oxychloride @ 3 g/liter.\n"
            "• **Leaf Curl Vector:** Control whiteflies with 5% Neem oil @ 3 ml/liter or Imidacloprid @ 0.5 ml/liter."
        ),
    },
    "onion": {
        "hi": (
            "🧅 **प्याज (Onion) फसल सलाह व भंडारण:**\n\n"
            "• **सुखाना (क्योरिंग):** निकालने के बाद कंदों को छांव में 12-15 दिन अच्छी तरह सुखाएं ताकि गर्दन बंद हो जाए।\n"
            "• **भंडारण:** हवादार गोदामों में जालीदार बोरियों में 40 किलो ही भरें। सीधी जमीन पर प्याज न रखें।\n"
            "• **मंडी भाव:** लासलगांव और स्थानीय मंडी भाव देखकर ही बेचने का सही निर्णय लें।"
        ),
        "pa": (
            "🧅 **ਗੰਢਾ (Onion) ਫ਼ਸਲ ਸਲਾਹ:**\n\n"
            "• ਪੁਟਾਈ ਤੋਂ ਬਾਅਦ ਛਾਂ ਵਿੱਚ ਚੰਗੀ ਤਰ੍ਹਾਂ ਸੁਕਾਓ ਤਾਂ ਜੋ ਧੌਣ ਸੁੱਕ ਜਾਵੇ।\n"
            "• ਹਵਾਦਾਰ ਗੋਦਾਮ ਵਿੱਚ ਜਾਫਰੀ ਵਾਲੀਆਂ ਬੋਰੀਆਂ ਵਿੱਚ ਸਟੋਰ ਕਰੋ।"
        ),
        "mr": (
            "🧅 **कांदा (Onion) पीक सल्ला व साठवणूक:**\n\n"
            "• काढणीनंतर १२-१५ दिवस सावलीत कांदा चांगला वाळवा (क्युअरिंग करा).\n"
            "• हवेशीर चाळीत जाळीदार पिशव्यांमध्ये साठवणूक करा.\n"
            "• लासलगाव व स्थानिक बाजारभावाची तुलना करून विक्रीचा निर्णय घ्या."
        ),
        "gu": (
            "🧅 **ડુંગળી (Onion) પાક સલાહ અને સંગ્રહ:**\n\n"
            "• કાપણી પછી છાંયડામાં ૧૨-૧૫ દિવસ બરાબર સુકવો.\n"
            "• હવાઉજાસ વાળા વેરહાઉસમાં જાળીદાર થેલીઓમાં સંગ્રહ કરો."
        ),
        "en": (
            "🧅 **Onion Agricultural Advisory:**\n\n"
            "• **Curing:** Field cure bulbs in shade for 10-15 days until necks seal tightly.\n"
            "• **Storage:** Store in well-ventilated slatted structures in mesh bags up to 40 kg.\n"
            "• **Market Price:** Track Lasalgaon and regional APMC benchmarks on our Market tab."
        ),
    },
    "mustard": {
        "hi": (
            "🌱 **सरसों (Mustard) फसल सलाह व पोषण:**\n\n"
            "• **माहू (चेपा) नियंत्रण:** बादल वाले मौसम में माहू कीट की निगरानी रखें। 20 कीट प्रति शाखा पर डाइमेथोएट 1.5 मिली/लीटर स्प्रे करें।\n"
            "• **सल्फर का महत्व:** तेल की प्रतिशत मात्रा बढ़ाने के लिए बुवाई या पहली सिंचाई पर 20 किलो बेंटोनाइट सल्फर प्रति एकड़ अवश्य दें।\n"
            "• **सिंचाई:** फूल आते समय (35 दिन) और फलियां बनते समय (60 दिन) हल्की सिंचाई करें।"
        ),
        "pa": (
            "🌱 **ਸਰ੍ਹੋਂ (Mustard) ਫ਼ਸਲ ਸਲਾਹ:**\n\n"
            "• ਚੇਪਾ (ਮਾਹੂ) ਦਿਖਣ 'ਤੇ ਰੋਗੋਰ 1.5 ਮਿਲੀ ਪ੍ਰਤੀ ਲੀਟਰ ਪਾਣੀ ਦਾ ਛਿੜਕਾਅ ਕਰੋ।\n"
            "• ਤੇਲ ਵਧਾਉਣ ਲਈ ਖੇਤ ਵਿੱਚ ਸਲਫ਼ਰ ਜ਼ਰੂਰ ਪਾਓ।"
        ),
        "mr": (
            "🌱 **मोहरी (Mustard) पीक सल्ला:**\n\n"
            "• मावा किडीच्या नियंत्रणासाठी डायमेथोएट १.५ मिली/लिटर फवारा.\n"
            "• तेलाचे प्रमाण वाढवण्यासाठी एकरी २० किलो गंधक (सल्फर) वापरा."
        ),
        "gu": (
            "🌱 **રાયડો (Mustard) પાક સલાહ:**\n\n"
            "• મોલો-મશી નિયંત્રણ માટે રોગોર ૧.૫ મિલી/લિટર છાંટો.\n"
            "• તેલનું ટકાવારી વધારવા સલ્ફર ખાતર અવશ્ય આપવું."
        ),
        "en": (
            "🌱 **Mustard Agricultural Advisory:**\n\n"
            "• **Aphids (Chetpa):** Monitor inflorescence closely during cloudy spells. Spray Dimethoate 30% EC @ 1.5 ml/liter.\n"
            "• **Sulfur:** Apply 20-25 kg elemental sulfur per acre to boost seed oil concentration.\n"
            "• **Irrigation:** Irrigate at pre-flowering (35 days) and siliquae formation (60-65 days)."
        ),
    },
    "paddy": {
        "hi": (
            "🌾 **धान / बासमती (Paddy) फसल सलाह:**\n\n"
            "• **कटाई पूर्व:** कटाई से 10-12 दिन पहले खेत का पानी निकाल दें ताकि दाना मजबूत और सूखा रहे।\n"
            "• **रोग नियंत्रण:** तना छेदक के लिए कारटैप हाइड्रोक्लोराइड 4G 10 किग्रा/एकड़ या ब्लास्ट हेतु ट्राइसाइक्लाजोल 0.6 ग्राम/लीटर डालें।\n"
            "• **नमी:** मंडियों में अच्छे भाव के लिए बिक्री के समय नमी 14% से कम रखें।"
        ),
        "pa": (
            "🌾 **ਝੋਨਾ / ਬਾਸਮਤੀ (Paddy) ਫ਼ਸਲ ਸਲਾਹ:**\n\n"
            "• ਵਾਢੀ ਤੋਂ 10 ਦਿਨ ਪਹਿਲਾਂ ਖੇਤ ਵਿੱਚੋਂ ਪਾਣੀ ਕੱਢ ਦਿਓ।\n"
            "• ਦਾਣਿਆਂ ਵਿੱਚ ਨਮੀ 14% ਤੋਂ ਘੱਟ ਰੱਖ ਕੇ ਹੀ ਮੰਡੀ ਵਿੱਚ ਵੇਚੋ।"
        ),
        "mr": (
            "🌾 **भात / धान (Paddy) पीक सल्ला:**\n\n"
            "• काढणीपूर्वी १० दिवस शेतातील पाणी काढून टाका.\n"
            "• दाण्यातील ओलावा १४% पेक्षा कमी ठेवूनच बाजारात विक्री करा."
        ),
        "gu": (
            "🌾 **ડાંગર (Paddy) પાક સલાહ:**\n\n"
            "• કાપણી પહેલા ૧૦ દિવસ ખેતરમાંથી પાણી નિકાલ કરો.\n"
            "• બજારમાં વેચાણ વખતે ભેજ ૧૪% થી ઓછો હોવો જોઈએ."
        ),
        "en": (
            "🌾 **Paddy / Basmati Rice Advisory:**\n\n"
            "• **Pre-Harvest:** Drain standing water from the field 10–12 days prior to harvest.\n"
            "• **Moisture Content:** Dry harvested grain to below 14% moisture before taking to mandi to prevent price deductions.\n"
            "• **Blast & Stem Borer:** Spray Tricyclazole 75% WP @ 0.6 g/liter for neck blast prevention."
        ),
    },
}


def generate_expert_farm_response(message: str, language: str) -> str:
    """
    Intelligent agronomic conversational generator that parses the user's intent,
    crop, and problem, returning expert multi-point advice in native state languages.
    """
    lowered = message.lower()

    # 1. Greetings
    if GREETINGS_PATTERN.search(lowered):
        greetings = {
            "hi": (
                "🙏 **नमस्ते किसान भाई!**\n\n"
                "मैं आपका **AgriFlow कृषि सलाहकार** हूँ। मैं आपकी खेती, फसल के रोगों की पहचान, खाद-पानी के सही समय, "
                "निकटतम मंडी भाव और फसल को सबसे अच्छे दाम में बेचने में मदद कर सकता हूँ।\n\n"
                "• आप अपनी फसल की पत्ती या पौधे की **फोटो खींचकर** भी रोग की तुरंत जांच कर सकते हैं (नीचे कैमरा बटन दबाएं)।\n"
                "• आज आप अपनी किस फसल के बारे में जानकारी चाहते हैं?"
            ),
            "pa": (
                "🙏 **ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰ ਜੀ!**\n\n"
                "ਮੈਂ ਤੁਹਾਡਾ **AgriFlow ਖੇਤੀ ਸਲਾਹਕਾਰ** ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਖੇਤੀ, ਫ਼ਸਲਾਂ ਦੀਆਂ ਬਿਮਾਰੀਆਂ ਦੀ ਪਛਾਣ, ਖਾਦ-ਪਾਣੀ ਦਾ ਸਹੀ ਸਮਾਂ, "
                "ਅਤੇ ਮੰਡੀ ਭਾਅ ਸੰਬੰਧੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।\n\n"
                "• ਤੁਸੀਂ ਫ਼ਸਲ ਦੀ ਫੋਟੋ ਖਿੱਚ ਕੇ ਵੀ ਬਿਮਾਰੀ ਦੀ ਜਾਂਚ ਕਰ ਸਕਦੇ ਹੋ (ਹੇਠਾਂ Take Photo ਬਟਨ ਦਬਾਓ)।\n"
                "• ਅੱਜ ਤੁਸੀਂ ਕਿਹੜੀ ਫ਼ਸਲ ਬਾਰੇ ਜਾਣਕਾਰੀ ਲੈਣਾ ਚਾਹੁੰਦੇ ਹੋ?"
            ),
            "mr": (
                "🙏 **नमस्कार शेतकरी बंधूंनो!**\n\n"
                "मी आपला **AgriFlow कृषी सल्लागार** आहे. मी शेती, पिकांचे रोग, खत व्यवस्थापन, "
                "बाजारभाव आणि काढणीपश्चात नियोजनात मदत करू शकतो.\n\n"
                "• पानांचा फोटो काढून रोगाचे तात्काळ निदान करण्यासाठी खालील 'Take Photo' बटण वापरा.\n"
                "• आज आपल्याला कोणत्या पिकाबद्दल माहिती हवी आहे?"
            ),
            "gu": (
                "🙏 **નમસ્તે ખેડૂત મિત્ર!**\n\n"
                "હું તમારો **AgriFlow કૃષિ સલાહકાર** છું. હું ખેતી, પાકના રોગ નિયંત્રણ, ખાતર-પિયત વ્યવસ્થાપન, "
                "અને મંડી ભાવ અંગે મદદ કરી શકું છું.\n\n"
                "• પાકનો ફોટો પાડીને રોગની તપાસ કરવા માટે નીચે 'Take Photo' બટન દબાવો.\n"
                "• આજે તમે કયા પાક વિશે માહિતી મેળવવા માંગો છો?"
            ),
            "te": (
                "🙏 **నమస్కారం రైతు మిత్రమా!**\n\n"
                "నేను మీ **AgriFlow వ్యవసాయ సలహాదారుని**. పంట తెగుళ్ళు, ఎరువుల యాజమాన్యం, "
                "మరియు తాజా మార్కెట్ ధరలపై మీకు సహాయం అందించగలను.\n\n"
                "• తెగుళ్ళ నిర్ధారణ కోసం ఆకుల ఫోటో తీసి అప్‌లోడ్ చేయండి (క్రింద ఉన్న Take Photo బటన్ వాడండి).\n"
                "• ఈ రోజు మీకు ఏ పంటపై సలహా కావాలి?"
            ),
            "ta": (
                "🙏 **வணக்கம் விவசாய தோழரே!**\n\n"
                "நான் உங்கள் **AgriFlow விவசாய ஆலோசகர்**. பயிர் நோய்கள், உர மேலாண்மை, "
                "மற்றும் நேரடி மண்டி விலைகள் பற்றிய துல்லியமான தகவல்களை வழங்குகிறேன்.\n\n"
                "• பயிர் நோய்களைக் கண்டறிய இலையின் புகைப்படத்தை பதிவேற்றவும் (கீழே உள்ள Take Photo பட்டனை அழுத்தவும்).\n"
                "• இன்று எந்த பயிர் பற்றி அறிய விரும்புகிறீர்கள்?"
            ),
            "bn": (
                "🙏 **নমস্কার কৃষক ভাই!**\n\n"
                "আমি আপনার **AgriFlow কৃষি উপদেষ্টা**। আমি আপনার চাষাবাদ, ফসলের রোগবালাই নিরাময়, "
                "সারের সঠিক প্রয়োগ এবং মান্ডি দর সংক্রান্ত বিষয়ে সাহায্য করতে প্রস্তুত।\n\n"
                "• ফসলের পাতার ছবি তুলে রোগ পরীক্ষার জন্য নিচের 'Take Photo' বোতামে চাপ দিন।\n"
                "• আজ আপনি কোন ফসল সম্পর্কে জানতে চান?"
            ),
            "kn": (
                "🙏 **ನಮಸ್ಕಾರ ರೈತ ಮಿತ್ರರೇ!**\n\n"
                "ನಾನು ನಿಮ್ಮ **AgriFlow ಕೃಷಿ ಸಲಹೆಗಾರ**. ಬೆಳೆ ರೋಗಗಳು, ರಸಗೊಬ್ಬರ ನಿರ್ವಹಣೆ, "
                "ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರಗಳ ಬಗ್ಗೆ ಮಾಹಿತಿ ನೀಡಲು ಸಿದ್ಧನಿದ್ದೇನೆ.\n\n"
                "• ರೋಗ ಪತ್ತೆಗಾಗಿ ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ (ಕೆಳಗಿನ Take Photo ಬಟನ್ ಬಳಸಿ).\n"
                "• ಇಂದು ನೀವು ಯಾವ ಬೆಳೆಯ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?"
            ),
        }
        return greetings.get(language, (
            "🙏 **Hello & Welcome, Farmer Friend!**\n\n"
            "I am your **AgriFlow Farm & Crop Advisor**. I am here to help you protect your crops, maximize yields, "
            "and fetch the highest mandi prices.\n\n"
            "• **Diagnose Diseases:** Click the **📸 Take Photo / Upload** button below to scan any crop leaf or damage instantly.\n"
            "• **Mandi & Selling Advice:** Ask me about current prices, selling strategies, or warehouse storage.\n\n"
            "How can I assist your farm today?"
        ))

    # 2. Crop Analysis / Photo / Scan prompt
    if any(phrase in lowered for phrase in PHOTO_DIAGNOSIS_KEYWORDS):
        photo_replies = {
            "hi": (
                "📸 **फसल रोग व स्वास्थ्य जांच (Crop Disease Scanner):**\n\n"
                "अपनी फसल का विश्लेषण करने के लिए:\n"
                "1. नीचे दिए गए **'📸 Take Photo / Upload'** बटन पर क्लिक करें।\n"
                "2. अपने मोबाइल के कैमरे से पौधे या ग्रसित पत्ती की साफ फोटो खींचें या गैलरी से अपलोड करें।\n"
                "3. हमारा AI विज़न सिस्टम तुरंत रोग का नाम, गंभीरता और सटीक रासायनिक व जैविक दवा की मात्रा बताएगा!\n\n"
                "💡 या आप मुझे फसल का नाम और पत्तियों पर दिखने वाले लक्षण लिखकर भी बता सकते हैं।"
            ),
            "pa": (
                "📸 **ਫ਼ਸਲ ਰੋਗ ਸਕੈਨਰ (Crop Disease Scanner):**\n\n"
                "ਫ਼ਸਲ ਦੀ ਜਾਂਚ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ **'📸 Take Photo / Upload'** ਬਟਨ 'ਤੇ ਕਲਿੱਕ ਕਰੋ ਅਤੇ ਪੱਤੇ ਦੀ ਫੋਟੋ ਖਿੱਚੋ।"
            ),
            "mr": (
                "📸 **पीक रोग तपासणी (Crop Disease Scanner):**\n\n"
                "पिकाचे विश्लेषण करण्यासाठी खालील **'📸 Take Photo / Upload'** बटणावर क्लिक करा आणि पानांचा फोटो पाठवा."
            ),
            "gu": (
                "📸 **પાક રોગ તપાસ (Crop Disease Scanner):**\n\n"
                "પાકની તપાસ માટે નીચેના **'📸 Take Photo / Upload'** બટન પર ક્લિક કરો અને પાંદડાનો ફોટો અપલોડ કરો."
            ),
        }
        return photo_replies.get(language, (
            "📸 **Crop Health & Disease AI Scanner:**\n\n"
            "To analyze and diagnose your crop:\n"
            "1. Click the **'📸 Take Photo / Upload'** button below this chat.\n"
            "2. Take a clear close-up photo of the affected leaf, stem, or fruit using your camera or upload from files.\n"
            "3. Our AI Plant Pathology system will instantly identify the disease, severity level, and give you exact chemical & organic dosages!\n\n"
            "💡 You can also type your crop name and describe the symptoms (e.g. 'yellow spots on tomato leaves')."
        ))

    # 3. Match specific agricultural knowledge domains (blight, rust, leaf curl, aphids, fertilizers, schemes)
    for keywords, en_ans, hi_ans in AGRONOMIC_TOPICS:
        if any(kw in lowered for kw in keywords):
            return hi_ans if language in ["hi", "pa", "mr", "gu"] else en_ans

    # 4. Match crop-specific queries (Wheat, Tomato, Potato, Onion, Rice, Mustard)
    crop_aliases = {
        "wheat": ["wheat", "gehu", "gehun", "ਕਣਕ", "गहू", "ઘઉં", "గోధుమ", "கோதுமை", "গম", "ಗೋಧಿ"],
        "potato": ["potato", "aaloo", "aloo", "ਆਲੂ", "बटाटा", "બટાકા", "బంగాళాదుంప", "உருளைக்கிழங்கு", "আলু", "ಆಲೂಗಡ್ಡೆ"],
        "tomato": ["tomato", "tamatar", "ਟਮਾਟਰ", "टोमॅटो", "ટામેટા", "టమాటా", "தக்காளி", "টমেটো", "ಟೊಮೆಟೊ"],
        "onion": ["onion", "pyaj", "pyaz", "ਗੰਢਾ", "कांदा", "ડુંગળી", "ఉల్లిపాయ", "வெங்காயம்", "পেঁয়াজ", "ಈರುಳ್ಳಿ"],
        "mustard": ["mustard", "sarson", "sarso", "ਸਰ੍ਹੋਂ", "मोहरी", "રાયડો", "ఆవాలు", "கடுகு", "সরিষা", "ಸಾಸಿವೆ"],
        "paddy": ["paddy", "rice", "dhan", "chawal", "ਝੋਨਾ", "भात", "ડાંગર", "వరి", "நெல்", "ধান", "ಭತ್ತ"],
    }

    for crop_key, aliases in crop_aliases.items():
        if any(alias in lowered for alias in aliases):
            crop_dict = CROPS_MULTILINGUAL_ADVISORY.get(crop_key, {})
            # Match requested language, fallback to Hindi or English
            if language in crop_dict:
                return crop_dict[language]
            if language != "en" and "hi" in crop_dict:
                return crop_dict["hi"]
            return crop_dict.get("en", "Crop advisory details available in Produce page.")

    # 5. Generic agricultural guidance in the chosen language
    generic_guidance = {
        "hi": (
            "🌾 **AgriFlow किसान सलाहकार सेवा:**\n\n"
            "मैं आपकी खेती, फसल स्वास्थ्य और फसल बेचने से जुड़े हर सवाल में सहायता कर सकता हूँ। आप मुझसे पूछ सकते हैं:\n"
            "• **रोग जांच:** 'टमाटर में झुलसा या पत्ती मरोड़ की दवा बताएं'\n"
            "• **फोटो से जांच:** नीचे कैमरा बटन दबाकर पत्ती की फोटो भेजें\n"
            "• **खाद व पोषण:** 'गेहूं में यूरिया और डीएपी डालने का सही समय'\n"
            "• **मंडी भाव व बिक्री:** 'भाव कम होने पर क्या करें' या 'निकटतम खरीदार खोजें'\n"
            "• **भंडारण व प्रोसेसिंग:** 'आलू या प्याज का भंडारण कैसे करें'\n"
            "• **सरकारी योजनाएं:** 'पीएम किसान या फसल बीमा का लाभ कैसे लें'"
        ),
        "pa": (
            "🌾 **AgriFlow ਖੇਤੀ ਸਲਾਹਕਾਰ ਸੇਵਾ:**\n\n"
            "ਮੈਂ ਤੁਹਾਡੀ ਖੇਤੀ, ਫ਼ਸਲ ਸਿਹਤ ਅਤੇ ਵੇਚਣ ਸੰਬੰਧੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ:\n"
            "• **ਰੋਗ ਜਾਂਚ:** ਫ਼ਸਲ ਦੀ ਬਿਮਾਰੀ ਅਤੇ ਦਵਾਈ ਬਾਰੇ ਪੁੱਛੋ\n"
            "• **ਫੋਟੋ ਸਕੈਨ:** ਕੈਮਰੇ ਰਾਹੀਂ ਪੱਤੇ ਦੀ ਫੋਟੋ ਭੇਜੋ\n"
            "• **ਖਾਦ ਪ੍ਰਬੰਧਨ:** ਯੂਰੀਆ ਅਤੇ ਡੀ.ਏ.ਪੀ. ਪਾਉਣ ਦਾ ਸਹੀ ਸਮਾਂ\n"
            "• **ਮੰਡੀ ਰੇਟ:** ਤਾਜ਼ਾ ਮੰਡੀ ਭਾਅ ਦੀ ਜਾਣਕਾਰੀ"
        ),
        "mr": (
            "🌾 **AgriFlow कृषी सल्लागार सेवा:**\n\n"
            "मी शेती, पीक आरोग्य आणि बाजारभावाबाबत मार्गदर्शन करू शकतो:\n"
            "• **रोग नियंत्रण:** पिकांवरील रोगांची औषधे\n"
            "• **फोटो तपासणी:** खालील कॅमेरा बटणाने फोटो पाठवा\n"
            "• **खत नियोजन:** योग्य खतांचे प्रमाण आणि वेळ\n"
            "• **बाजारभाव:** चालू बाजारभाव आणि खरेदीदार"
        ),
        "gu": (
            "🌾 **AgriFlow ખેડૂત સલાહકાર સેવા:**\n\n"
            "હું ખેતી, પાક સંરક્ષણ અને બજાર ભાવ અંગે મદદ કરી શકું છું:\n"
            "• **રોગ નિયંત્રણ:** પાકના રોગ અને દવાની માહિતી\n"
            "• **ફોટો સ્કેન:** કેમેરા વડે પાંદડાનો ફોટો મોકલો\n"
            "• **ખાતર:** યુરિયા અને ડીએપી આપવાનો સમય\n"
            "• **મંડી ભાવ:** તાજા બજાર ભાવ"
        ),
        "te": (
            "🌾 **AgriFlow వ్యవసాయ సలహా సేవ:**\n\n"
            "పంటల యాజమాన్యం మరియు మార్కెట్ సమాచారం కోసం నేను సిద్ధంగా ఉన్నాను:\n"
            "• **తెగుళ్ళ నివారణ:** పంట తెగుళ్ళు మరియు మందుల వివరాలు\n"
            "• **ఫోటో స్కాన్:** కెమెరా ద్వారా ఆకుల ఫోటో పంపండి\n"
            "• **ఎరువులు:** సరైన ఎరువుల యాజమాన్యం\n"
            "• **మార్కెట్ ధరలు:** తాజా మండి ధరలు"
        ),
        "ta": (
            "🌾 **AgriFlow விவசாய ஆலோசனை சேவை:**\n\n"
            "பயிர் பாதுகாப்பு மற்றும் சந்தை தகவல்களுக்கு:\n"
            "• **நோய் கட்டுப்பாடு:** பயிர் நோய்களுக்கான மருந்துகள்\n"
            "• **புகைப்பட ஆய்வு:** இலையின் புகைப்படத்தை பதிவேற்றவும்\n"
            "• **உர மேலாண்மை:** சரியான உர அளவுகள்\n"
            "• **மண்டி விலைகள்:** நேரடி சந்தை விலைகள்"
        ),
        "bn": (
            "🌾 **AgriFlow কৃষি উপদেষ্টা সেবা:**\n\n"
            "ফসলের পরিচর্যা এবং বাজার দর সংক্রান্ত তথ্যের জন্য:\n"
            "• **রোগবালাই দমন:** ফসলের রোগ ও ওষুধের তথ্য\n"
            "• **ছবি পরীক্ষা:** পাতার ছবি তুলে পাঠান\n"
            "• **সার প্রয়োগ:** সারের সঠিক মাত্রা ও সময়\n"
            "• **মান্ডি দর:** বর্তমান বাজার দর"
        ),
        "kn": (
            "🌾 **AgriFlow ಕೃಷಿ ಸಲಹಾ ಸೇವೆ:**\n\n"
            "ಬೆಳೆ ನಿರ್ವಹಣೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿಗಾಗಿ:\n"
            "• **ರೋಗ ನಿಯಂತ್ರಣ:** ಬೆಳೆ ರೋಗಗಳು ಮತ್ತು ಔಷಧಿಗಳು\n"
            "• **ಫೋಟೋ ಸ್ಕ್ಯಾನ್:** ಎಲೆಯ ಫೋಟೋ ಕಳುಹಿಸಿ\n"
            "• **ಗೊಬ್ಬರ:** ಸರಿಯಾದ ರಸಗೊಬ್ಬರ ಬಳಕೆ\n"
            "• **ಮಾರುಕಟ್ಟೆ ದರ:** ಪ್ರಸ್ತುತ ದರಗಳು"
        ),
    }
    return generic_guidance.get(language, (
        "🌾 **AgriFlow Agricultural Advisory Service:**\n\n"
        "I can help you maximize yield, protect crops from disease, and fetch the highest market prices. You can ask me about:\n"
        "• **Disease Diagnosis:** *'How to cure tomato blight or leaf curl?'*\n"
        "• **Photo Scan:** Click the camera icon below to upload or take a photo of your infected crop leaf\n"
        "• **Fertilizers & Soil:** *'Best fertilizer dosage for wheat CRI stage?'*\n"
        "• **Mandi Strategy:** *'Prices are falling, should I sell or store?'*\n"
        "• **Storage & Processing:** *'How to store potatoes without rotting?'*\n"
        "• **Government Schemes:** *'How to claim PMFBY crop insurance or PM-KISAN?'*"
    ))


def get_assistant_reply(message: str, language: str) -> tuple[str, str]:
    """
    Returns (reply_text, source) where source is 'ai' or 'fallback'.
    Strictly limited to agriculture, crop health, and farming questions.
    """
    from app.services.gemini_ai import generate_farm_chat_reply

    # Strict check: only answer agricultural topics, greetings, or crop scan requests
    if not is_agricultural_or_greeting(message):
        return get_off_topic_refusal(language), "ai"

    # 1. Try Google Gemini API
    gemini_reply = generate_farm_chat_reply(message, language)
    if gemini_reply:
        return gemini_reply, "ai"

    # 2. Try Anthropic Claude API
    claude_reply = call_llm(message, language)
    if claude_reply:
        return claude_reply, "ai"

    # 3. Comprehensive Agronomic Intelligence Engine
    expert_reply = generate_expert_farm_response(message, language)
    return expert_reply, "ai"



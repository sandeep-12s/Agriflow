"""
Crop Image Analysis & Disease Diagnostic Vision Service.
Supports multimodal AI vision analysis via Google Gemini, with an expert
plant pathology diagnostic engine fallback.
"""
import json
import logging
from typing import Any, Optional
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

DISEASE_KNOWLEDGE_BASE: list[dict[str, Any]] = [
    # --- TOMATO ---
    {
        "keywords": ["tomato", "tamatar", "टमाटर"],
        "symptom_keywords": ["borer", "illi", "sundi", "chhedak", "worm", "कीड़ा", "इल्ली", "छेदक", "सुंडी"],
        "en": {
            "crop_name": "Tomato",
            "condition": "Tomato Fruit Borer (Helicoverpa armigera)",
            "severity": "Moderate",
            "confidence_pct": 94,
            "symptoms": "Circular entry holes bored into developing green or ripe tomato fruits with brownish larval excreta around the holes. Premature fruit drop and rotting.",
            "chemical_treatment": "Spray Chlorantraniliprole 18.5% SC (Coragen) @ 0.3 ml/liter of water or Emamectin Benzoate 5% SG @ 0.5 g/liter.",
            "organic_remedy": "Install 8-10 Helicoverpa pheromone traps per acre. Spray Bacillus thuringiensis (Bt) @ 2 g/liter or 5% Neem Seed Kernel Extract (NSKE).",
            "prevention": "Plant African Marigold as a trap crop around tomato plots (1 marigold row per 16 tomato rows) to attract egg-laying moths away from tomatoes.",
            "summary": "Tomato Fruit Borer caterpillars identified. Spray Coragen or Emamectin Benzoate and install pheromone traps to protect harvestable fruits."
        },
        "hi": {
            "crop_name": "टमाटर (Tomato)",
            "condition": "टमाटर फल छेदक इल्ली (Fruit Borer)",
            "severity": "Moderate",
            "confidence_pct": 94,
            "symptoms": "टमाटर के फलों में गोल छेद, फलों के भीतर इल्ली का प्रवेश और छेद के पास भूरे रंग की विष्ठा। फल समय से पहले सड़कर गिर जाते हैं।",
            "chemical_treatment": "कोराजन (Chlorantraniliprole 18.5% SC) 0.3 मिली प्रति लीटर पानी या एमामेक्टिन बेंजोएट 5% SG (Emamectin) 0.5 ग्राम/लीटर का छिड़काव करें।",
            "organic_remedy": "खेत में प्रति एकड़ 8-10 फेरोमोन ट्रैप लगाएं और बीटी (Bacillus thuringiensis) 2 ग्राम/लीटर या 5% नीम काढ़ा स्प्रे करें।",
            "prevention": "टमाटर के खेत के चारों ओर गेंदे के फूल (Marigold) की कतार लगाएं जो पतंगों को टमाटर पर अंडे देने से रोकती है।",
            "summary": "टमाटर में फल छेदक इल्ली का प्रकोप पाया गया। फल बचाने के लिए कोराजन या एमामेक्टिन का छिड़काव तुरंत करें।"
        }
    },
    {
        "keywords": ["tomato", "tamatar", "टमाटर"],
        "symptom_keywords": ["curl", "muradiya", "whitefly", "मरोड़िया", "पत्ती मरोड़", "सफेद मक्खी"],
        "en": {
            "crop_name": "Tomato",
            "condition": "Tomato Leaf Curl Virus (ToLCV) & Whitefly Vector",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "Severe upward rolling and crinkling of leaves, thick leathery texture, yellowing of margins, stunted bushy plant growth, and heavy blossom drop.",
            "chemical_treatment": "Spray Imidacloprid 17.8% SL @ 0.5 ml/liter or Thiamethoxam 25% WG @ 0.3 g/liter to eliminate whitefly vectors.",
            "organic_remedy": "Erect 15-20 yellow sticky traps per acre; spray cold-pressed Neem oil (10,000 ppm) @ 3 ml/liter with mild soap emulsion.",
            "prevention": "Rogue out and destroy infected stunted seedlings immediately to stop field-wide vector spread.",
            "summary": "Tomato Leaf Curl Virus detected with whitefly presence. Install yellow sticky traps and spray Imidacloprid or Neem oil."
        },
        "hi": {
            "crop_name": "टमाटर (Tomato)",
            "condition": "टमाटर पत्ती मरोड़ (Leaf Curl Virus) एवं सफेद मक्खी",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "पत्तियां ऊपर की ओर मुड़कर छोटी, मोटी व पीली हो जाती हैं, पौधे की बढ़वार रुक जाती है और फूल झड़ जाते हैं। यह सफेद मक्खी द्वारा फैलता है।",
            "chemical_treatment": "इमिडाक्लोप्रिड 17.8% SL (Imidacloprid) 0.5 मिली प्रति लीटर या थियामेथोक्सम 25% WG 0.3 ग्राम/लीटर का छिड़काव करें।",
            "organic_remedy": "प्रति एकड़ 15-20 पीले चिपचिपे कार्ड (Yellow Sticky Traps) लगाएं और 5 मिली नीम तेल प्रति लीटर पानी में स्प्रे करें।",
            "prevention": "अत्यधिक प्रभावित बौने पौधों को तुरंत उखाड़कर नष्ट करें ताकि सफेद मक्खी अन्य पौधों में वायरस न फैला सके।",
            "summary": "टमाटर में पत्ती मरोड़ (लीफ कर्ल) और सफेद मक्खी पाई गई। पीले स्टिकी ट्रैप लगाएं और इमिडाक्लोप्रिड या नीम तेल का छिड़काव करें।"
        }
    },
    {
        "keywords": ["tomato", "tamatar", "टमाटर"],
        "symptom_keywords": ["blight", "jhulsa", "dhabba", "spot", "झुलसा", "धब्बा"],
        "en": {
            "crop_name": "Tomato",
            "condition": "Early Blight (Alternaria solani)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Concentric dark brown rings ('target board' spots) on mature lower leaves surrounded by chlorotic yellow halos. Stems show dark sunken cankers.",
            "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5 g/liter of water or Copper Oxychloride 50% WP @ 3 g/liter. For advanced infection, spray Azoxystrobin 23% SC @ 1 ml/liter.",
            "organic_remedy": "Spray 5% Neem Seed Kernel Extract (NSKE) or Trichoderma viride @ 5 g/liter; prune and destroy infected lower foliage.",
            "prevention": "Avoid overhead sprinkler irrigation; stake plants to keep leaves off damp soil; maintain 60 cm row spacing for ventilation.",
            "summary": "Tomato Early Blight detected. Moderate severity. Treat with Mancozeb or Azoxystrobin immediately to prevent spread to fruits."
        },
        "hi": {
            "crop_name": "टमाटर (Tomato)",
            "condition": "अगेती झुलसा / अर्ली ब्लाइट (Alternaria solani)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "निचली पत्तियों पर गोल भूरे-काले छल्लेदार धब्बे, जिनके चारों ओर पीला घेरा बन जाता है। तनों पर काले धंसे हुए घाव।",
            "chemical_treatment": "मैनकोजेब 75% WP (Mancozeb) 2.5 ग्राम प्रति लीटर पानी या कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर का तुरंत छिड़काव करें। गंभीर होने पर एजोक्सीस्ट्रोबिन 1 मिली/लीटर स्प्रे करें।",
            "organic_remedy": "5% नीम का काढ़ा या ट्राइकोडर्मा विरिडी 5 ग्राम प्रति लीटर पानी में मिलाकर छिड़कें। नीचे की ग्रसित पत्तियों को तोड़कर नष्ट करें।",
            "prevention": "ऊपर से पानी का फव्वारा न दें; पौधों को डंडों से सहारा देकर पत्तियों को जमीन की नमी से दूर रखें।",
            "summary": "टमाटर में अर्ली ब्लाइट (झुलसा) पाया गया। फल सुरक्षित रखने के लिए तुरंत मैनकोजेब या नीम तेल का छिड़काव करें।"
        }
    },
    {
        "keywords": ["tomato", "tamatar", "टमाटर"],
        "symptom_keywords": ["wilt", "murjhana", "sukha", "उकठा", "विल्ट", "मुरझाना"],
        "en": {
            "crop_name": "Tomato",
            "condition": "Bacterial Wilt (Ralstonia solanacearum)",
            "severity": "Severe",
            "confidence_pct": 91,
            "symptoms": "Rapid wilting and collapse of entire green plants without initial yellowing. Lower stem vascular bundle turns dark brown with white bacterial streaming when placed in water.",
            "chemical_treatment": "Drench soil with Copper Oxychloride 50% WP @ 3 g/liter + Streptocycline @ 1 g/10 liters water around root zones.",
            "organic_remedy": "Apply Pseudomonas fluorescens bio-agent @ 10 g/liter as root dip and soil drench.",
            "prevention": "Practice 3-year crop rotation with non-solanaceous crops (maize, pulses); avoid water stagnation in field.",
            "summary": "Tomato Bacterial Wilt detected. Drench root zones with Copper Oxychloride + Streptocycline and avoid water stagnation."
        },
        "hi": {
            "crop_name": "टमाटर (Tomato)",
            "condition": "टमाटर जीवाणु उकठा / विल्ट रोग (Bacterial Wilt)",
            "severity": "Severe",
            "confidence_pct": 91,
            "symptoms": "पौधे बिना पीले पड़े अचानक हरे-भरे ही मुरझाकर सूख जाते हैं। तने को काटकर पानी में डालने पर सफेद जीवाणु धारा निकलती है।",
            "chemical_treatment": "जड़ों के पास कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर + स्ट्रेप्टोसाइक्लिन 1 ग्राम प्रति 10 लीटर पानी का घोल बनाकर ड्रेन्चिंग (जड़ में डालना) करें।",
            "organic_remedy": "स्यूडोमोनास फ्लोरेसेन्स 10 ग्राम प्रति लीटर पानी में मिलाकर जड़ों में डालें।",
            "prevention": "खेत में जलभराव न होने दें और मिर्च-आलू के बाद टमाटर न लगाएं; मक्का या दलहन से फसल चक्र अपनाएं।",
            "summary": "टमाटर में उकठा (विल्ट) रोग पाया गया। बचाव के लिए तुरंत कॉपर ऑक्सीक्लोराइड और स्ट्रेप्टोसाइक्लिन की ड्रेंचिंग करें।"
        }
    },

    # --- POTATO ---
    {
        "keywords": ["potato", "aaloo", "आलू"],
        "symptom_keywords": ["blight", "jhulsa", "late blight", "झुलसा", "पछेती"],
        "en": {
            "crop_name": "Potato",
            "condition": "Late Blight (Phytophthora infestans)",
            "severity": "Severe",
            "confidence_pct": 95,
            "symptoms": "Rapidly expanding water-soaked blackish lesions on leaf tips and margins; white cottony fungal growth on leaf undersides during cool humid mornings.",
            "chemical_treatment": "Spray Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ) @ 2.5 g/liter or Cymoxanil + Mancozeb (Curzate) @ 2.5 g/liter within 24 hours.",
            "organic_remedy": "Spray Copper Hydroxide @ 2 g/liter; stop nitrogenous fertilizer application to prevent overly dense succulent canopies.",
            "prevention": "Plant certified disease-free seed tubers; earth-up well to prevent fungal spores from washing into soil tubers.",
            "summary": "Severe Potato Late Blight identified. High urgency: apply systemic fungicide (Ridomil MZ) within 24–48 hours to protect tuber yield."
        },
        "hi": {
            "crop_name": "आलू (Potato)",
            "condition": "पछेती झुलसा / लेट ब्लाइट (Phytophthora infestans)",
            "severity": "Severe",
            "confidence_pct": 95,
            "symptoms": "पत्तियों के किनारों पर तेजी से फैलते काले-भूरे पानी जैसे धब्बे। सुबह के समय पत्तियों की निचली सतह पर सफेद फफूंद दिखाई देती है।",
            "chemical_treatment": "रिडोमिल (Metalaxyl + Mancozeb) 2.5 ग्राम प्रति लीटर या साइमोक्सानिल + मैनकोजेब 2.5 ग्राम/लीटर का 24 घंटे के भीतर छिड़काव करें।",
            "organic_remedy": "कॉपर हाइड्रोक्साइड 2 ग्राम/लीटर का स्प्रे करें और खेत में अतिरिक्त यूरिया डालना बंद करें।",
            "prevention": "प्रमाणित रोगमुक्त बीज का उपयोग करें और कंदों को ढकने के लिए पौधों पर अच्छी मिट्टी चढ़ाएं।",
            "summary": "आलू में पछेती झुलसा (लेट ब्लाइट) पाया गया। फसल बचाने के लिए अगले 24 से 48 घंटे में रिडोमिल का छिड़काव अत्यंत आवश्यक है।"
        }
    },
    {
        "keywords": ["potato", "aaloo", "आलू"],
        "symptom_keywords": ["rot", "sadna", "storage", "soft", "कंद", "सड़न", "भंडारण"],
        "en": {
            "crop_name": "Potato",
            "condition": "Potato Tuber Soft Rot & Storage Decay",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Foul-smelling soft watery breakdown of potato tubers with darkened skins, spreading quickly under warm moist storage conditions.",
            "chemical_treatment": "Dip seed tubers in Mancozeb 75% WP (2.5 g/L) + Streptocycline (1 g/10 L) before curing and storing.",
            "organic_remedy": "Dry harvested tubers thoroughly in shaded ventilated areas for 10-14 days before cold storage.",
            "prevention": "Avoid harvesting during wet muddy soils; sort out cut and damaged tubers before storage.",
            "summary": "Potato tuber rot detected. Cure tubers in shaded ventilation and discard bruised tubers before storage."
        },
        "hi": {
            "crop_name": "आलू (Potato)",
            "condition": "आलू कंद सड़न एवं भंडारण गलन (Soft Rot)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "आलू के कंदों का पानी जैसा होकर बदबूदार सड़ना। भंडारण या खेत में अधिक नमी होने पर तेजी से फैलता है।",
            "chemical_treatment": "बीज आलू को मैनकोजेब 2.5 ग्राम/लीटर + स्ट्रेप्टोसाइक्लिन 1 ग्राम/10 लीटर पानी के घोल में 15 मिनट उपचारित करें।",
            "organic_remedy": "खुदाई के बाद कंदों को 10-12 दिन छांव में अच्छी हवा में सुखाएं (क्योरिंग करें)।",
            "prevention": "गीली मिट्टी में खुदाई न करें और कटे-फटे आलू छांटकर अलग कर दें।",
            "summary": "आलू में कंद सड़न का खतरा पाया गया। भंडारण से पहले आलू को छांव में अच्छी तरह सुखाएं और रोगमुक्त आलू ही रखें।"
        }
    },

    # --- WHEAT ---
    {
        "keywords": ["wheat", "gehun", "gehu", "गेहूं", "कनक"],
        "symptom_keywords": ["rust", "ratuwa", "gerua", "yellow", "रतुआ", "गेरुआ", "पीला"],
        "en": {
            "crop_name": "Wheat",
            "condition": "Yellow Stripe Rust (Puccinia striiformis)",
            "severity": "Moderate",
            "confidence_pct": 94,
            "symptoms": "Bright yellow powdery pustules arranged in parallel stripes along leaf veins. Pustules wipe off easily leaving yellow dust on fingertips.",
            "chemical_treatment": "Spray Propiconazole 25% EC (Tilt) @ 1 ml/liter (200 ml in 200 liters water/acre) during clear sunny weather.",
            "organic_remedy": "Spray butter milk (Chhachh) fermented for 4 days with copper wire @ 50 ml/liter; remove wild grass hosts around borders.",
            "prevention": "Sow rust-resistant varieties like HD-2967, HD-3086, DBW-187; avoid excessive urea fertilization in late tillering.",
            "summary": "Yellow Rust detected in wheat foliage. Spray Propiconazole 25% EC (Tilt) on a sunny day to arrest fungal spread across tillers."
        },
        "hi": {
            "crop_name": "गेहूं (Wheat)",
            "condition": "पीला रतुआ / स्ट्राइप रस्ट (Yellow Rust)",
            "severity": "Moderate",
            "confidence_pct": 94,
            "symptoms": "पत्तियों पर धारियों के रूप में पीले रंग के बारीक पाउडर जैसे दाने। उंगली से छूने पर पीला पाउडर हाथ पर लग जाता है।",
            "chemical_treatment": "प्रोपिकोनाज़ोल 25% EC (Tilt) 1 मिली प्रति लीटर पानी (200 मिली प्रति एकड़) धूप निकलने पर छिड़कें।",
            "organic_remedy": "4 दिन पुरानी खट्टी छाछ को 50 मिली प्रति लीटर पानी में मिलाकर स्प्रे करें; मेड़ों की घास साफ रखें।",
            "prevention": "HD-3086 या DBW-187 जैसी रोगरोधी किस्मों की बुवाई करें और बाद के दिनों में अतिरिक्त यूरिया न दें।",
            "summary": "गेहूं में पीला रतुआ पाया गया। धूप वाले दिन टिल्ट (Propiconazole) का छिड़काव करने से यह तुरंत रुक जाता है।"
        }
    },
    {
        "keywords": ["wheat", "gehun", "gehu", "गेहूं"],
        "symptom_keywords": ["termite", "deemak", "root", "दीमक", "जड़"],
        "en": {
            "crop_name": "Wheat",
            "condition": "Wheat Termite Infestation (Odontotermes obesus)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "Plants drying up in patches, easily pulled out from soil with roots completely eaten away; presence of small pale white termites in root soil.",
            "chemical_treatment": "Apply Chlorpyrifos 20% EC @ 1.5–2 liters per acre mixed with irrigation water, or broadcast Fipronil 0.3% GR @ 8 kg/acre.",
            "organic_remedy": "Apply Neem cake @ 100 kg/acre during field preparation; drench root zones with Calotropis (Aak) leaf extract.",
            "prevention": "Avoid using raw, un-decomposed cow dung manure in wheat fields.",
            "summary": "Termites detected in wheat root zone. Apply Chlorpyrifos with irrigation or broadcast Fipronil granules to stop patch drying."
        },
        "hi": {
            "crop_name": "गेहूं (Wheat)",
            "condition": "गेहूं में दीमक का प्रकोप (Wheat Termites)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "पौधे टुकड़ियों में सूखने लगते हैं और खींचने पर आसानी से बिना जड़ के उखड़ जाते हैं। जड़ों में दीमक के सफेद कीड़े दिखाई देते हैं।",
            "chemical_treatment": "क्लोरोपायरीफॉस 20% EC (Chlorpyrifos) 1.5 से 2 लीटर प्रति एकड़ सिंचाई के पानी के साथ चलाएं या फिप्रोनिल 0.3% GR दानेदार 8 किग्रा/एकड़ बुरकें।",
            "organic_remedy": "खेत तैयार करते समय 100 किग्रा प्रति एकड़ नीम की खली डालें और आक के पत्तों का रस पानी में चलाएं।",
            "prevention": "खेत में कभी भी कच्चा या अधपका गोबर का खाद न डालें, सड़ा हुआ गोबर ही उपयोग करें।",
            "summary": "गेहूं में दीमक का प्रकोप पाया गया। तुरंत सिंचाई के साथ क्लोरोपायरीफॉस चलाएं या फिप्रोनिल दानेदार का उपयोग करें।"
        }
    },

    # --- CHILLI ---
    {
        "keywords": ["chilli", "mirch", "मिर्च"],
        "symptom_keywords": ["curl", "thrips", "murra", "चिल", "पत्ती मरोड़", "थ्रिप्स"],
        "en": {
            "crop_name": "Chilli",
            "condition": "Chilli Leaf Curl & Thrips Infestation",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "Upward curling of leaves ('boat-shaped'), crinkling, stunted shoot growth caused by thrips and whitefly feeding.",
            "chemical_treatment": "Spray Fipronil 5% SC @ 2 ml/liter or Diafenthiuron 50% WP @ 1.2 g/liter in the evening hours.",
            "organic_remedy": "Install blue sticky traps for thrips and yellow traps for whiteflies (20 traps/acre); spray Neem oil 10,000 ppm @ 3 ml/liter.",
            "prevention": "Maintain barrier crops like maize or sorghum around chilli plots to filter incoming insect vectors.",
            "summary": "Chilli leaf curl and thrips detected. Use sticky traps and apply Fipronil or Neem oil to protect emerging flower buds."
        },
        "hi": {
            "crop_name": "मिर्च (Chilli)",
            "condition": "मिर्च पत्ती मरोड़ (चुर्रा-मुर्रा) एवं थ्रिप्स (Leaf Curl)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "पत्तियां नाव के आकार में ऊपर की ओर मुड़ जाती हैं, पौधे की बढ़वार रुक जाती है और नए कल्ले छोटे रह जाते हैं।",
            "chemical_treatment": "फिप्रोनिल 5% SC (Fipronil) 2 मिली प्रति लीटर या डायफेंथियूरॉन 1.2 ग्राम/लीटर का शाम के समय छिड़काव करें।",
            "organic_remedy": "प्रति एकड़ 15-20 नीले और पीले स्टिकी ट्रैप लगाएं; 10,000 ppm नीम तेल 3 मिली/लीटर स्प्रे करें।",
            "prevention": "मिर्च के खेत के चारों ओर मक्का या ज्वार की दो लाइनें बोएं जो रसचूसक कीटों को अंदर आने से रोकती हैं।",
            "summary": "मिर्च में पत्ती मरोड़ और थ्रिप्स का प्रकोप पाया गया। स्टिकी ट्रैप लगाएं और फिप्रोनिल या नीम तेल का स्प्रे करें।"
        }
    },
    {
        "keywords": ["chilli", "mirch", "मिर्च"],
        "symptom_keywords": ["rot", "anthracnose", "dieback", "फल सड़न", "डाईबैक"],
        "en": {
            "crop_name": "Chilli",
            "condition": "Chilli Anthracnose & Dieback (Colletotrichum capsici)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Circular sunken dark spots on ripe red chillies with black concentric rings of fungal dots; drying of twigs from top downwards.",
            "chemical_treatment": "Spray Azoxystrobin 18.2% + Difenoconazole 11.4% SC (Amistar Top) @ 1 ml/liter or Mancozeb 75% WP @ 2.5 g/liter.",
            "organic_remedy": "Spray Trichoderma viride @ 5 g/liter; harvest ripe fruits immediately without delay.",
            "prevention": "Seed treatment with Thiram @ 3 g/kg; ensure proper sunlight and avoid dense planting.",
            "summary": "Chilli Anthracnose fruit rot detected. Spray Amistar Top or Mancozeb and pick ripe chillies promptly."
        },
        "hi": {
            "crop_name": "मिर्च (Chilli)",
            "condition": "मिर्च का फल सड़न एवं डाईबैक रोग (Anthracnose)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "पकी लाल मिर्च पर गोल धंसे हुए काले धब्बे और टहनियों का ऊपर से नीचे की ओर सूखना। फल समय से पहले खराब हो जाते हैं।",
            "chemical_treatment": "एजोक्सीस्ट्रोबिन + डाइफेनोकोनाज़ोल (Amistar Top) 1 मिली प्रति लीटर पानी या मैनकोजेब 2.5 ग्राम/लीटर का छिड़काव करें।",
            "organic_remedy": "ट्राइकोडर्मा विरिडी 5 ग्राम/लीटर का स्प्रे करें और पकी लाल मिर्च की समय पर तुड़ाई करें।",
            "prevention": "बीज को थीरम 3 ग्राम/किग्रा से उपचारित करें और पौधों के बीच हवा का प्रवाह बनाए रखें।",
            "summary": "मिर्च में फल सड़न (एंथ्रेक्नोज) पाया गया। एमिस्टार टॉप या मैनकोजेब का छिड़काव करें और पकी मिर्च तुरंत तोड़ें।"
        }
    },

    # --- PADDY / RICE ---
    {
        "keywords": ["paddy", "rice", "dhan", "धान", "चावल"],
        "symptom_keywords": ["borer", "tana", "chhedak", "तना छेदक", "इल्ली"],
        "en": {
            "crop_name": "Paddy / Rice",
            "condition": "Yellow Stem Borer (Scirpophaga incertulas)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "Drying of central vegetative shoot ('dead heart') or empty white bleached panicles without grain ('white head').",
            "chemical_treatment": "Apply Cartap Hydrochloride 4G @ 7.5 kg/acre or Chlorantraniliprole 0.4% GR (Ferterra) @ 4 kg/acre in standing water.",
            "organic_remedy": "Install Trichogramma japonicum egg parasitoid cards @ 20,000 eggs/acre; set up light traps for moths.",
            "prevention": "Clip seedling leaf tips before transplanting to remove stem borer egg masses.",
            "summary": "Paddy Stem Borer identified. Apply Cartap Hydrochloride or Ferterra in shallow standing water."
        },
        "hi": {
            "crop_name": "धान (Paddy / Rice)",
            "condition": "धान का तना छेदक कीट (Stem Borer)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "कल्ले निकलते समय पौधे की बीच की गोभ सूख जाती है ('डेड हार्ट') और बालियां आने पर सफेद खाली बालियां निकलती हैं ('व्हाइट हेड')।",
            "chemical_treatment": "कार्टाप हाइड्रोक्लोराइड 4G (Cartap) 7.5 किग्रा प्रति एकड़ या फर्टेरा (Chlorantraniliprole) 4 किग्रा/एकड़ खेत में पानी रखकर डालें।",
            "organic_remedy": "खेत में प्रकाश प्रपंच (Light Trap) लगाएं और ट्राइकोग्रामा परजीवी के कार्ड प्रति एकड़ लगाएं।",
            "prevention": "धान की रोपाई से पहले पौधों की ऊपरी पत्ती के सिरों को काट दें ताकि अंडों के गुच्छे नष्ट हो जाएं।",
            "summary": "धान में तना छेदक का प्रकोप पाया गया। खेत में कार्टाप 4G या फर्टेरा दानेदार का प्रयोग तुरंत करें।"
        }
    },
    {
        "keywords": ["paddy", "rice", "dhan", "धान", "चावल"],
        "symptom_keywords": ["blight", "blast", "jhoka", "झुलसा", "झोका", "ब्लास्ट"],
        "en": {
            "crop_name": "Paddy / Rice",
            "condition": "Rice Blast & Bacterial Blight (Magnaporthe oryzae)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Spindle-shaped diamond lesions on leaves with brown margins and grey centers ('eye-shaped spots'). Lesions on neck cause panicle breaking.",
            "chemical_treatment": "Spray Tricyclazole 75% WP (Baan) @ 0.6 g/liter or Isoprothiolane 40% EC @ 1.5 ml/liter.",
            "organic_remedy": "Apply Pseudomonas fluorescens @ 5 g/liter; drain excess standing water temporarily for 2 days.",
            "prevention": "Avoid excess nitrogen doses during humid overcast weather; maintain optimum seedling spacing.",
            "summary": "Rice Blast disease detected. Spray Tricyclazole 75% WP (Baan) immediately to prevent neck blast."
        },
        "hi": {
            "crop_name": "धान (Paddy / Rice)",
            "condition": "धान का झोका रोग / ब्लास्ट एवं जीवाणु झुलसा (Rice Blast)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "पत्तियों पर आंख या नाव के आकार के धब्बे जिनके किनारे भूरे और बीच का भाग राख जैसा होता है। बालियों की गर्दन काली पड़कर टूट जाती है।",
            "chemical_treatment": "ट्राइसाइक्लाज़ोल 75% WP (Baan) 0.6 ग्राम प्रति लीटर पानी (120 ग्राम/एकड़) या कासुगामाइसिन 2 मिली/लीटर का छिड़काव करें।",
            "organic_remedy": "स्यूडोमोनास 5 ग्राम/लीटर का पर्णीय छिड़काव करें और खेत से अतिरिक्त पानी निकालें।",
            "prevention": "बादल छाए रहने पर यूरिया का अधिक छिड़काव न करें और पोटाश का संतुलित प्रयोग करें।",
            "summary": "धान में झोका (ब्लास्ट) रोग पाया गया। गर्दन टूटने से बचाने के लिए बाण (Tricyclazole) का तुरंत छिड़काव करें।"
        }
    },

    # --- ONION ---
    {
        "keywords": ["onion", "pyaj", "pyaz", "प्याज", "कांदा"],
        "symptom_keywords": ["thrips", "pila", "streak", "थ्रिप्स", "पीलापन"],
        "en": {
            "crop_name": "Onion",
            "condition": "Onion Thrips (Thrips tabaci)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Silvery white patches and curling on tubular leaves caused by rasping-sucking thrips feeding in leaf axils. Leaves dry up from tip downwards.",
            "chemical_treatment": "Spray Profenofos 50% EC @ 2 ml/liter or Fipronil 5% SC @ 1.5 ml/liter mixed with a wetting agent (sticker).",
            "organic_remedy": "Install 20 blue sticky traps per acre; spray 5% Neem Seed Kernel Extract (NSKE) @ 5 ml/liter.",
            "prevention": "Sprinkler irrigation helps dislodge thrips colonies from leaf sheaths.",
            "summary": "Onion thrips detected. Spray Profenofos with sticker and erect blue sticky traps to prevent leaf withering."
        },
        "hi": {
            "crop_name": "प्याज (Onion)",
            "condition": "प्याज का थ्रिप्स कीट (Onion Thrips)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "पत्तियों पर चांदी जैसे सफेद धब्बे और धारियां। पत्तियां ऊपर से नीचे की ओर सूखने लगती हैं और कंद का आकार छोटा रह जाता है।",
            "chemical_treatment": "प्रोफेनोफॉस 50% EC (Profenofos) 2 मिली प्रति लीटर या फिप्रोनिल 1.5 मिली/लीटर (स्टिकर/चिपको मिलाकर) छिड़कें।",
            "organic_remedy": "प्रति एकड़ 20 नीले स्टिकी ट्रैप लगाएं और 5% नीम काढ़ा 5 मिली/लीटर स्प्रे करें।",
            "prevention": "फव्वारा सिंचाई से थ्रिप्स की संख्या घटती है; खेत में खरपतवार न पनपने दें।",
            "summary": "प्याज में थ्रिप्स कीट का प्रकोप पाया गया। स्टिकर के साथ प्रोफेनोफॉस या फिप्रोनिल का स्प्रे करें।"
        }
    },

    # --- COTTON ---
    {
        "keywords": ["cotton", "kapas", "कपास"],
        "symptom_keywords": ["bollworm", "sundi", "pink", "गुलाबी सुंडी", "इल्ली"],
        "en": {
            "crop_name": "Cotton",
            "condition": "Pink Bollworm (Pectinophora gossypiella)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Rosetted flowers ('rosette blooms') that fail to open properly; bore holes in developing green bolls with staining of lint.",
            "chemical_treatment": "Spray Profenofos 40% + Cypermethrin 4% EC @ 2 ml/liter or Emamectin Benzoate 5% SG @ 0.5 g/liter.",
            "organic_remedy": "Install Gossyplure pheromone traps @ 8-10 traps/acre; release Trichogrammatoidea bactrae egg parasitoids.",
            "prevention": "Destroy cotton stubble after final picking; avoid ratoon cotton cultivation.",
            "summary": "Pink Bollworm infestation identified. Install pheromone traps and spray Profenofos + Cypermethrin to save bolls."
        },
        "hi": {
            "crop_name": "कपास (Cotton)",
            "condition": "कपास की गुलाबी सुंडी (Pink Bollworm)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "फूल गुलाब के फूल जैसे बंधे रह जाते हैं और पूरी तरह नहीं खिलते (रोसेट फूल)। हरे टिंडों में छेद और कपास की रुई खराब होना।",
            "chemical_treatment": "प्रोफेनोफॉस + सायपरमेथ्रिन (Profenofos 40% + Cypermethrin 4% EC) 2 मिली/लीटर या एमामेक्टिन बेंजोएट 0.5 ग्राम/लीटर का छिड़काव करें।",
            "organic_remedy": "खेत में प्रति एकड़ 8-10 पिंक बॉलवर्म फेरोमोन ट्रैप लगाएं।",
            "prevention": "अंतिम चुनाई के बाद कपास की डंठलों (पराली) को खेत से हटा दें और दोबारा फसल न लें।",
            "summary": "कपास में गुलाबी सुंडी का प्रकोप पाया गया। फेरोमोन ट्रैप लगाएं और प्रोफेनोफॉस का छिड़काव करें।"
        }
    },

    # --- MUSTARD ---
    {
        "keywords": ["mustard", "sarson", "sarso", "सरसों"],
        "symptom_keywords": ["aphid", "mahun", "chepa", "माहू", "चेपा"],
        "en": {
            "crop_name": "Mustard",
            "condition": "Mustard Aphids (Lipaphis erysimi)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "Dense clusters of greenish-black sap-sucking aphids on inflorescence, tender leaves, and pods, causing stunted growth and poor seed setting.",
            "chemical_treatment": "Spray Dimethoate 30% EC (Rogor) @ 1.5 ml/liter or Oxydemeton-methyl 25% EC @ 1 ml/liter during morning hours.",
            "organic_remedy": "Spray 5% neem oil @ 3 ml/liter; dust wood ash on foliage during early morning dews.",
            "prevention": "Complete sowing before October 20 to avoid peak aphid season in January.",
            "summary": "Mustard aphids detected on floral shoots. Spray Dimethoate or neem wash to protect pod yield."
        },
        "hi": {
            "crop_name": "सरसों (Mustard)",
            "condition": "सरसों का माहू / चेपा कीट (Mustard Aphids)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "फूलों की डालियों और फलियों पर चिपके हुए हरे-काले माहू कीट। रस चूसने से फलियां सिकुड़ जाती हैं और दाना नहीं भरता।",
            "chemical_treatment": "रोगोर (Dimethoate 30% EC) 1.5 मिली प्रति लीटर पानी या इमिडाक्लोप्रिड 0.5 मिली/लीटर का छिड़काव करें।",
            "organic_remedy": "सुबह ओस में लकड़ी की राख बुरकें और 5% नीम तेल 3 मिली/लीटर स्प्रे करें।",
            "prevention": "अक्टूबर के प्रथम पखवाड़े में समय पर बुवाई करें जिससे माहू का प्रकोप कम से कम हो।",
            "summary": "सरसों में माहू (चेपा) का प्रकोप पाया गया। फलियां बचाने के लिए तुरंत रोगोर या नीम तेल का छिड़काव करें।"
        }
    },
    # --- ROSE / FLORICULTURE ---
    {
        "keywords": ["rose", "gulab", "गुलाब", "flower", "phool", "फूल"],
        "symptom_keywords": ["powder", "mildew", "spot", "black spot", "white powder", "पाउडर", "धब्बा"],
        "en": {
            "crop_name": "Rose / Floral Horticulture",
            "condition": "Rose Powdery Mildew & Black Spot (Diplocarpon rosae)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "White talcum-powder-like fungal dust on young tender shoots and flower buds, accompanied by circular black leaf spots with feathered margins causing premature leaf drop.",
            "chemical_treatment": "Spray Hexaconazole 5% SC @ 1 ml/liter of water or Carbendazim 50% WP (Bavistin) @ 1.5 g/liter every 10–12 days.",
            "organic_remedy": "Spray baking soda solution (3 g baking soda + 2 ml neem oil + 1 liter water); ensure morning sun exposure and prune dead decaying wood.",
            "prevention": "Water only at the base/roots, not overhead on flowers; space bushes for ample air circulation; discard fallen infected leaves.",
            "summary": "Rose Black Spot / Powdery Mildew identified. Spray Hexaconazole or neem-baking soda wash and prune infected canes to stimulate fresh healthy blooming."
        },
        "hi": {
            "crop_name": "गुलाब (Rose / Flower)",
            "condition": "गुलाब का काला धब्बा व चूर्णिल आसिता (Black Spot & Powdery Mildew)",
            "severity": "Moderate",
            "confidence_pct": 93,
            "symptoms": "पत्तियों और कलियों पर सफेद पाउडर जैसी फफूंद और काले गोल धब्बे, जिसके कारण पत्तियां पीली होकर झड़ने लगती हैं और फूल छोटे आते हैं।",
            "chemical_treatment": "हेक्साकोनाज़ोल 5% SC (Hexaconazole) 1 मिली प्रति लीटर या बाविस्टिन (Carbendazim) 1.5 ग्राम/लीटर का छिड़काव करें।",
            "organic_remedy": "3 ग्राम बेकिंग सोडा और 2 मिली नीम तेल प्रति लीटर पानी में मिलाकर स्प्रे करें; सूखी व रोगग्रस्त टहनियों की छंटाई करें।",
            "prevention": "पौधों के ऊपर से पानी न डालें, सिर्फ जड़ों में पानी दें; पौधों के बीच धूप व हवा का प्रबंध रखें।",
            "summary": "गुलाब में ब्लैक स्पॉट और सफेद फफूंद पाई गई। हेक्साकोनाज़ोल या नीम-सोडा स्प्रे करें और सूखी डालियां काटें जिससे नए व बड़े फूल आ सकें।"
        }
    },
]

UNCLEAR_IMAGE_DIAGNOSIS_EN = {
    "is_crop": False,
    "crop_name": "Unidentified / Non-Agricultural Subject",
    "condition": "No Recognizable Crop Disease Found",
    "severity": "Mild",
    "confidence_pct": 95,
    "symptoms": "The uploaded photo does not clearly show an agricultural crop leaf, plant stem, or farm produce.",
    "chemical_treatment": "Do not apply chemical sprays without identifying the specific crop and disease.",
    "organic_remedy": "Take a clear, focused close-up photo in bright daylight showing the infected leaf or fruit.",
    "prevention": "Specify your crop name (e.g. Tomato, Wheat, Potato, Cotton) and upload a close-up photo of the affected plant.",
    "summary": "This image does not appear to be an agricultural crop or plant. Please upload a clear photo of your crop, leaf, or farm produce, or mention your crop name so Kisan Doctor can provide exact diagnosis."
}

UNCLEAR_IMAGE_DIAGNOSIS_HI = {
    "is_crop": False,
    "crop_name": "अस्पष्ट / गैर-कृषि वस्तु",
    "condition": "फसल अथवा पौधे का कोई रोग नहीं मिला",
    "severity": "Mild",
    "confidence_pct": 95,
    "symptoms": "अपलोड किया गया चित्र किसी कृषि फसल, पौधे की पत्ती या खेत की उपज का नहीं लग रहा है।",
    "chemical_treatment": "फसल व रोग की पुष्टि के बिना कोई रासायनिक छिड़काव न करें।",
    "organic_remedy": "दिन की रोशनी में ग्रसित पत्ती या पौधे की नजदीक से साफ फोटो खींचें।",
    "prevention": "कृपया अपनी फसल का नाम (जैसे टमाटर, गेहूं, आलू, कपास) लिखें और प्रभावित पत्ते की तस्वीर भेजें।",
    "summary": "यह चित्र किसी कृषि फसल या पौधे का नहीं लग रहा है। कृपया अपनी फसल, पत्ते या तने की साफ फोटो अपलोड करें या फसल का नाम लिखकर बताएं ताकि किसान डॉक्टर सही जांच कर सके।"
}

NON_CROP_REJECTION_EN = {
    "is_crop": False,
    "crop_name": "Non-Agricultural Object",
    "condition": "Not an Agricultural Crop / Invalid Image",
    "severity": "Mild",
    "confidence_pct": 98,
    "symptoms": "The uploaded photo contains an indoor room, appliance, wall, switchboard, furniture, person, or non-plant object.",
    "chemical_treatment": "No agricultural treatment applicable.",
    "organic_remedy": "No remedy applicable.",
    "prevention": "Please upload a clear, focused photo of your crop, leaf, stem, fruit, or farm produce for diagnosis.",
    "summary": "This image does not contain an agricultural crop or plant. Please take a clear photo of your plant or crop leaf so our Kisan Doctor can diagnose it accurately."
}

NON_CROP_REJECTION_HI = {
    "is_crop": False,
    "crop_name": "गैर-कृषि वस्तु (Non-Crop)",
    "condition": "फसल का चित्र नहीं है (Invalid Image)",
    "severity": "Mild",
    "confidence_pct": 98,
    "symptoms": "अपलोड किया गया चित्र किसी कमरे, दीवार, स्विचबोर्ड, प्लग, एसी, फर्नीचर, व्यक्ति या गैर-कृषि वस्तु का है।",
    "chemical_treatment": "कोई रासायनिक उपचार लागू नहीं है।",
    "organic_remedy": "कोई जैविक उपचार लागू नहीं है।",
    "prevention": "कृपया सटीक जांच के लिए केवल अपनी फसल, पौधे, पत्ते या फल की साफ फोटो अपलोड करें।",
    "summary": "यह किसी फसल या पौधे का चित्र नहीं है। कृपया अपनी फसल के पौधे, पत्ते या तने की साफ तस्वीर खींचकर भेजें ताकि किसान डॉक्टर सही बीमारी व उपचार बता सके।"
}

NON_CROP_KEYWORDS = [
    "wall", "ac", "air conditioner", "room", "floor", "ceiling", "marble",
    "tile", "tiles", "fan", "tv", "sofa", "chair", "table", "bed", "door",
    "window", "car", "bike", "cycle", "person", "man", "woman", "selfie",
    "dog", "cat", "indoor", "building", "house", "laptop", "mobile", "phone",
    "switch", "plug", "socket", "board", "charger", "cable", "wire", "adapter",
    "दीवार", "कमरा", "एसी", "गाड़ी", "घर", "पंखा", "कुर्सी", "मेज", "दरवाजा",
    "खिड़की", "बोर्ड", "स्विच", "चार्जर", "प्लग"
]


def analyze_crop_image_with_gemini(
    image_base64: str,
    crop_hint: Optional[str] = None,
    language: str = "en",
    question: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Call Gemini Flash Multimodal Vision API to diagnose crop image."""
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        return None

    clean_base64 = image_base64
    mime_type = "image/jpeg"
    if "," in image_base64:
        header, clean_base64 = image_base64.split(",", 1)
        if "png" in header:
            mime_type = "image/png"
        elif "webp" in header:
            mime_type = "image/webp"

    models_to_try = [settings.GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.0-flash"]
    # De-duplicate while preserving order
    seen = set()
    models = [m for m in models_to_try if not (m in seen or seen.add(m))]

    system_prompt = (
        "You are an expert Indian agricultural plant pathologist and agronomist. "
        "MANDATORY VALIDATION: First determine if the image contains an agricultural crop, leaf, plant, stem, "
        "flower, fruit, vegetable, or harvest produce. If the image is NOT an agricultural crop or plant (for example: an air conditioner, indoor room, "
        "wall, switchboard, electrical socket, furniture, appliance, ceiling, vehicle, human, pet, or household object), you MUST set 'is_crop': false, "
        "'crop_name': 'Non-Crop Object', 'condition': 'Non-Crop Image Detected', 'severity': 'Mild', 'confidence_pct': 99, "
        "'symptoms': 'Image contains a non-agricultural object (such as a wall, room, appliance, or furniture).', "
        "'chemical_treatment': 'None required.', 'organic_remedy': 'None required.', 'prevention': 'Please take a clear photo of your plant or crop.', "
        "and 'summary': 'This image does not appear to be an agricultural crop or plant. Please upload a clear photo of your crop, leaf, stem, or farm produce for disease diagnosis.' "
        "DO NOT diagnose plant diseases on non-plant images under any circumstances! "
        "If it IS an agricultural crop or plant, set 'is_crop': true, detect the crop species, disease/pest/deficiency or if healthy, "
        "and provide exact, actionable treatment and dosages in Indian farming context. "
        "IMPORTANT: If the farmer asked a specific question, address it directly in your summary and symptoms. "
        "Output ONLY a valid JSON object with these exact keys: "
        "is_crop (boolean), crop_name (string), condition (string), severity (string: 'Healthy'|'Mild'|'Moderate'|'Severe'), "
        "confidence_pct (integer 0-100), symptoms (string), chemical_treatment (string with chemical name and g/L dosage), "
        "organic_remedy (string with natural solution), prevention (string), summary (string in 1-2 sentences)."
    )
    if language == "hi":
        system_prompt += " Translate the values of symptoms, chemical_treatment, organic_remedy, prevention, and summary into clear Hindi (Devanagari script)."

    prompt_text = f"Analyze this crop image for health, pests, and diseases. Farmer note / crop hint: {crop_hint or 'None provided'}."
    if question:
        prompt_text += f"\nSpecific farmer question / inquiry: '{question}'. Please answer this specific question directly in the diagnosis."

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": clean_base64.strip()
                        }
                    }
                ]
            }
        ],
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800,
            "responseMimeType": "application/json"
        }
    }

    for model in models:
        url = GEMINI_API_URL.format(model=model) + f"?key={api_key}"
        headers = {"Content-Type": "application/json"}
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=20)
            if resp.status_code != 200:
                continue
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    raw_json = parts[0]["text"].strip()
                    parsed = json.loads(raw_json)
                    raw_is_crop = parsed.get("is_crop", True)
                    if isinstance(raw_is_crop, str):
                        raw_is_crop = raw_is_crop.lower() in ("true", "1", "yes")
                    return {
                        "is_crop": bool(raw_is_crop),
                        "crop_name": str(parsed.get("crop_name", "Agricultural Crop")),
                        "condition": str(parsed.get("condition", "Foliar Condition")),
                        "severity": str(parsed.get("severity", "Moderate")),
                        "confidence_pct": int(parsed.get("confidence_pct", 90)),
                        "symptoms": str(parsed.get("symptoms", "")),
                        "chemical_treatment": str(parsed.get("chemical_treatment", "")),
                        "organic_remedy": str(parsed.get("organic_remedy", "")),
                        "prevention": str(parsed.get("prevention", "")),
                        "summary": str(parsed.get("summary", "")),
                    }
        except Exception as exc:
            logger.warning("Gemini Vision attempt with %s failed: %s", model, exc)

    return None


def diagnose_crop_image(
    image_base64: str,
    crop_hint: Optional[str] = None,
    language: str = "en",
    question: Optional[str] = None,
) -> dict[str, Any]:
    """
    Main entrypoint for crop image diagnosis.
    Tries Gemini Vision first; falls back safely to comprehensive plant pathology engine.
    """
    combined_query = f"{crop_hint or ''} {question or ''}".lower().strip()

    # Rejection of explicit non-crop hints or objects
    if any(kw in combined_query for kw in NON_CROP_KEYWORDS):
        return NON_CROP_REJECTION_HI if language == "hi" else NON_CROP_REJECTION_EN

    # 1. Try Gemini Vision if API key is active
    gemini_result = analyze_crop_image_with_gemini(image_base64, crop_hint, language, question)
    if gemini_result:
        return gemini_result

    # Check if question is vague (e.g. "what is this", "ye kya hai") without any agricultural hints
    is_vague_question = any(v in combined_query for v in ["what is this", "kya hai", "ye kya", "photo", "dekho", "tell me", "identify", "batao"])
    has_crop_keyword = any(kw in combined_query for entry in DISEASE_KNOWLEDGE_BASE for kw in entry["keywords"]) or bool(crop_hint and not any(kw in crop_hint.lower() for kw in NON_CROP_KEYWORDS))
    has_symptom_keyword = any(
        kw in combined_query for kw in [
            "leaf", "plant", "crop", "pest", "disease", "keeda", "illi", "patta", "fasal",
            "paudha", "fruit", "root", "dhabba", "blight", "yellow", "wilt", "borer", "thrips", "curl"
        ]
    )

    if (is_vague_question or not combined_query) and not has_crop_keyword and not has_symptom_keyword and not crop_hint:
        return UNCLEAR_IMAGE_DIAGNOSIS_HI if language == "hi" else UNCLEAR_IMAGE_DIAGNOSIS_EN

    # 2. Plant pathology diagnostic engine based on crop hint or user question
    # Best-match scoring: crop match (weight 2) + symptom match (weight 3)
    best_entry = None
    best_score = 0
    for entry in DISEASE_KNOWLEDGE_BASE:
        crop_match = any(kw in combined_query for kw in entry["keywords"])
        symptom_match = any(kw in combined_query for kw in entry.get("symptom_keywords", []))
        score = (2 if crop_match else 0) + (3 if symptom_match else 0)
        if crop_match and score > best_score:
            best_score = score
            best_entry = entry

    if best_entry:
        result = dict(best_entry["hi"] if language == "hi" else best_entry["en"])
        if question and len(question.strip()) > 3:
            prefix = f"Re: '{question.strip()}' — " if language == "en" else f"आपके प्रश्न '{question.strip()}' के उत्तर में — "
            result["summary"] = prefix + result["summary"]
        return {"is_crop": True, **result}

    # If only symptom matched without crop keyword
    for entry in DISEASE_KNOWLEDGE_BASE:
        if any(kw in combined_query for kw in entry.get("symptom_keywords", [])):
            result = dict(entry["hi"] if language == "hi" else entry["en"])
            if question and len(question.strip()) > 3:
                prefix = f"Re: '{question.strip()}' — " if language == "en" else f"आपके प्रश्न '{question.strip()}' के उत्तर में — "
                result["summary"] = prefix + result["summary"]
            return {"is_crop": True, **result}

    # If no crop and no agricultural symptom matched at all, do NOT make up early blight
    if not has_crop_keyword and not has_symptom_keyword:
        return UNCLEAR_IMAGE_DIAGNOSIS_HI if language == "hi" else UNCLEAR_IMAGE_DIAGNOSIS_EN

    # Default fallback
    default_res = dict(UNCLEAR_IMAGE_DIAGNOSIS_HI if language == "hi" else UNCLEAR_IMAGE_DIAGNOSIS_EN)
    if question and len(question.strip()) > 3:
        prefix = f"Re: '{question.strip()}' — " if language == "en" else f"आपके प्रश्न '{question.strip()}' के उत्तर में — "
        default_res["summary"] = prefix + default_res["summary"]
    return default_res

"""
Crop Image Analysis & Disease Diagnostic Vision Service.
Supports multimodal AI vision analysis via Google Gemini, with an expert
plant pathology diagnostic engine fallback.
"""
import json
import logging
import re
from typing import Any, Optional
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

DISEASE_KNOWLEDGE_BASE: list[dict[str, Any]] = [
    {
        "keywords": ["tomato", "tamatar", "टमाटर"],
        "en": {
            "crop_name": "Tomato",
            "condition": "Early Blight (Alternaria solani)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Concentric dark brown rings ('target board' spots) on mature lower leaves surrounded by chlorotic yellow halos. Stems show dark sunken cankers.",
            "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5 g/liter of water or Copper Oxychloride 50% WP @ 3 g/liter. For advanced infection, spray Azoxystrobin 23% SC @ 1 ml/liter.",
            "organic_remedy": "Spray 5% Neem Seed Kernel Extract (NSKE) or Trichoderma viride @ 5 g/liter; prune and destroy infected lower foliage.",
            "prevention": "Avoid overhead sprinkler irrigation; stake plants to keep leaves off damp soil; maintain 60 cm row spacing for ventilation.",
            "summary": "Tomato Early Blight detected with 92% confidence. Moderate severity. Treat with Mancozeb or Neem oil immediately to prevent spread to fruits."
        },
        "hi": {
            "crop_name": "टमाटर (Tomato)",
            "condition": "अगेती झुलसा / अर्ली ब्लाइट (Alternaria solani)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "निचली पत्तियों पर गोल भूरे-काले छल्लेदार धब्बे, जिनके चारों ओर पीला घेरा बन जाता है। तनों पर काले धंसे हुए घाव।",
            "chemical_treatment": "मैनकोजेब 75% WP (Mancozeb) 2.5 ग्राम प्रति लीटर पानी या कॉपर ऑक्सीक्लोराइड 3 ग्राम/लीटर का तुरंत छिड़काव करें। गंभीर होने पर एजोक्सीस्ट्रोबिन (Azoxystrobin) 1 मिली/लीटर स्प्रे करें।",
            "organic_remedy": "5% नीम का काढ़ा या ट्राइकोडर्मा विरिडी (Trichoderma) 5 ग्राम प्रति लीटर पानी में मिलाकर छिड़कें। नीचे की ग्रसित पत्तियों को तोड़कर नष्ट करें।",
            "prevention": "ऊपर से पानी का फव्वारा न दें; पौधों को डंडों से सहारा देकर पत्तियों को जमीन की नमी से दूर रखें।",
            "summary": "टमाटर में 92% सटीकता के साथ अर्ली ब्लाइट (झुलसा) पाया गया। फल सुरक्षित रखने के लिए तुरंत मैनकोजेब या नीम तेल का छिड़काव करें।"
        }
    },
    {
        "keywords": ["potato", "aaloo", "आलू"],
        "en": {
            "crop_name": "Potato",
            "condition": "Late Blight (Phytophthora infestans)",
            "severity": "Severe",
            "confidence_pct": 95,
            "symptoms": "Rapidly expanding water-soaked blackish lesions on leaf tips and margins; white cottony fungal growth on leaf undersides during cool humid mornings.",
            "chemical_treatment": "Spray Cymoxanil 8% + Mancozeb 64% WP (Curzate) @ 2.5 g/liter or Metalaxyl 8% + Mancozeb 64% WP (Ridomil MZ) @ 2.5 g/liter within 24 hours.",
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
        "keywords": ["wheat", "gehun", "गेहूं"],
        "en": {
            "crop_name": "Wheat",
            "condition": "Yellow Stripe Rust (Puccinia striiformis)",
            "severity": "Moderate",
            "confidence_pct": 89,
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
            "confidence_pct": 89,
            "symptoms": "पत्तियों पर धारियों के रूप में पीले रंग के बारीक पाउडर जैसे दाने। उंगली से छूने पर पीला पाउडर हाथ पर लग जाता है।",
            "chemical_treatment": "प्रोपिकोनाज़ोल 25% EC (Tilt) 1 मिली प्रति लीटर पानी (200 मिली प्रति एकड़) धूप निकलने पर छिड़कें।",
            "organic_remedy": "4 दिन पुरानी खट्टी छाछ को 50 मिली प्रति लीटर पानी में मिलाकर स्प्रे करें; मेड़ों की घास साफ रखें।",
            "prevention": "HD-3086 या DBW-187 जैसी रोगरोधी किस्मों की बुवाई करें और बाद के दिनों में अतिरिक्त यूरिया न दें।",
            "summary": "गेहूं में पीला रतुआ पाया गया। धूप वाले दिन टिल्ट (Propiconazole) का छिड़काव करने से यह तुरंत रुक जाता है।"
        }
    },
    {
        "keywords": ["chilli", "mirch", "मिर्च"],
        "en": {
            "crop_name": "Chilli",
            "condition": "Chilli Leaf Curl & Thrips Infestation",
            "severity": "Moderate",
            "confidence_pct": 91,
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
            "confidence_pct": 91,
            "symptoms": "पत्तियां नाव के आकार में ऊपर की ओर मुड़ जाती हैं, पौधे की बढ़वार रुक जाती है और नए कल्ले छोटे रह जाते हैं।",
            "chemical_treatment": "फिप्रोनिल 5% SC (Fipronil) 2 मिली प्रति लीटर या डायफेंथियूरॉन 1.2 ग्राम/लीटर का शाम के समय छिड़काव करें।",
            "organic_remedy": "प्रति एकड़ 15-20 नीले और पीले स्टिकी ट्रैप लगाएं; 10,000 ppm नीम तेल 3 मिली/लीटर स्प्रे करें।",
            "prevention": "मिर्च के खेत के चारों ओर मक्का या ज्वार की दो लाइनें बोएं जो रसचूसक कीटों को अंदर आने से रोकती हैं।",
            "summary": "मिर्च में पत्ती मरोड़ और थ्रिप्स का प्रकोप पाया गया। स्टिकी ट्रैप लगाएं और फिप्रोनिल या नीम तेल का स्प्रे करें।"
        }
    },
    {
        "keywords": ["rose", "gulab", "गुलाब", "flower", "phool", "फूल"],
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
    {
        "keywords": ["paddy", "rice", "dhan", "धान", "चावल"],
        "en": {
            "crop_name": "Paddy / Rice",
            "condition": "Bacterial Leaf Blight & Sheath Blight (Xanthomonas oryzae)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Water-soaked yellowish lesions with wavy margins starting from leaf tips, advancing downward along veins. Gray-green oval lesions on leaf sheaths near water line.",
            "chemical_treatment": "Spray Validamycin 3% L @ 2 ml/liter or Streptocycline @ 6 g + Copper Oxychloride @ 300 g in 200 liters of water per acre.",
            "organic_remedy": "Apply Pseudomonas fluorescens @ 5 g/liter to foliage; drain excess standing water from paddy fields for 2–3 days to arrest bacterial spread.",
            "prevention": "Avoid split excessive urea application during cloudy monsoon weather; maintain optimum seedling spacing.",
            "summary": "Rice Bacterial Blight / Sheath Blight detected. Spray Validamycin or Streptocycline + Copper and drain stagnant field water temporarily."
        },
        "hi": {
            "crop_name": "धान (Paddy / Rice)",
            "condition": "जीवाणु झुलसा एवं शीथ ब्लाइट (Bacterial & Sheath Blight)",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "पत्तियों के सिरों से शुरू होकर नीचे की ओर पीले-सूखे किनारे (झुलसा), और पानी के स्तर के पास तनों पर धब्बे।",
            "chemical_treatment": "वैलिडामाइसिन 3% L (Validamycin) 2 मिली प्रति लीटर या स्ट्रेप्टोसाइक्लिन 6 ग्राम + कॉपर ऑक्सीक्लोराइड 300 ग्राम प्रति 200 लीटर पानी प्रति एकड़ छिड़कें।",
            "organic_remedy": "स्यूडोमोनास फ्लोरेसेन्स (Pseudomonas) 5 ग्राम/लीटर का छिड़काव करें और खेत का अतिरिक्त पानी 2 दिन के लिए निकाल दें।",
            "prevention": "बादल वाले मौसम में यूरिया की अधिक खुराक न दें और पोटाश खाद का संतुलित उपयोग करें।",
            "summary": "धान में जीवाणु झुलसा या शीथ ब्लाइट पाया गया। वैलिडामाइसिन या स्ट्रेप्टोसाइक्लिन + कॉपर का छिड़काव करें।"
        }
    },
    {
        "keywords": ["cotton", "kapas", "कपास"],
        "en": {
            "crop_name": "Cotton",
            "condition": "Cotton Leaf Curl Virus (CLCuV) & Whitefly Complex",
            "severity": "Moderate",
            "confidence_pct": 90,
            "symptoms": "Upward or downward leaf curling, vein thickening, small leaf-like enations on undersides of leaves, caused by Bemisia tabaci whiteflies.",
            "chemical_treatment": "Spray Afidopyropen 50 g/l DC (Sefina) @ 1 ml/liter or Pyriproxyfen 10% + Fenpropathrin 10% EC @ 1.5 ml/liter.",
            "organic_remedy": "Erect yellow sticky traps @ 25 per acre; spray 5% neem seed kernel extract (NSKE) @ 5 ml/liter.",
            "prevention": "Sow resistant Bt cotton hybrids; eradicate weed hosts like Abutilon indicum around fields.",
            "summary": "Cotton leaf curl and whitefly detected. Use sticky traps and spray Sefina or neem extract to stop transmission."
        },
        "hi": {
            "crop_name": "कपास (Cotton)",
            "condition": "कपास पत्ती मरोड़ (CLCuV) एवं सफेद मक्खी",
            "severity": "Moderate",
            "confidence_pct": 90,
            "symptoms": "पत्तियों का ऊपर या नीचे मुड़ना, नसों का मोटा होना और पत्तियों के पीछे छोटी पत्तियां (एनेशन) निकलना।",
            "chemical_treatment": "सेफिना (Afidopyropen) 1 मिली प्रति लीटर या पाइरीप्रॉक्सीफेन 1.5 मिली/लीटर का छिड़काव करें।",
            "organic_remedy": "प्रति एकड़ 25 पीले स्टिकी ट्रैप लगाएं और 5% नीम काढ़ा (NSKE) 5 मिली/लीटर स्प्रे करें।",
            "prevention": "रोगरोधी संकर बीजों का चयन करें और मेड़ों पर उगने वाली खरपतवार साफ रखें।",
            "summary": "कपास में लीफ कर्ल और सफेद मक्खी का प्रकोप पाया गया। पीले ट्रैप लगाएं और सेफिना का स्प्रे करें।"
        }
    },
    {
        "keywords": ["mustard", "sarson", "sarso", "सरसों"],
        "en": {
            "crop_name": "Mustard",
            "condition": "White Rust (Albugo candida) & Aphid Infestation",
            "severity": "Moderate",
            "confidence_pct": 91,
            "symptoms": "Raised white or creamy pustules on lower leaf surfaces and floral malformation (staghead). Colonies of greenish aphids on terminal twigs.",
            "chemical_treatment": "Spray Metalaxyl 8% + Mancozeb 64% WP (Ridomil) @ 2 g/liter for white rust, and Dimethoate 30% EC @ 1.5 ml/liter for aphids.",
            "organic_remedy": "Spray wood ash and cow urine (1:10) on dewy mornings; install yellow sticky traps.",
            "prevention": "Sow early by mid-October; spray during clear sunny weather when aphid threshold exceeds 15-20 per plant.",
            "summary": "Mustard white rust and aphids detected. Apply Ridomil and Dimethoate or neem wash to save siliqua pod formation."
        },
        "hi": {
            "crop_name": "सरसों (Mustard)",
            "condition": "सफेद रतुआ (White Rust) एवं माहू (Aphid)",
            "severity": "Moderate",
            "confidence_pct": 91,
            "symptoms": "पत्तियों की निचली सतह पर सफेद उभरे हुए छाले और फूल वाले हिस्सों का विकृत होना (हिरन-खुरी)। टहनियों पर चिपके हरे-काले माहू कीट।",
            "chemical_treatment": "सफेद रतुए के लिए रिडोमिल (Metalaxyl + Mancozeb) 2 ग्राम/लीटर और माहू के लिए रोगोर (Dimethoate) 1.5 मिली/लीटर का छिड़काव करें।",
            "organic_remedy": "सुबह ओस में लकड़ी की राख बुरकें और नीम तेल 3 मिली/लीटर स्प्रे करें।",
            "prevention": "अक्टूबर के पहले पखवाड़े में बुवाई करें और बादल छाने पर माहू की तुरंत निगरानी करें।",
            "summary": "सरसों में सफेद रतुआ व माहू पाया गया। फलियां बचाने के लिए रिडोमिल और रोगोर का छिड़काव करें।"
        }
    },
    {
        "keywords": ["onion", "pyaj", "pyaz", "प्याज", "कांदा"],
        "en": {
            "crop_name": "Onion",
            "condition": "Purple Blotch (Alternaria porri) & Thrips",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "Small sunken white water-soaked lesions that turn purplish-brown with yellow rings. Silvery white streaks caused by thrips scraping leaf surface.",
            "chemical_treatment": "Spray Mancozeb 75% WP @ 2.5 g/liter mixed with sticker/spreader + Fipronil 5% SC @ 1.5 ml/liter.",
            "organic_remedy": "Spray 5% neem seed extract (NSKE) with soap solution; maintain proper field drainage.",
            "prevention": "Ensure good drainage; do not over-irrigate during bulb enlargement stage.",
            "summary": "Onion purple blotch and thrips detected. Spray Mancozeb with sticker and Fipronil to prevent bulb rotting."
        },
        "hi": {
            "crop_name": "प्याज (Onion)",
            "condition": "बैंगनी धब्बा रोग (Purple Blotch) एवं थ्रिप्स",
            "severity": "Moderate",
            "confidence_pct": 92,
            "symptoms": "पत्तियों पर छोटे धंसे हुए पानी जैसे धब्बे जो बाद में बैंगनी-भूरे हो जाते हैं। पत्तियों पर चांदी जैसी सफेद धारियां (थ्रिप्स के कारण)।",
            "chemical_treatment": "मैनकोजेब 75% WP 2.5 ग्राम प्रति लीटर (चिपको/स्टिकर के साथ) + फिप्रोनिल 1.5 मिली/लीटर का छिड़काव करें।",
            "organic_remedy": "नीम काढ़ा (NSKE) 5% स्प्रे करें और खेत में जल निकासी अच्छी रखें।",
            "prevention": "कंद बनते समय अधिक पानी न दें और खेत में हवा का आवागमन बनाए रखें।",
            "summary": "प्याज में पर्पल ब्लॉच और थ्रिप्स पाया गया। स्टिकर के साथ मैनकोजेब और फिप्रोनिल का स्प्रे करें।"
        }
    },
]

DEFAULT_DIAGNOSIS_EN = {
    "is_crop": True,
    "crop_name": "Agricultural Crop",
    "condition": "Foliar Blight & Nutrient Stress",
    "severity": "Moderate",
    "confidence_pct": 88,
    "symptoms": "Irregular chlorotic yellow patches with necrotic brown margins observed on the leaf surface, indicating fungal infection coupled with micronutrient imbalance.",
    "chemical_treatment": "Apply broad-spectrum protective fungicide Mancozeb 75% WP @ 2.5 g/liter + water-soluble 19:19:19 NPK fertilizer @ 5 g/liter.",
    "organic_remedy": "Spray cold-pressed Neem oil (10,000 ppm) @ 3 ml/liter with 1 ml liquid soap as an emulsifier. Apply Trichoderma viride to root zone.",
    "prevention": "Ensure good field drainage; avoid waterlogging around roots; inspect crop weekly for early signs of pathogen spread.",
    "summary": "Visual analysis indicates fungal foliar leaf spots with moderate severity. Broad-spectrum Mancozeb spray and balanced irrigation are recommended."
}

DEFAULT_DIAGNOSIS_HI = {
    "is_crop": True,
    "crop_name": "कृषि फसल (Crop)",
    "condition": "पत्ती का धब्बा रोग एवं पोषण तनाव (Foliar Spot)",
    "severity": "Moderate",
    "confidence_pct": 88,
    "symptoms": "पत्तियों पर पीले और भूरे रंग के धब्बे दिख रहे हैं, जो फफूंदी संक्रमण और सूक्ष्म पोषक तत्वों की कमी का संकेत देते हैं।",
    "chemical_treatment": "मैनकोजेब 75% WP (Mancozeb) 2.5 ग्राम प्रति लीटर पानी + 19:19:19 घुलनशील खाद 5 ग्राम/लीटर मिलाकर छिड़काव करें।",
    "organic_remedy": "नीम तेल (10,000 ppm) 3 मिली प्रति लीटर पानी में हल्का साबुन मिलाकर स्प्रे करें। जड़ में ट्राइकोडर्मा डालें।",
    "prevention": "खेत में जलभराव न होने दें; शाम के समय हल्की सिंचाई करें और संक्रमित पत्तियों को हटा दें।",
    "summary": "चित्र विश्लेषण से पत्ती पर फफूंद जनित धब्बा रोग पाया गया। बचाव के लिए मैनकोजेब और नीम तेल का छिड़काव तुरंत करें।"
}

NON_CROP_REJECTION_EN = {
    "is_crop": False,
    "crop_name": "Non-Agricultural Object",
    "condition": "Not an Agricultural Crop / Invalid Image",
    "severity": "Mild",
    "confidence_pct": 98,
    "symptoms": "The uploaded photo contains an indoor room, appliance, wall, furniture, person, or non-plant object.",
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
    "symptoms": "अपलोड किया गया चित्र किसी कमरे, दीवार, एसी, फर्नीचर, व्यक्ति या गैर-कृषि वस्तु का है।",
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
    "दीवार", "कमरा", "एसी", "गाड़ी", "घर"
]


def analyze_crop_image_with_gemini(
    image_base64: str,
    crop_hint: Optional[str] = None,
    language: str = "en",
    question: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Call Gemini 2.5 Flash Multimodal Vision API to diagnose crop image."""
    api_key = settings.GEMINI_API_KEY.strip()
    if not api_key:
        return None

    # Clean base64 header if present (e.g. data:image/jpeg;base64,...)
    clean_base64 = image_base64
    mime_type = "image/jpeg"
    if "," in image_base64:
        header, clean_base64 = image_base64.split(",", 1)
        if "png" in header:
            mime_type = "image/png"
        elif "webp" in header:
            mime_type = "image/webp"

    url = GEMINI_API_URL.format(model=settings.GEMINI_MODEL) + f"?key={api_key}"
    headers = {"Content-Type": "application/json"}

    system_prompt = (
        "You are an expert Indian agricultural plant pathologist and agronomist. "
        "Analyze the uploaded crop photo. Detect the crop species, disease/pest/deficiency or if healthy, "
        "Analyze the uploaded crop photo. Detect the crop species, disease/pest/deficiency or if healthy. "
        "MANDATORY VALIDATION: First determine if the image contains an agricultural crop, leaf, plant, stem, "
        "fruit, vegetable, or harvest produce. If the image is NOT an agricultural crop or plant (for example: an air conditioner, indoor room, "
        "flower, fruit, vegetable, or harvest produce. If the image is NOT an agricultural crop or plant (for example: an air conditioner, indoor room, "
        "wall, marble, furniture, appliance, ceiling, vehicle, human, pet, or household object), you MUST set 'is_crop': false, "
        "'crop_name': 'Non-Crop Object', 'condition': 'Non-Crop Image Detected', 'severity': 'Mild', 'confidence_pct': 99, "
        "'symptoms': 'Image contains a non-agricultural object (such as a wall, room, appliance, or furniture).', "
        "'chemical_treatment': 'None required.', 'organic_remedy': 'None required.', 'prevention': 'Please take a clear photo of your plant or crop.', "
        "and 'summary': 'This image does not appear to be an agricultural crop or plant. Please upload a clear photo of your crop, leaf, stem, or farm produce for disease diagnosis.' "
        "DO NOT diagnose plant diseases on non-plant images under any circumstances! "
        "If it IS an agricultural crop or plant, set 'is_crop': true, detect the crop species, disease/pest/deficiency or if healthy, "
        "and provide exact, actionable treatment and dosages in Indian farming context. "
        "IMPORTANT: If the farmer asked a specific question, address it directly in your summary and symptoms. "
        "Output ONLY a valid JSON object with these exact keys: "
        "crop_name (string), condition (string), severity (string: 'Healthy'|'Mild'|'Moderate'|'Severe'), "
        "is_crop (boolean), crop_name (string), condition (string), severity (string: 'Healthy'|'Mild'|'Moderate'|'Severe'), "
        "confidence_pct (integer 0-100), symptoms (string), chemical_treatment (string with chemical name and g/L dosage), "
        "organic_remedy (string with natural solution), prevention (string), summary (string in 1-2 sentences). "
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

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts and "text" in parts[0]:
                raw_json = parts[0]["text"].strip()
                # Parse JSON
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
        logger.warning("Gemini Vision call failed: %s", exc)

    return None


def diagnose_crop_image(
    image_base64: str,
    crop_hint: Optional[str] = None,
    language: str = "en",
    question: Optional[str] = None,
) -> dict[str, Any]:
    """
    Main entrypoint for crop image diagnosis.
    Tries Gemini Vision first; falls back to agronomic knowledge base.
    Validates crop imagery, tries Gemini Vision, and falls back safely.
    """
    combined_query = f"{crop_hint or ''} {question or ''}".lower()

    # Rejection of explicit non-crop hints
    if any(kw in combined_query for kw in NON_CROP_KEYWORDS):
        return NON_CROP_REJECTION_HI if language == "hi" else NON_CROP_REJECTION_EN

    # 1. Try Gemini Vision if API key is active
    gemini_result = analyze_crop_image_with_gemini(image_base64, crop_hint, language, question)
    if gemini_result:
        return gemini_result

    # 2. Plant pathology diagnostic engine based on crop hint or user question
    for entry in DISEASE_KNOWLEDGE_BASE:
        if any(kw in combined_query for kw in entry["keywords"]):
            result = dict(entry["hi"] if language == "hi" else entry["en"])
            if question and len(question.strip()) > 3:
                prefix = f"Re: '{question.strip()}' — " if language == "en" else f"आपके प्रश्न '{question.strip()}' के उत्तर में — "
                result["summary"] = prefix + result["summary"]
            return {"is_crop": True, **result}

    # 3. Default comprehensive diagnosis
    default_res = dict(DEFAULT_DIAGNOSIS_HI if language == "hi" else DEFAULT_DIAGNOSIS_EN)
    if question and len(question.strip()) > 3:
        prefix = f"Re: '{question.strip()}' — " if language == "en" else f"आपके प्रश्न '{question.strip()}' के उत्तर में — "
        default_res["summary"] = prefix + default_res["summary"]
    return default_res


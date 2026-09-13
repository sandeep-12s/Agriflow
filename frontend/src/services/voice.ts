/**
 * Voice Navigation Service for AgriFlow.
 * Uses Web Speech API (window.speechSynthesis) to pronounce tabs and sections
 * in the farmer's chosen Indian regional language.
 */

export interface VoicePronunciationMap {
  [route: string]: {
    hi: string
    en: string
    mr?: string
    pa?: string
    gu?: string
    te?: string
    ta?: string
    bn?: string
    kn?: string
  }
}

export const TAB_PRONUNCIATIONS: VoicePronunciationMap = {
  '/dashboard': {
    hi: 'डैशबोर्ड, फसल स्थिति और सारांश',
    en: 'Dashboard, Farm Overview',
    mr: 'डॅशबोर्ड, शेती सारांश',
    pa: 'ਡੈਸ਼ਬੋਰਡ, ਖੇਤੀ ਸੰਖੇਪ',
    gu: 'ડેશબોર્ડ, ખેતી સારાંશ',
    te: 'డ్యాష్‌బోర్డ్, వ్యవసాయ అవలోకనం',
    ta: 'டாஷ்போர்டு, பண்ணை கண்ணோட்டம்',
    bn: 'ড্যাশবোর্ড, খামার সারসংক্ষেপ',
    kn: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್, ಕೃಷಿ ವಿವರ',
  },
  '/produce': {
    hi: 'मेरी फसलें, उपज सूची',
    en: 'My Produce and Harvests',
    mr: 'माझे पीक, शेतमाल यादी',
    pa: 'ਮੇਰੀਆਂ ਫਸਲਾਂ',
    gu: 'મારા પાક, ઉપજ યાદી',
  },
  '/market': {
    hi: 'मंडी लाइव भाव, दैनिक दरें',
    en: 'Live Mandi Market Rates',
    mr: 'बाजार भाव, दैनिक मंडी दर',
    pa: 'ਮੰਡੀ ਲਾਈਵ ਰੇਟ',
    gu: 'મંડી લાઈવ ભાવ',
  },
  '/buyers': {
    hi: 'सत्यापित खरीदार, सीधे व्यापारी',
    en: 'Verified Wholesale Buyers',
    mr: 'पडताळणी झालेले व्यापारी खरेदीदार',
    pa: 'ਪ੍ਰਮਾਣਿਤ ਖਰੀਦਦਾਰ',
    gu: 'ચકાસાયેલ ખરીદદારો',
  },
  '/buyer/portal': {
    hi: 'खरीदार पोर्टल, मांग विवरण',
    en: 'Buyer Procurement Portal',
    mr: 'खरेदीदार पोर्टल',
    pa: 'ਖਰੀਦਦਾਰ ਪੋਰਟਲ',
    gu: 'ખરીદદાર પોર્ટલ',
  },
  '/storage': {
    hi: 'कोल्ड स्टोरेज, वेयरहाउस केंद्र',
    en: 'Cold Storage and Warehouses',
    mr: 'कोल्ड स्टोरेज आणि गोदामे',
    pa: 'ਕੋਲਡ ਸਟੋਰੇਜ ਅਤੇ ਵੇਅਰਹਾਊਸ',
    gu: 'કોલ્ડ સ્ટોરેજ અને વેરહાઉસ',
  },
  '/processing': {
    hi: 'खाद्य प्रसंस्करण इकाइयां, मूल्य संवर्धन',
    en: 'Agro Processing Units',
    mr: 'अन्न प्रक्रिया उद्योग',
    pa: 'ਐਗਰੋ ਪ੍ਰੋਸੈਸਿੰਗ ਯੂਨਿਟ',
    gu: 'ફૂડ પ્રોસેસિંગ યુનિટ્સ',
  },
  '/assistant': {
    hi: 'किसान डॉक्टर, एआई कृषि सलाहकार',
    en: 'Kisan Doctor, AI Farm Advisor',
    mr: 'शेतकरी डॉक्टर, पीक सल्लागार',
    pa: 'ਕਿਸਾਨ ਡਾਕਟਰ, ਫਸਲ ਸਲਾਹਕਾਰ',
    gu: 'કિસાન ડૉક્ટર, પાક સલાહકાર',
  },
  '/waste-utilization': {
    hi: 'खराब फसल समाधान, अवशेष से कमाई',
    en: 'Crop Waste to Wealth, Spoilage Recovery',
    mr: 'पिकांचे अवशेष आणि नासाडी व्यवस्थापन',
    pa: 'ਫਸਲ ਰਹਿੰਦ-ਖੂੰਹਦ ਉਪਯੋਗ',
    gu: 'પાક કચરો વ્યવસ્થાપન',
  },
  '/analytics': {
    hi: 'फसल विश्लेषण, आय रिपोर्ट',
    en: 'Farm Analytics and Revenue',
    mr: 'शेती विश्लेषण आणि उत्पन्न',
    pa: 'ਖੇਤੀ ਵਿਸ਼ਲੇਸ਼ਣ',
    gu: 'ખેતી વિશ્લેષણ',
  },
}

const VOICE_STORAGE_KEY = 'agriflow_voice_navigation_enabled'

export function isVoiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoiceEnabled(): boolean {
  if (!isVoiceSupported()) return false
  const val = localStorage.getItem(VOICE_STORAGE_KEY)
  // Default to enabled for farmers!
  return val === null ? true : val === 'true'
}

export function setVoiceEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(VOICE_STORAGE_KEY, String(enabled))
  }
}

/**
 * Pronounces a spoken text message in the user's selected language.
 */
export function speakText(text: string, langCode: string = 'hi'): void {
  if (!isVoiceSupported() || !getVoiceEnabled()) return

  try {
    window.speechSynthesis.cancel() // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text)

    // Map internal language codes to BCP 47 voice tags
    const langMap: Record<string, string> = {
      hi: 'hi-IN',
      en: 'en-IN',
      mr: 'mr-IN',
      pa: 'pa-IN',
      gu: 'gu-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      bn: 'bn-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      or: 'or-IN',
      ur: 'ur-IN',
    }
    utterance.lang = langMap[langCode] || 'hi-IN'
    utterance.rate = 0.95 // Slightly slower for clear rural understanding
    utterance.pitch = 1.0

    // Try to find native voice if available in browser
    const voices = window.speechSynthesis.getVoices()
    const matchingVoice = voices.find(
      (v) => v.lang.startsWith(utterance.lang) || v.lang.startsWith(langCode)
    )
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    window.speechSynthesis.speak(utterance)
  } catch (err) {
    console.warn('Voice navigation error:', err)
  }
}

/**
 * Pronounces the active tab when switching routes.
 */
export function pronounceTab(pathname: string, language: string = 'hi'): void {
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/dashboard'
  const entry = TAB_PRONUNCIATIONS[cleanPath]
  if (!entry) return

  const targetLang = language as keyof typeof entry
  const spokenText = entry[targetLang] || entry.hi || entry.en
  if (spokenText) {
    speakText(spokenText, language)
  }
}


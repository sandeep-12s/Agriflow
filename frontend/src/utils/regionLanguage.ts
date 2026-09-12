import { Language } from '../i18n'
import { detectFarmerRegion, DetectedRegionResponse } from '../api/client'

// Indian States and their official agricultural regional languages
const STATE_LANGUAGE_MAP: Record<string, { language: Language; state: string; nativeName: string }> = {
  punjab: { language: 'pa', state: 'Punjab', nativeName: 'ਪੰਜਾਬੀ' },
  maharashtra: { language: 'mr', state: 'Maharashtra', nativeName: 'मराठी' },
  gujarat: { language: 'gu', state: 'Gujarat', nativeName: 'ગુજરાતી' },
  'andhra pradesh': { language: 'te', state: 'Andhra Pradesh', nativeName: 'తెలుగు' },
  telangana: { language: 'te', state: 'Telangana', nativeName: 'తెలుగు' },
  'tamil nadu': { language: 'ta', state: 'Tamil Nadu', nativeName: 'தமிழ்' },
  puducherry: { language: 'ta', state: 'Tamil Nadu', nativeName: 'தமிழ்' },
  karnataka: { language: 'kn', state: 'Karnataka', nativeName: 'ಕನ್ನಡ' },
  'west bengal': { language: 'bn', state: 'West Bengal', nativeName: 'বাংলা' },
  'uttar pradesh': { language: 'hi', state: 'Uttar Pradesh', nativeName: 'हिन्दी' },
  'madhya pradesh': { language: 'hi', state: 'Madhya Pradesh', nativeName: 'हिन्दी' },
  rajasthan: { language: 'hi', state: 'Rajasthan', nativeName: 'हिन्दी' },
  bihar: { language: 'hi', state: 'Bihar', nativeName: 'हिन्दी' },
  haryana: { language: 'hi', state: 'Haryana', nativeName: 'हिन्दी' },
  delhi: { language: 'hi', state: 'Delhi', nativeName: 'हिन्दी' },
  'himachal pradesh': { language: 'hi', state: 'Himachal Pradesh', nativeName: 'हिन्दी' },
  uttarakhand: { language: 'hi', state: 'Uttarakhand', nativeName: 'हिन्दी' },
  jharkhand: { language: 'hi', state: 'Jharkhand', nativeName: 'हिन्दी' },
  chhattisgarh: { language: 'hi', state: 'Chhattisgarh', nativeName: 'हिन्दी' },
  kerala: { language: 'ml', state: 'Kerala', nativeName: 'മലയാളം' },
  odisha: { language: 'or', state: 'Odisha', nativeName: 'ଓଡ଼ିଆ' },
  orissa: { language: 'or', state: 'Odisha', nativeName: 'ଓଡ଼ିଆ' },
  assam: { language: 'as', state: 'Assam', nativeName: 'অসমীয়া' },
  'jammu and kashmir': { language: 'ks', state: 'Jammu & Kashmir', nativeName: 'कॉशुर' },
  'jammu & kashmir': { language: 'ks', state: 'Jammu & Kashmir', nativeName: 'कॉशुर' },
  kashmir: { language: 'ks', state: 'Jammu & Kashmir', nativeName: 'कॉशुर' },
  ladakh: { language: 'ur', state: 'Ladakh', nativeName: 'اردو' },
  goa: { language: 'kok', state: 'Goa', nativeName: 'कोंकणी' },
  sikkim: { language: 'ne', state: 'Sikkim', nativeName: 'नेपाली' },
  mithila: { language: 'mai', state: 'Bihar (Mithila)', nativeName: 'मैथिली' },
}

// Major agricultural cities/districts mapped to their state and language
const CITY_TO_STATE: Record<string, { state: string; language: Language; nativeName: string }> = {
  // Punjab
  ludhiana: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  amritsar: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  jalandhar: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  patiala: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  bathinda: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  sangrur: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  mohali: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  khanna: { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' },
  // Maharashtra
  nashik: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  nasik: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  pune: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  mumbai: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  nagpur: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  solapur: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  kolhapur: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  aurangabad: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  sambhajinagar: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  ahmednagar: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  amravati: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  jalgaon: { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' },
  // Gujarat
  ahmedabad: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  surat: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  vadodara: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  rajkot: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  bhavnagar: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  jamnagar: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  gandhinagar: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  anand: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  kutch: { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' },
  // Andhra Pradesh & Telangana
  hyderabad: { state: 'Telangana', language: 'te', nativeName: 'తెలుగు' },
  guntur: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  visakhapatnam: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  vizag: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  vijayawada: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  tirupati: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  warangal: { state: 'Telangana', language: 'te', nativeName: 'తెలుగు' },
  nellore: { state: 'Andhra Pradesh', language: 'te', nativeName: 'తెలుగు' },
  // Tamil Nadu
  chennai: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  coimbatore: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  madurai: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  salem: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  tiruchirappalli: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  trichy: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  tiruppur: { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' },
  // Karnataka
  bengaluru: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  bangalore: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  mysuru: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  mysore: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  hubballi: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  hubli: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  dharwad: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  belagavi: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  mangaluru: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  mangalore: { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' },
  // West Bengal
  kolkata: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  siliguri: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  asansol: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  durgapur: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  bardhaman: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  malda: { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' },
  // Hindi Heartlands
  lucknow: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  kanpur: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  varanasi: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  agra: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  bareilly: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  meerut: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  prayagraj: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  allahabad: { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  indore: { state: 'Madhya Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  bhopal: { state: 'Madhya Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  ujjain: { state: 'Madhya Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  gwalior: { state: 'Madhya Pradesh', language: 'hi', nativeName: 'हिन्दी' },
  patna: { state: 'Bihar', language: 'hi', nativeName: 'हिन्दी' },
  muzaffarpur: { state: 'Bihar', language: 'hi', nativeName: 'हिन्दी' },
  gaya: { state: 'Bihar', language: 'hi', nativeName: 'हिन्दी' },
  jaipur: { state: 'Rajasthan', language: 'hi', nativeName: 'हिन्दी' },
  jodhpur: { state: 'Rajasthan', language: 'hi', nativeName: 'हिन्दी' },
  kota: { state: 'Rajasthan', language: 'hi', nativeName: 'हिन्दी' },
  karnal: { state: 'Haryana', language: 'hi', nativeName: 'हिन्दी' },
  hisar: { state: 'Haryana', language: 'hi', nativeName: 'हिन्दी' },
  // Kerala
  kochi: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  cochin: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  thiruvananthapuram: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  trivandrum: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  kozhikode: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  calicut: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  thrissur: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  palakkad: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  kollam: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  kottayam: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  wayanad: { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' },
  // Odisha
  bhubaneswar: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  cuttack: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  sambalpur: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  rourkela: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  puri: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  balasore: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  berhampur: { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' },
  // Assam
  guwahati: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  silchar: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  dibrugarh: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  jorhat: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  nagaon: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  tezpur: { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' },
  // Jammu & Kashmir
  srinagar: { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' },
  jammu: { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' },
  anantnag: { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' },
  baramulla: { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' },
  sopore: { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' },
  // Goa
  panaji: { state: 'Goa', language: 'kok', nativeName: 'कोंकणी' },
  margao: { state: 'Goa', language: 'kok', nativeName: 'कोंकणी' },
  mapusa: { state: 'Goa', language: 'kok', nativeName: 'कोंकणी' },
  vasco: { state: 'Goa', language: 'kok', nativeName: 'कोंकणी' },
  // Sikkim
  gangtok: { state: 'Sikkim', language: 'ne', nativeName: 'नेपाली' },
  namchi: { state: 'Sikkim', language: 'ne', nativeName: 'नेपाली' },
  gezing: { state: 'Sikkim', language: 'ne', nativeName: 'नेपाली' },
  // Mithila (Bihar)
  darbhanga: { state: 'Bihar (Mithila)', language: 'mai', nativeName: 'मैथिली' },
  madhubani: { state: 'Bihar (Mithila)', language: 'mai', nativeName: 'मैथिली' },
  samastipur: { state: 'Bihar (Mithila)', language: 'mai', nativeName: 'मैथिली' },
  saharsa: { state: 'Bihar (Mithila)', language: 'mai', nativeName: 'मैथिली' },
}

export function detectLanguageFromLocationText(text: string): { state: string; language: Language; nativeName: string } | null {
  if (!text) return null
  const lower = text.toLowerCase().trim()

  // Match state
  for (const [sKey, info] of Object.entries(STATE_LANGUAGE_MAP)) {
    if (lower.includes(sKey)) {
      return info
    }
  }

  // Match city
  for (const [cKey, info] of Object.entries(CITY_TO_STATE)) {
    if (lower.includes(cKey)) {
      return info
    }
  }

  return null
}

export function detectLanguageFromCoordinates(lat: number, lon: number): { state: string; language: Language; nativeName: string } | null {
  // Punjab
  if (lat >= 29.5 && lat <= 32.5 && lon >= 74.0 && lon <= 77.0) {
    return { state: 'Punjab', language: 'pa', nativeName: 'ਪੰਜਾਬੀ' }
  }
  // Maharashtra
  if (lat >= 15.5 && lat <= 22.2 && lon >= 72.5 && lon <= 81.0) {
    return { state: 'Maharashtra', language: 'mr', nativeName: 'मराठी' }
  }
  // Gujarat
  if (lat >= 20.0 && lat <= 24.8 && lon >= 68.0 && lon <= 74.5) {
    return { state: 'Gujarat', language: 'gu', nativeName: 'ગુજરાતી' }
  }
  // Karnataka
  if (lat >= 11.5 && lat <= 18.5 && lon >= 74.0 && lon <= 78.6) {
    return { state: 'Karnataka', language: 'kn', nativeName: 'ಕನ್ನಡ' }
  }
  // Tamil Nadu
  if (lat >= 8.0 && lat <= 13.5 && lon >= 76.2 && lon <= 80.4) {
    return { state: 'Tamil Nadu', language: 'ta', nativeName: 'தமிழ்' }
  }
  // Andhra Pradesh & Telangana
  if (lat >= 13.5 && lat <= 19.9 && lon >= 77.0 && lon <= 84.8) {
    return { state: 'Andhra Pradesh / Telangana', language: 'te', nativeName: 'తెలుగు' }
  }
  // West Bengal
  if (lat >= 21.5 && lat <= 27.3 && lon >= 85.8 && lon <= 89.9) {
    return { state: 'West Bengal', language: 'bn', nativeName: 'বাংলা' }
  }
  // Madhya Pradesh
  if (lat >= 21.0 && lat <= 26.5 && lon >= 74.5 && lon <= 82.5) {
    return { state: 'Madhya Pradesh', language: 'hi', nativeName: 'हिन्दी' }
  }
  // Rajasthan
  if (lat >= 23.5 && lat <= 30.0 && lon >= 69.5 && lon <= 78.0) {
    return { state: 'Rajasthan', language: 'hi', nativeName: 'हिन्दी' }
  }
  // Bihar
  if (lat >= 24.0 && lat <= 27.5 && lon >= 83.5 && lon <= 88.5) {
    return { state: 'Bihar', language: 'hi', nativeName: 'हिन्दी' }
  }
  // Haryana
  if (lat >= 27.5 && lat <= 30.5 && lon >= 74.5 && lon <= 77.5) {
    return { state: 'Haryana', language: 'hi', nativeName: 'हिन्दी' }
  }
  // Uttar Pradesh
  if (lat >= 23.8 && lat <= 30.5 && lon >= 77.0 && lon <= 84.5) {
    return { state: 'Uttar Pradesh', language: 'hi', nativeName: 'हिन्दी' }
  }
  // Kerala
  if (lat >= 8.2 && lat <= 12.8 && lon >= 74.8 && lon <= 77.5) {
    return { state: 'Kerala', language: 'ml', nativeName: 'മലയാളം' }
  }
  // Odisha
  if (lat >= 17.8 && lat <= 22.5 && lon >= 81.4 && lon <= 87.5) {
    return { state: 'Odisha', language: 'or', nativeName: 'ଓଡ଼ିଆ' }
  }
  // Assam
  if (lat >= 24.1 && lat <= 28.0 && lon >= 89.7 && lon <= 96.0) {
    return { state: 'Assam', language: 'as', nativeName: 'অসমীয়া' }
  }
  // Jammu & Kashmir
  if (lat >= 32.2 && lat <= 37.0 && lon >= 73.0 && lon <= 80.5) {
    return { state: 'Jammu & Kashmir', language: 'ks', nativeName: 'कॉशुर' }
  }
  // Goa
  if (lat >= 14.9 && lat <= 15.8 && lon >= 73.6 && lon <= 74.4) {
    return { state: 'Goa', language: 'kok', nativeName: 'कोंकणी' }
  }
  // Sikkim
  if (lat >= 27.0 && lat <= 28.1 && lon >= 88.0 && lon <= 88.9) {
    return { state: 'Sikkim', language: 'ne', nativeName: 'नेपाली' }
  }

  return null
}

export async function detectRegionAndLanguage(opts?: {
  coords?: { latitude: number; longitude: number }
  locationText?: string
}): Promise<{ state: string; district?: string; language: Language; nativeName: string }> {
  // 1. Check local text
  if (opts?.locationText) {
    const matched = detectLanguageFromLocationText(opts.locationText)
    if (matched) return matched
  }

  // 2. Check local coords
  if (opts?.coords) {
    const matched = detectLanguageFromCoordinates(opts.coords.latitude, opts.coords.longitude)
    if (matched) return matched
  }

  // 3. Fall back to server API
  try {
    const res: DetectedRegionResponse = await detectFarmerRegion({
      latitude: opts?.coords?.latitude,
      longitude: opts?.coords?.longitude,
      location: opts?.locationText,
    })
    return {
      state: res.state,
      district: res.district,
      language: (res.language as Language) || 'hi',
      nativeName: res.language_native || 'हिन्दी',
    }
  } catch {
    // Default fallback to Hindi
    return {
      state: 'India',
      district: 'Regional District',
      language: 'hi',
      nativeName: 'हिन्दी',
    }
  }
}


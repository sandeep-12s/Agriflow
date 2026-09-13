import { useState, useEffect, useCallback } from 'react'
import { getWeather, WeatherResponse } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { speakText } from '../services/voice'

interface WeatherWidgetProps {
  defaultLocationName?: string
}

// Fallback coordinates for major farming belt (Northern/Central India)
const DEFAULT_LAT = 28.6139
const DEFAULT_LON = 77.2090

export default function WeatherWidget({ defaultLocationName }: WeatherWidgetProps) {
  const { token, language, t } = useAuth()
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  })
  const [locationName, setLocationName] = useState(defaultLocationName || t('myFarm'))
  const [showAdvisories, setShowAdvisories] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

  // Update location name if language changes and no custom location was passed
  useEffect(() => {
    if (!defaultLocationName || defaultLocationName === 'Field / खेत') {
      setLocationName(t('myFarm'))
    }
  }, [language, defaultLocationName, t])

  const fetchWeatherForCoords = useCallback(
    async (lat: number, lon: number) => {
      if (!token) return
      setLoading(true)
      setError('')
      try {
        const data = await getWeather(token, lat, lon)
        setWeather(data)
      } catch (err) {
        console.warn('Weather fetch failed:', err)
        setError(t('weatherLoadError'))
      } finally {
        setLoading(false)
      }
    },
    [token, t]
  )

  // Geolocation detection
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      fetchWeatherForCoords(coords.lat, coords.lon)
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = Number(pos.coords.latitude.toFixed(4))
        const lon = Number(pos.coords.longitude.toFixed(4))
        setCoords({ lat, lon })
        setLocationName(`📍 ${t('myFarm')}`)
        fetchWeatherForCoords(lat, lon)
      },
      (err) => {
        setIsLocating(false)
        console.log('Geolocation not available, using default farm coordinates:', err.message)
        fetchWeatherForCoords(coords.lat, coords.lon)
      },
      { timeout: 8000 }
    )
  }, [coords.lat, coords.lon, fetchWeatherForCoords, t])

  useEffect(() => {
    detectLocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Localized weather condition description
  const getLocalizedCondition = (code?: number, fallbackText?: string): string => {
    if (code === undefined && fallbackText) return fallbackText
    if (language === 'hi') {
      switch (code) {
        case 0: return 'साफ़ आसमान'
        case 1: return 'मुख्य रूप से साफ़'
        case 2: return 'हल्के बादल'
        case 3: return 'घने बादल'
        case 45: case 48: return 'कोहरा'
        case 51: case 53: case 55: return 'हल्की बूंदाबांदी'
        case 61: case 63: return 'मध्यम बारिश'
        case 65: return 'भारी बारिश'
        case 80: case 81: case 82: return 'तेज बौछारें'
        case 95: case 96: case 99: return 'आंधी और तूफान'
        default: return fallbackText || 'सामान्य'
      }
    }
    return fallbackText || 'Fair'
  }

  // Localized alerts translation
  const getLocalizedAlert = (title: string, message: string) => {
    if (language === 'hi') {
      if (title.includes('Storm') || title.includes('Heavy Rain')) {
        return {
          title: 'तूफान एवं भारी बारिश की चेतावनी',
          message: 'भारी बारिश या आंधी की संभावना है। कटी हुई फसल को सुरक्षित रखें और खेत में जल निकासी सुनिश्चित करें।'
        }
      }
      if (title.includes('Rain Forecast')) {
        return {
          title: 'वर्षा का पूर्वानुमान',
          message: 'बारिश के आसार हैं। खेत में जलभराव से बचने के लिए सिंचाई से पहले मिट्टी की नमी अवश्य जांचें।'
        }
      }
      if (title.includes('High Wind')) {
        return {
          title: 'तेज हवा का जोखिम',
          message: 'तेज हवा के झोंके संभव हैं। नर्सरी शेड नेट को सुरक्षित करें और खुले भंडारण को ढकें।'
        }
      }
      if (title.includes('Frost')) {
        return {
          title: 'पाला / ठंड का जोखिम',
          message: 'अत्यधिक ठंड और पाले की संभावना। रात में हल्की सिंचाई या मल्चिंग का उपयोग करें।'
        }
      }
      if (title.includes('Heat Stress')) {
        return {
          title: 'लू / अत्यधिक गर्मी की सलाह',
          message: 'उच्च तापमान की चेतावनी। वाष्पीकरण से बचने के लिए सुबह या शाम को ही सिंचाई करें।'
        }
      }
    }
    return { title, message }
  }

  // Derive spray & irrigation advisory based on current data
  const isRain =
    weather &&
    [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.weather_code)
  const isHighWind = weather && weather.wind_speed_kmh >= 25
  const isExtremeHeat = weather && weather.temperature_c >= 38

  const sprayAdvisory = isRain || isHighWind
    ? {
        safe: false,
        badgeText: t('delayBadge'),
        badgeTitle: `❌ ${t('delaySprayTitle')}`,
        detail: t('delaySprayDesc'),
      }
    : {
        safe: true,
        badgeText: t('optimalBadge'),
        badgeTitle: `✅ ${t('safeToSprayTitle')}`,
        detail: t('safeToSprayDesc'),
      }

  const irrigationAdvisory = isRain
    ? {
        safe: false,
        badgeText: t('postponeBadge'),
        badgeTitle: `⏸️ ${t('postponeIrrigationTitle')}`,
        detail: t('postponeIrrigationDesc'),
      }
    : isExtremeHeat
    ? {
        safe: true,
        badgeText: t('adviceBadge'),
        badgeTitle: `💧 ${t('heatIrrigationTitle')}`,
        detail: t('heatIrrigationDesc'),
      }
    : {
        safe: true,
        badgeText: t('adviceBadge'),
        badgeTitle: `🟢 ${t('normalIrrigationTitle')}`,
        detail: t('normalIrrigationDesc'),
      }

  const handleSpeakAdvisory = () => {
    if (!weather) return
    const condition = getLocalizedCondition(weather.weather_code, weather.condition_text)
    const text =
      language === 'hi'
        ? `वर्तमान तापमान ${Math.round(weather.temperature_c)} डिग्री सेल्सियस है। ${condition}। ${
            sprayAdvisory.safe
              ? 'दवा छिड़काव के लिए आज का मौसम उत्तम है।'
              : 'दवा का छिड़काव आज रोकें, मौसम अनुकूल नहीं है।'
          } ${
            isRain
              ? 'बारिश के कारण सिंचाई स्थगित रखें।'
              : 'सामान्य सिंचाई जारी रखें।'
          }`
        : `Current temperature is ${Math.round(
            weather.temperature_c
          )} degrees Celsius. ${condition}. ${
            sprayAdvisory.safe
              ? 'Safe to spray chemicals today.'
              : 'Delay chemical spray today.'
          } ${
            isRain
              ? 'Postpone irrigation due to expected rain.'
              : 'Normal irrigation recommended.'
          }`
    speakText(text, language)
  }

  const getWeatherIcon = (code?: number) => {
    if (code === undefined) return '🌤️'
    if (code === 0) return '☀️'
    if ([1, 2].includes(code)) return '🌤️'
    if (code === 3) return '☁️'
    if ([45, 48].includes(code)) return '🌫️'
    if ([51, 53, 55, 61, 63, 80, 81].includes(code)) return '🌧️'
    if ([65, 82].includes(code)) return '⛈️'
    if ([95, 96, 99].includes(code)) return '⚡'
    return '🌦️'
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white rounded-2xl border-2 border-emerald-600/20 p-4 md:p-5 shadow-sm mb-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getWeatherIcon(weather?.weather_code)}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-soil text-base md:text-lg">
                {t('farmWeatherTitle')}
              </h2>
            </div>
            <p className="text-xs text-soil/60 font-medium">{locationName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={detectLocation}
            disabled={isLocating || loading}
            className="text-xs font-semibold text-leaf bg-leaf/10 hover:bg-leaf/20 border border-leaf/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            title="Update location with GPS"
          >
            <span>{isLocating ? '🔄' : '📍'}</span>
            <span>{isLocating ? t('locating') : t('updateLocation')}</span>
          </button>

          {weather && (
            <button
              onClick={handleSpeakAdvisory}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              title="Listen to weather advisory"
            >
              <span>🔊</span>
              <span>{t('listenAdvisory')}</span>
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-4 text-center text-xs font-medium text-soil/60 animate-pulse">
          🌤️ {t('loadingWeather')}
        </div>
      )}

      {error && !loading && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          {error}
        </div>
      )}

      {weather && !loading && (
        <>
          {/* Main Weather Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3">
            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">{t('temperature')}</p>
              <p className="text-xl md:text-2xl font-black text-emerald-950 mt-0.5">
                {Math.round(weather.temperature_c)}°C
              </p>
              <p className="text-[11px] text-soil/60 mt-0.5 truncate">
                {getLocalizedCondition(weather.weather_code, weather.condition_text)}
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">{t('humidity')}</p>
              <p className="text-xl md:text-2xl font-black text-blue-900 mt-0.5">
                {weather.humidity_percent}%
              </p>
              <p className="text-[11px] text-blue-700/70 mt-0.5">
                {weather.humidity_percent > 75 ? `💧 ${t('highHumidity')}` : t('normalHumidity')}
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">{t('windSpeed')}</p>
              <p className="text-xl md:text-2xl font-black text-teal-900 mt-0.5">
                {Math.round(weather.wind_speed_kmh)} <span className="text-xs font-normal">km/h</span>
              </p>
              <p className="text-[11px] text-teal-700/70 mt-0.5">
                {isHighWind ? `💨 ${t('highWind')}` : t('calmWind')}
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">{t('feelsLike')}</p>
              <p className="text-xl md:text-2xl font-black text-amber-950 mt-0.5">
                {Math.round(weather.apparent_temperature_c)}°C
              </p>
              <p className="text-[11px] text-amber-700/70 mt-0.5">
                {weather.apparent_temperature_c > 35 ? t('hotWeather') : t('normalWeather')}
              </p>
            </div>
          </div>

          {/* Core Agricultural Action Advisories for Farmer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
            {/* Spray Advisory Card */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                sprayAdvisory.safe
                  ? 'bg-emerald-50/90 border-emerald-300/80 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-300/80 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wide">
                  🚜 {t('sprayAdvisoryHeader')}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    sprayAdvisory.safe ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {sprayAdvisory.badgeText}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1">{sprayAdvisory.badgeTitle}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{sprayAdvisory.detail}</p>
            </div>

            {/* Irrigation Advisory Card */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                irrigationAdvisory.safe
                  ? 'bg-blue-50/90 border-blue-300/80 text-blue-950'
                  : 'bg-amber-50/90 border-amber-300/80 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wide">
                  💧 {t('irrigationAdvisoryHeader')}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    irrigationAdvisory.safe ? 'bg-blue-200 text-blue-900' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {irrigationAdvisory.badgeText}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1">{irrigationAdvisory.badgeTitle}</p>
              <p className="text-[11px] opacity-80 mt-0.5">{irrigationAdvisory.detail}</p>
            </div>
          </div>

          {/* Toggle for Additional Advisories */}
          {weather.advisory_alerts && weather.advisory_alerts.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowAdvisories(!showAdvisories)}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5"
              >
                <span>{showAdvisories ? `▲ ${t('hideAlerts')}` : `▼ ${t('viewAlerts')}`}</span>
              </button>

              {showAdvisories && (
                <div className="mt-2.5 space-y-2">
                  {weather.advisory_alerts.map((alert, idx) => {
                    const localized = getLocalizedAlert(alert.title, alert.message)
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs ${
                          alert.level === 'high'
                            ? 'bg-red-50 border-red-200 text-red-900'
                            : alert.level === 'medium'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        }`}
                      >
                        <p className="font-bold flex items-center gap-1.5">
                          <span>{alert.level === 'high' ? '⚠️' : alert.level === 'medium' ? '⚡' : '🌾'}</span>
                          {localized.title}
                        </p>
                        <p className="text-[11px] mt-0.5 opacity-90">{localized.message}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

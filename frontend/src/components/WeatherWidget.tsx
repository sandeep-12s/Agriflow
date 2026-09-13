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

export default function WeatherWidget({ defaultLocationName = 'Field / खेत' }: WeatherWidgetProps) {
  const { token, language } = useAuth()
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lon: number }>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
  })
  const [locationName, setLocationName] = useState(defaultLocationName)
  const [showAdvisories, setShowAdvisories] = useState(false)
  const [isLocating, setIsLocating] = useState(false)

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
        setError('मौसम जानकारी लोड नहीं हो सकी (Could not load weather).')
      } finally {
        setLoading(false)
      }
    },
    [token]
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
        setLocationName('📍 My Farm (मेरा खेत)')
        fetchWeatherForCoords(lat, lon)
      },
      (err) => {
        setIsLocating(false)
        console.log('Geolocation not available, using default farm coordinates:', err.message)
        fetchWeatherForCoords(coords.lat, coords.lon)
      },
      { timeout: 8000 }
    )
  }, [coords.lat, coords.lon, fetchWeatherForCoords])

  useEffect(() => {
    detectLocation()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive spray & irrigation advisory based on current data
  const isRain =
    weather &&
    [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.weather_code)
  const isHighWind = weather && weather.wind_speed_kmh >= 25
  const isExtremeHeat = weather && weather.temperature_c >= 38

  const sprayAdvisory = isRain || isHighWind
    ? {
        safe: false,
        badge: '❌ दवा छिड़काव रोकें (Delay Spray)',
        detail: 'बारिश या तेज हवा के कारण कीटनाशक/उर्वरक धुल जाएगा। (Rain or high wind will wash off chemicals).',
      }
    : {
        safe: true,
        badge: '✅ दवा छिड़काव के लिए उत्तम (Safe to Spray)',
        detail: 'हवा शांत है और धूप अनुकूल है। दवा पत्तियों पर अच्छे से असर करेगी। (Calm wind & clear sky: optimal absorption).',
      }

  const irrigationAdvisory = isRain
    ? {
        safe: false,
        badge: '⏸️ सिंचाई स्थगित करें (Postpone Irrigation)',
        detail: 'वर्षा होने के आसार हैं। खेत में अतिरिक्त पानी भरने से फसल को नुकसान हो सकता है।',
      }
    : isExtremeHeat
    ? {
        safe: true,
        badge: '💧 सुबह या शाम हल्की सिंचाई करें (Irrigate Early/Late)',
        detail: 'तेज धूप और उच्च तापमान के कारण दोपहर में सिंचाई न करें। वाष्पीकरण से बचें।',
      }
    : {
        safe: true,
        badge: '🟢 सामान्य सिंचाई जारी रखें (Normal Irrigation)',
        detail: 'मिट्टी की नमी देख कर जरूरत अनुसार पानी दें। (Check soil moisture before watering).',
      }

  const handleSpeakAdvisory = () => {
    if (!weather) return
    const text =
      language === 'hi'
        ? `वर्तमान तापमान ${Math.round(weather.temperature_c)} डिग्री सेल्सियस है। ${weather.condition_text}। ${
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
          )} degrees Celsius. ${weather.condition_text}. ${
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
                खेत का मौसम और कृषि सलाह
              </h2>
              <span className="text-xs text-soil/50 font-medium">| Farm Weather</span>
            </div>
            <p className="text-xs text-soil/60 font-medium">{locationName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={detectLocation}
            disabled={isLocating || loading}
            className="text-xs font-semibold text-leaf bg-leaf/10 hover:bg-leaf/20 border border-leaf/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            title="Update weather with GPS"
          >
            <span>{isLocating ? '🔄' : '📍'}</span>
            <span>{isLocating ? 'स्थान खोज रहे हैं…' : 'स्थान अपडेट करें'}</span>
          </button>

          {weather && (
            <button
              onClick={handleSpeakAdvisory}
              className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-xs"
              title="Listen to weather advisory"
            >
              <span>🔊</span>
              <span>बोलकर सुनें</span>
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="py-4 text-center text-xs font-medium text-soil/60 animate-pulse">
          🌤️ मौसम पूर्वानुमान प्राप्त किया जा रहा है (Loading live weather & advisories)…
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
              <p className="text-[11px] font-semibold text-soil/60">तापमान (Temp)</p>
              <p className="text-xl md:text-2xl font-black text-emerald-950 mt-0.5">
                {Math.round(weather.temperature_c)}°C
              </p>
              <p className="text-[11px] text-soil/60 mt-0.5 truncate">{weather.condition_text}</p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">नमी (Humidity)</p>
              <p className="text-xl md:text-2xl font-black text-blue-900 mt-0.5">
                {weather.humidity_percent}%
              </p>
              <p className="text-[11px] text-blue-700/70 mt-0.5">
                {weather.humidity_percent > 75 ? '💧 अधिक नमी' : 'हवा में सामान्य नमी'}
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">हवा की गति (Wind)</p>
              <p className="text-xl md:text-2xl font-black text-teal-900 mt-0.5">
                {Math.round(weather.wind_speed_kmh)} <span className="text-xs font-normal">km/h</span>
              </p>
              <p className="text-[11px] text-teal-700/70 mt-0.5">
                {isHighWind ? '💨 तेज हवा' : 'हवा शांत'}
              </p>
            </div>

            <div className="bg-white/90 border border-emerald-100 rounded-xl p-3 shadow-xs">
              <p className="text-[11px] font-semibold text-soil/60">महसूस (Feels like)</p>
              <p className="text-xl md:text-2xl font-black text-amber-950 mt-0.5">
                {Math.round(weather.apparent_temperature_c)}°C
              </p>
              <p className="text-[11px] text-amber-700/70 mt-0.5">
                {weather.apparent_temperature_c > 35 ? 'गर्मी' : 'सामान्य'}
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
                  🚜 कीटनाशक / छिड़काव सलाह (Spray Advice)
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    sprayAdvisory.safe ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {sprayAdvisory.safe ? 'अनुकूल' : 'रोकें'}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1">{sprayAdvisory.badge}</p>
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
                  💧 सिंचाई सलाह (Irrigation Advice)
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    irrigationAdvisory.safe ? 'bg-blue-200 text-blue-900' : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {irrigationAdvisory.safe ? 'सलाह' : 'स्थगित'}
                </span>
              </div>
              <p className="text-xs font-semibold mt-1">{irrigationAdvisory.badge}</p>
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
                <span>{showAdvisories ? '▲ छुपाएं' : '▼ कृषि मौसम चेतावनी और विवरण देखें (More Alerts)'}</span>
              </button>

              {showAdvisories && (
                <div className="mt-2.5 space-y-2">
                  {weather.advisory_alerts.map((alert, idx) => (
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
                        {alert.title}
                      </p>
                      <p className="text-[11px] mt-0.5 opacity-90">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

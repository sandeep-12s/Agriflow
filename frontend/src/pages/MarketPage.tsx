import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import {
  listCrops,
  compareCropPrices,
  getLiveMarketPrices,
  getRegionalMandiFeed,
  getWeather,
  CropPriceRow,
  LiveMarketPrice,
  WeatherResponse,
} from '../api/client'

function trendArrow(trend: string) {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  if (trend === 'flat') return '→'
  return '–'
}

function trendColor(trend: string) {
  if (trend === 'up') return 'text-leaf'
  if (trend === 'down') return 'text-red-600'
  return 'text-soil/60'
}

function MarketPage() {
  const { token, logout, t, autoDetectLanguage, detectedRegion } = useAuth()
  const navigate = useNavigate()
  const [crops, setCrops] = useState<string[]>([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [rows, setRows] = useState<CropPriceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [livePrices, setLivePrices] = useState<LiveMarketPrice[]>([])
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Regional Mandi Feed
  const [regionalFeed, setRegionalFeed] = useState<{
    region_title: string
    state: string
    district: string
    crops_count: number
    prices: LiveMarketPrice[]
  } | null>(null)
  const [regionalLoading, setRegionalLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!token) return
    listCrops(token)
      .then((list) => {
        setCrops(list)
        if (list.length > 0) setSelectedCrop(list[0])
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load the crop list.')
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Load initial regional mandi feed
  useEffect(() => {
    if (!token) return
    setRegionalLoading(true)
    getRegionalMandiFeed(token, coords ? { latitude: coords.lat, longitude: coords.lng } : {})
      .then((res) => {
        setRegionalFeed(res)
      })
      .catch(() => {
        // Silently continue with crop-specific feed
      })
      .finally(() => setRegionalLoading(false))
  }, [token, coords])

  useEffect(() => {
    if (!token || !selectedCrop) return
    setLoading(true)
    compareCropPrices(token, selectedCrop)
      .then(setRows)
      .catch(() => setError('Could not load prices for this crop.'))
      .finally(() => setLoading(false))
  }, [token, selectedCrop])

  useEffect(() => {
    if (!token || !selectedCrop) return
    getLiveMarketPrices(
      token,
      selectedCrop,
      regionalFeed?.state,
      regionalFeed?.district,
      coords?.lat,
      coords?.lng
    )
      .then(setLivePrices)
      .catch(() => setLivePrices([]))
  }, [token, selectedCrop, regionalFeed, coords])

  const requestLocation = () => {
    if (!token || !navigator.geolocation) {
      setError(t('locationUnavailable'))
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude })
        getWeather(token, c.latitude, c.longitude)
          .then(setWeather)
          .catch(() => setError(t('weatherUnavailable')))
          .finally(() => setLocationLoading(false))

        // Auto-detect farmer region & auto-set state language
        autoDetectLanguage({ coords: { latitude: c.latitude, longitude: c.longitude } })
          .catch(() => {})

        // Re-fetch regional feed with GPS location
        setRegionalLoading(true)
        getRegionalMandiFeed(token, { latitude: c.latitude, longitude: c.longitude })
          .then((res) => {
            setRegionalFeed(res)
          })
          .catch(() => {})
          .finally(() => setRegionalLoading(false))
      },
      () => {
        setLocationLoading(false)
        setError(t('locationDenied'))
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const filteredRegionalPrices = (regionalFeed?.prices || []).filter(
    (p) =>
      p.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.variety && p.variety.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.market_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Layout>
      {/* Header & Geolocation Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-soil flex items-center gap-2">
            <span>{t('marketPrices')}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE APMC MANDI FEED
            </span>
          </h1>
          <p className="text-xs text-soil/60 mt-0.5">
            Real-time daily modal mandi prices, arrivals, and price benchmarks across Indian agricultural markets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {detectedRegion && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf bg-leaf/10 border border-leaf/20 px-2.5 py-1.5 rounded-xl shadow-xs">
              <span>📍</span>
              <span>{detectedRegion.state}</span>
            </span>
          )}

          <button
            type="button"
            onClick={requestLocation}
            disabled={locationLoading}
            className="flex items-center gap-1.5 border border-leaf text-leaf rounded-xl px-3 py-2 text-xs font-bold hover:bg-leaf/5 disabled:opacity-60 transition shadow-xs"
          >
            <span>📍</span>
            <span>{locationLoading ? t('findingLocation') : 'Detect My Location'}</span>
          </button>

          {crops.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-soil/60 hidden sm:inline">Compare:</span>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                aria-label="Select crop"
                className="border border-soil/20 rounded-xl px-3 py-2 bg-white text-xs font-semibold text-soil focus:outline-none focus:border-leaf"
              >
                {crops.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {weather && (
        <div className="bg-leaf/10 border border-leaf/20 rounded-2xl p-4 mb-4 text-xs md:text-sm text-soil flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌤️</span>
            <strong>{weather.temperature_c}°C</strong>
            <span className="text-soil/70">feels like {weather.apparent_temperature_c}°C</span>
            <span className="text-soil/40">|</span>
            <span>{t('humidity')}: {weather.humidity_percent}%</span>
            <span className="text-soil/40">|</span>
            <span>{t('wind')}: {weather.wind_speed_kmh} km/h</span>
          </div>
          {weather.condition_text && (
            <span className="font-semibold text-leaf bg-white/70 px-2.5 py-1 rounded-lg border border-leaf/20">
              {weather.condition_text}
            </span>
          )}
        </div>
      )}

      <ErrorBanner message={error} />

      {/* SECTION 1: Regional Mandi Feed for All Crops in Farmer's Zone */}
      <div className="bg-white rounded-3xl border border-soil/10 shadow-xs p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-soil/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-soil">
                🌾 Today's Mandi Rates in Your Agricultural Zone
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-leaf text-white">
                {regionalFeed?.prices.length || 0} Crops Traded
              </span>
            </div>
            <p className="text-xs text-soil/60 mt-0.5">
              Region: <strong className="text-soil">{regionalFeed?.region_title || 'North India Regional APMC Zone'}</strong> · Official Daily Arrivals
            </p>
          </div>

          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Search crop or mandi (e.g. Potato, Onion)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf bg-husk/30"
            />
          </div>
        </div>

        {regionalLoading ? (
          <div className="py-8">
            <LoadingSpinner label="Fetching live APMC mandi rates for your region..." />
          </div>
        ) : filteredRegionalPrices.length === 0 ? (
          <div className="py-6 text-center text-xs text-soil/60">
            No crops matched your search filter.
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-husk/40 text-soil/60 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-xl">Commodity & Variety</th>
                  <th className="px-3 py-2.5">APMC Mandi</th>
                  <th className="px-3 py-2.5">Today's Modal Rate</th>
                  <th className="px-3 py-2.5">Price Range (Min - Max)</th>
                  <th className="px-3 py-2.5">Daily Volume</th>
                  <th className="px-3 py-2.5">Daily Change</th>
                  <th className="px-3 py-2.5 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soil/5">
                {filteredRegionalPrices.map((p, idx) => (
                  <tr key={`${p.commodity}-${p.market_name}-${idx}`} className="hover:bg-soil/5 transition">
                    <td className="px-3 py-3 font-bold text-soil whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-leaf"></span>
                        <span>{p.commodity}</span>
                      </div>
                      {p.variety && (
                        <span className="text-[10px] text-soil/50 block font-normal ml-3">
                          {p.variety}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-soil/80 whitespace-nowrap">
                      <span className="font-semibold text-soil">{p.market_name}</span>
                      <span className="text-[10px] text-soil/50 block">{p.district}, {p.state}</span>
                    </td>
                    <td className="px-3 py-3 font-black text-soil whitespace-nowrap text-sm">
                      ₹{p.modal_price}
                      <span className="text-[10px] font-normal text-soil/60 ml-0.5">/ {p.unit}</span>
                    </td>
                    <td className="px-3 py-3 text-soil/70 whitespace-nowrap">
                      ₹{p.min_price} – ₹{p.max_price}
                    </td>
                    <td className="px-3 py-3 text-soil/70 whitespace-nowrap font-medium">
                      {p.arrival_volume || '450 Qtl'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-bold">
                      {p.price_change && p.price_change > 0 ? (
                        <span className="text-leaf">↑ +₹{p.price_change}</span>
                      ) : p.price_change && p.price_change < 0 ? (
                        <span className="text-red-600">↓ -₹{Math.abs(p.price_change)}</span>
                      ) : (
                        <span className="text-soil/50">→ Stable</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedCrop(p.commodity)
                          window.scrollTo({ top: 400, behavior: 'smooth' })
                        }}
                        className="px-2.5 py-1 rounded-lg bg-leaf/10 hover:bg-leaf text-leaf hover:text-white font-bold text-[11px] transition"
                      >
                        Compare Mandis ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Multi-Mandi Price Comparison Table for Selected Crop */}
      <div className="bg-white rounded-3xl border border-soil/10 shadow-xs p-5 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-soil">
              Multi-Mandi Price Comparison: <span className="text-leaf">{selectedCrop}</span>
            </h2>
            <p className="text-xs text-soil/50">
              Comparing distance, prices, and demand across nearby local and district mandis.
            </p>
          </div>
          {crops.length > 0 && (
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              aria-label="Change compared crop"
              className="border border-soil/20 rounded-xl px-3 py-1.5 bg-husk/20 text-xs font-bold text-soil"
            >
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <LoadingSpinner label={t('loading')} />
        ) : rows.length === 0 ? (
          <p className="text-xs text-soil/60 py-4">{t('noPriceData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-husk/40 text-soil/60 uppercase text-[10px] font-bold">
                <tr>
                  <th className="text-left px-4 py-2.5 rounded-l-xl">{t('marketColumn')}</th>
                  <th className="text-left px-4 py-2.5">{t('distance')}</th>
                  <th className="text-left px-4 py-2.5">{t('currentPrice')}</th>
                  <th className="text-left px-4 py-2.5">{t('previousPrice')}</th>
                  <th className="text-left px-4 py-2.5">{t('change')}</th>
                  <th className="text-left px-4 py-2.5 rounded-r-xl">{t('demand')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soil/5">
                {rows.map((row) => (
                  <tr key={row.market_id} className="hover:bg-soil/5 transition">
                    <td className="px-4 py-3 font-semibold text-soil whitespace-nowrap">
                      {row.market_name}
                    </td>
                    <td className="px-4 py-3 text-soil/70 whitespace-nowrap">
                      {row.distance_km} km
                    </td>
                    <td className="px-4 py-3 font-bold text-soil whitespace-nowrap">
                      ₹{row.current_price}
                    </td>
                    <td className="px-4 py-3 text-soil/60 whitespace-nowrap">
                      {row.previous_price !== null ? `₹${row.previous_price}` : '–'}
                    </td>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${trendColor(row.trend)}`}>
                      {trendArrow(row.trend)}
                      {row.price_change !== null ? ` ₹${Math.abs(row.price_change)}` : ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.demand === 'High' ? 'bg-emerald-50 text-emerald-700' : 'bg-soil/10 text-soil/70'
                      }`}>
                        {row.demand}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Mandi Rate Feed Details */}
      {livePrices.length > 0 && (
        <div className="bg-white rounded-3xl border border-soil/10 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-soil text-sm">
              Live Mandi Network Arrivals: {selectedCrop}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-leaf/10 text-leaf">
              {livePrices[0]?.source || 'AGMARKNET / e-NAM'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-soil/5">
                {livePrices.map((price, index) => (
                  <tr key={`${price.market_name}-${index}`} className="hover:bg-soil/5">
                    <td className="px-4 py-2.5 font-semibold text-soil">{price.market_name}</td>
                    <td className="px-4 py-2.5 font-bold text-leaf">₹{price.modal_price ?? '–'} / {price.unit}</td>
                    <td className="px-4 py-2.5 text-soil/60">
                      {price.arrival_date ? `Arrival: ${price.arrival_date}` : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        ● Live
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default MarketPage

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
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [crops, setCrops] = useState<string[]>([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [rows, setRows] = useState<CropPriceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [livePrices, setLivePrices] = useState<LiveMarketPrice[]>([])
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

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
    getLiveMarketPrices(token, selectedCrop).then(setLivePrices).catch(() => setLivePrices([]))
  }, [token, selectedCrop])

  const requestLocation = () => {
    if (!token || !navigator.geolocation) {
      setError(t('locationUnavailable'))
      return
    }
    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        getWeather(token, coords.latitude, coords.longitude)
          .then(setWeather)
          .catch(() => setError(t('weatherUnavailable')))
          .finally(() => setLocationLoading(false))
      },
      () => {
        setLocationLoading(false)
        setError(t('locationDenied'))
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-soil">{t('marketPrices')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={requestLocation}
            disabled={locationLoading}
            className="border border-leaf text-leaf rounded-lg px-3 py-2 text-sm font-medium hover:bg-leaf/5 disabled:opacity-60"
          >
            {locationLoading ? t('findingLocation') : t('useMyLocation')}
          </button>
        {crops.length > 0 && (
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            aria-label="Select crop"
            className="border border-soil/20 rounded-lg px-3 py-2 bg-white"
          >
            {crops.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        </div>
      </div>

      <p className="text-xs text-soil/50 mb-4">
        {t('livePriceNote')}
      </p>

      {weather && (
        <div className="bg-leaf/10 border border-leaf/20 rounded-xl p-4 mb-4 text-sm text-soil">
          <strong>{weather.temperature_c}°C</strong> feels like {weather.apparent_temperature_c}°C
          <span className="mx-2 text-soil/40">|</span>
          {t('humidity')} {weather.humidity_percent}%
          <span className="mx-2 text-soil/40">|</span>
          {t('wind')} {weather.wind_speed_kmh} km/h
        </div>
      )}

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label={t('loading')} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-soil/60">{t('noPriceData')}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-soil/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-husk text-soil/60 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">{t('marketColumn')}</th>
                <th className="text-left px-4 py-2">{t('distance')}</th>
                <th className="text-left px-4 py-2">{t('currentPrice')}</th>
                <th className="text-left px-4 py-2">{t('previousPrice')}</th>
                <th className="text-left px-4 py-2">{t('change')}</th>
                <th className="text-left px-4 py-2">{t('demand')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.market_id} className="border-t border-soil/10">
                  <td className="px-4 py-3 font-medium text-soil whitespace-nowrap">
                    {row.market_name}
                  </td>
                  <td className="px-4 py-3 text-soil/70 whitespace-nowrap">
                    {row.distance_km} km
                  </td>
                  <td className="px-4 py-3 text-soil/70 whitespace-nowrap">
                    ₹{row.current_price}
                  </td>
                  <td className="px-4 py-3 text-soil/70 whitespace-nowrap">
                    {row.previous_price !== null ? `₹${row.previous_price}` : '–'}
                  </td>
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${trendColor(row.trend)}`}>
                    {trendArrow(row.trend)}
                    {row.price_change !== null ? ` ₹${Math.abs(row.price_change)}` : ''}
                  </td>
                  <td className="px-4 py-3 text-soil/70 whitespace-nowrap">{row.demand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {livePrices.length > 0 && (
        <div className="mt-5 bg-white rounded-2xl border border-soil/10 overflow-x-auto">
          <div className="px-4 py-3 border-b border-soil/10 font-semibold text-soil">{t('mandiRateFeed')}</div>
          <table className="w-full text-sm">
            <tbody>
              {livePrices.map((price, index) => (
                <tr key={`${price.market_name}-${index}`} className="border-t border-soil/10">
                  <td className="px-4 py-3 font-medium">{price.market_name}</td>
                  <td className="px-4 py-3">₹{price.modal_price ?? '–'} / {price.unit}</td>
                  <td className="px-4 py-3 text-xs text-soil/60">{price.source}</td>
                  <td className="px-4 py-3 text-xs">{price.is_live ? t('live') : t('demo')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}

export default MarketPage

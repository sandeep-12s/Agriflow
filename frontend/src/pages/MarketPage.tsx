import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import { listCrops, compareCropPrices, CropPriceRow } from '../api/client'

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
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [crops, setCrops] = useState<string[]>([])
  const [selectedCrop, setSelectedCrop] = useState('')
  const [rows, setRows] = useState<CropPriceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <Layout>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-soil">Market Prices</h1>
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

      <p className="text-xs text-soil/50 mb-4">
        Demo/estimated prices for hackathon demonstration — not a live mandi feed.
      </p>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label="Loading prices…" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-soil/60">No price data for this crop yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-soil/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-husk text-soil/60 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Market</th>
                <th className="text-left px-4 py-2">Distance</th>
                <th className="text-left px-4 py-2">Current Price</th>
                <th className="text-left px-4 py-2">Previous Price</th>
                <th className="text-left px-4 py-2">Change</th>
                <th className="text-left px-4 py-2">Demand</th>
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
    </Layout>
  )
}

export default MarketPage

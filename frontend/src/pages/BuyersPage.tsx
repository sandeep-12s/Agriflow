import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listBuyers, Buyer } from '../api/client'
import InteractiveMap, { MapMarkerItem } from '../components/InteractiveMap'

function BuyersPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    listBuyers(token)
      .then(setBuyers)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load buyers.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const mapItems: MapMarkerItem[] = buyers.map((b, idx) => ({
    id: b.id,
    title: b.name,
    address: b.location,
    latitude: b.latitude ?? (28.36 + idx * 0.05),
    longitude: b.longitude ?? (79.43 + idx * 0.04),
    category: 'buyer',
    badge: `₹${b.offered_price}/qtl`,
    details: [
      { label: 'Buying Crop', value: b.product },
      { label: 'Quantity Needed', value: `${b.required_quantity} Quintals` },
      { label: 'Offered Price', value: `₹${b.offered_price}/quintal` },
      { label: 'Quality', value: b.quality_requirement },
      { label: 'Contact', value: b.contact },
    ],
  }))

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-soil mb-1">{t('buyersTitle')}</h1>
          <p className="text-xs text-soil/50">{t('buyerNote')}</p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center bg-soil/5 p-1 rounded-xl border border-soil/10 text-xs font-semibold">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'list' ? 'bg-white shadow-xs text-soil' : 'text-soil/60 hover:text-soil'
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'map' ? 'bg-white shadow-xs text-leaf font-bold' : 'text-soil/60 hover:text-soil'
            }`}
          >
            📍 Google Maps View
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label={t('loading')} />
      ) : buyers.length === 0 ? (
        <EmptyState title={t('noBuyers')} />
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <InteractiveMap
            items={mapItems}
            title="Registered Buyers & Wholesale Locations Map"
            centerLatitude={mapItems[0]?.latitude ?? 28.367}
            centerLongitude={mapItems[0]?.longitude ?? 79.430}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {buyers.map((b, idx) => {
            const lat = b.latitude ?? (28.36 + idx * 0.05)
            const lng = b.longitude ?? (79.43 + idx * 0.04)
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-soil/10 p-4 hover:border-leaf transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <Link to={`/buyers/${b.id}`} className="font-semibold text-soil hover:text-leaf">
                      {b.name}
                    </Link>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-leaf/15 text-leaf">
                      ₹{b.offered_price}/qtl
                    </span>
                  </div>

                  <p className="text-sm text-soil/80 mb-1">
                    <span className="font-medium text-soil">{t('lookingFor')}:</span> {b.product}
                  </p>
                  <p className="text-sm text-soil/70 mb-1">
                    {t('upTo')} {b.required_quantity} Quintals · {b.quality_requirement}
                  </p>
                  <p className="text-xs text-soil/50">📍 {b.location} · 📞 {b.contact}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-soil/10 flex items-center justify-between text-xs">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-leaf font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>📍 Google Maps Directions ↗</span>
                  </a>
                  <Link
                    to={`/buyers/${b.id}`}
                    className="px-2.5 py-1 rounded-lg bg-soil/5 text-soil font-semibold hover:bg-soil/10 transition"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

export default BuyersPage

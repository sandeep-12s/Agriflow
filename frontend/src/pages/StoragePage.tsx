import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listStorage, StorageFacility } from '../api/client'
import InteractiveMap, { MapMarkerItem } from '../components/InteractiveMap'

function StoragePage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [facilities, setFacilities] = useState<StorageFacility[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    listStorage(token)
      .then(setFacilities)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load storage facilities.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const mapItems: MapMarkerItem[] = facilities.map((f, idx) => ({
    id: f.id,
    title: f.name,
    address: f.location,
    latitude: f.latitude ?? (28.37 + idx * 0.04),
    longitude: f.longitude ?? (79.42 + idx * 0.05),
    category: 'storage',
    badge: `₹${f.cost_per_unit}/qtl/day`,
    details: [
      { label: 'Type', value: f.type },
      { label: 'Available Capacity', value: `${f.available_capacity} / ${f.capacity} qtl` },
      { label: 'Distance', value: `${f.distance_km} km away` },
      { label: 'Supported Crops', value: f.supported_crops },
    ],
  }))

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-soil mb-1">{t('storageTitle')}</h1>
          <p className="text-xs text-soil/50">{t('storageNote')}</p>
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
      ) : facilities.length === 0 ? (
        <EmptyState title={t('noStorage')} />
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <InteractiveMap
            items={mapItems}
            title="Cold Storages & Warehouses Map"
            centerLatitude={mapItems[0]?.latitude ?? 28.375}
            centerLongitude={mapItems[0]?.longitude ?? 79.415}
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {facilities.map((f, idx) => {
            const lat = f.latitude ?? (28.37 + idx * 0.04)
            const lng = f.longitude ?? (79.42 + idx * 0.05)
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

            return (
              <div key={f.id} className="bg-white rounded-2xl border border-soil/10 p-4 hover:border-soil/30 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-soil">{f.name}</h3>
                    <span className="text-xs bg-husk px-2 py-0.5 rounded-full text-soil/70 font-medium">
                      {f.type}
                    </span>
                  </div>
                  <p className="text-xs text-soil/60 mb-2">📍 {f.location} · {f.distance_km} km away</p>
                  <p className="text-sm text-soil/80 mb-1">
                    <span className="font-medium">Capacity:</span> {f.available_capacity} / {f.capacity} qtl available
                  </p>
                  <p className="text-sm text-soil/80 mb-2">
                    <span className="font-medium">Rate:</span> ₹{f.cost_per_unit}/quintal/day
                  </p>
                  <p className="text-xs text-soil/50">
                    <span className="font-medium text-soil/70">Supported crops:</span> {f.supported_crops}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-soil/10 flex items-center justify-between text-xs">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-leaf font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>📍 Directions in Google Maps ↗</span>
                  </a>
                  <span className="text-soil/40">Safe Storage</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}

export default StoragePage

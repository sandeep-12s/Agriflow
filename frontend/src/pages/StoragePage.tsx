import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listStorage, StorageFacility } from '../api/client'

function StoragePage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [facilities, setFacilities] = useState<StorageFacility[]>([])
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

  return (
    <Layout>
      <h1 className="text-xl font-bold text-soil mb-1">Storage Finder</h1>
      <p className="text-xs text-soil/50 mb-4">
        Demo storage facilities for hackathon demonstration.
      </p>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label="Loading storage facilities…" />
      ) : facilities.length === 0 ? (
        <EmptyState title="No storage facilities available." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {facilities.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-soil/10 p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-soil">{f.name}</h3>
                <span className="text-xs bg-husk px-2 py-0.5 rounded-full text-soil/70">
                  {f.type}
                </span>
              </div>
              <p className="text-sm text-soil/70 mb-1">{f.distance_km} km away</p>
              <p className="text-sm text-soil/70 mb-1">
                {f.available_capacity} / {f.capacity} qtl available
              </p>
              <p className="text-sm text-soil/70 mb-2">₹{f.cost_per_unit}/quintal/day</p>
              <p className="text-xs text-soil/50">
                Suitable for: {f.supported_crops.split(',').join(', ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default StoragePage

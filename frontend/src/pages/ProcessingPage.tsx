import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listProcessingUnits, ProcessingUnit } from '../api/client'

function ProcessingPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [units, setUnits] = useState<ProcessingUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    listProcessingUnits(token)
      .then(setUnits)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load processing units.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <Layout>
      <h1 className="text-xl font-bold text-soil mb-1">{t('processingTitle')}</h1>
      <p className="text-xs text-soil/50 mb-4">
        {t('processingNote')}
      </p>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label={t('loading')} />
      ) : units.length === 0 ? (
        <EmptyState title={t('noProcessing')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {units.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl border border-soil/10 p-4">
              <h3 className="font-semibold text-soil mb-1">
                {u.input_product} → {u.output_product}
              </h3>
              <p className="text-sm text-soil/70 mb-1">{u.name}</p>
              <p className="text-sm text-soil/70 mb-1">
                ₹{u.processing_cost}/quintal {t('processingCost')} · {u.distance_km} km {t('away')}
              </p>
              <p className="text-xs text-soil/50">{u.location}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default ProcessingPage

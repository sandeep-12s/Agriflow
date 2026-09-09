import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listProduce, deleteProduce, Produce } from '../api/client'

function ProduceListPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Produce[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    if (!token) return
    setLoading(true)
    listProduce(token)
      .then(setItems)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load your produce.')
        }
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token])

  const handleDelete = async (id: number) => {
    if (!token) return
    if (!confirm(t('deleteConfirm'))) return
    try {
      await deleteProduce(token, id)
      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch {
      setError('Could not delete that entry.')
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-soil">{t('yourProduce')}</h1>
        <Link
          to="/produce/new"
          className="bg-leaf text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-leaf/90 transition"
        >
          + {t('addProduce')}
        </Link>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label={t('loadingProduce')} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('noProduce')}
          action={
            <Link to="/produce/new" className="text-leaf font-medium text-sm">
              {t('addFirstEntry')}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-soil/10 p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-soil">{item.crop_name}</h3>
                <span className="text-xs bg-wheat/30 text-soil px-2 py-0.5 rounded-full capitalize">
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-soil/70 mb-1">
                {item.quantity} {item.unit} · {item.quality}
              </p>
              <p className="text-xs text-soil/50 mb-3">
                {t('harvested')} {item.harvest_date} · {item.location}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <Link to={`/produce/${item.id}`} className="text-sm text-leaf font-medium">
                  {t('viewEdit')}
                </Link>
                <Link
                  to={`/produce/${item.id}/recommendation`}
                  className="text-sm text-amber-700 font-medium"
                >
                  {t('getRecommendation')}
                </Link>
                <Link to={`/produce/${item.id}/buyers`} className="text-sm text-soil font-medium">
                  {t('findBuyers')}
                </Link>
                <Link
                  to={`/produce/${item.id}/processing`}
                  className="text-sm text-soil font-medium"
                >
                  {t('processingOptions')}
                </Link>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-sm text-red-600 font-medium"
                >
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default ProduceListPage

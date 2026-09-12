import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listProduce, deleteProduce, Produce } from '../api/client'
import NextCropPredictionCard from '../components/NextCropPredictionCard'
import { getNextCropPredictionForProduce, NextCropPrediction } from '../api/client'

function ProduceListPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Produce[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [prediction, setPrediction] = useState<{ crop: string; data: NextCropPrediction } | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)

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

  const handlePredictNextCrop = async (item: Produce) => {
    if (!token) return
    setPredictionLoading(true)
    setError('')
    try {
      const pred = await getNextCropPredictionForProduce(token, item.id)
      setPrediction({ crop: item.crop_name, data: pred })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Could not generate next crop prediction.')
    } finally {
      setPredictionLoading(false)
    }
  }

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
        <div>
          <h1 className="text-xl font-bold text-soil">{t('yourProduce')}</h1>
          <p className="text-xs text-soil/50">Manage harvested crops and discover optimal rotation crops.</p>
        </div>
        <Link
          to="/produce/new"
          className="bg-leaf text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-leaf/90 transition shadow-xs"
        >
          + {t('addProduce')}
        </Link>
      </div>

      <ErrorBanner message={error} />

      {predictionLoading && (
        <div className="mb-4">
          <LoadingSpinner label="Analyzing regional soil rotation, mandi benchmarks, and weather advisories..." />
        </div>
      )}

      {prediction && (
        <div className="relative">
          <button
            onClick={() => setPrediction(null)}
            className="absolute top-4 right-4 z-10 px-3 py-1 text-xs font-bold rounded-lg bg-soil/10 hover:bg-soil/20 text-soil"
          >
            ✕ Dismiss
          </button>
          <NextCropPredictionCard prediction={prediction.data} harvestedCrop={prediction.crop} />
        </div>
      )}

      {loading ? (
        <LoadingSpinner label={t('loadingProduce')} />
      ) : items.length === 0 ? (
        <EmptyState
          title={t('noProduce')}
          description="Add your first harvest entry to receive market recommendations, storage options, and rotation predictions."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-soil/10 p-4 hover:border-soil/30 transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-soil">{item.crop_name}</h3>
                  <span className="text-xs bg-wheat/30 text-soil px-2 py-0.5 rounded-full capitalize font-medium">
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-soil/70 mb-1">
                  {item.quantity} {item.unit} · {item.quality}
                </p>
                <p className="text-xs text-soil/50 mb-3">
                  {t('harvested')} {item.harvest_date} · {item.location}
                </p>
              </div>

              <div className="pt-2 border-t border-soil/10 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                <Link to={`/produce/${item.id}`} className="text-leaf font-semibold hover:underline">
                  {t('viewEdit')}
                </Link>
                <Link
                  to={`/produce/${item.id}/recommendation`}
                  className="text-amber-700 font-semibold hover:underline"
                >
                  {t('getRecommendation')}
                </Link>
                <Link to={`/produce/${item.id}/buyers`} className="text-soil font-semibold hover:underline">
                  {t('findBuyers')}
                </Link>
                <button
                  type="button"
                  onClick={() => handlePredictNextCrop(item)}
                  className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 transition inline-flex items-center gap-1"
                >
                  🌱 Next Crop
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:underline ml-auto"
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

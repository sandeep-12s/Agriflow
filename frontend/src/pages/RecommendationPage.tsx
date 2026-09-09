import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import { getRecommendation, RecommendationResponse } from '../api/client'

const OPTION_LABELS: Record<string, string> = {
  SELL_NOW: 'Sell Now',
  STORE: 'Store',
  PROCESS: 'Process',
  ALT_BUYER: 'Alternative Buyer',
}

function riskColor(label: string) {
  if (label === 'Low') return 'text-leaf'
  if (label === 'Medium') return 'text-wheat'
  return 'text-red-600'
}

function RecommendationPage() {
  const { id } = useParams()
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !id) return
    setLoading(true)
    getRecommendation(token, Number(id))
      .then(setData)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError(err instanceof Error ? err.message : 'Could not compute a recommendation.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  return (
    <Layout>
      <Link to="/produce" className="text-sm text-leaf font-medium mb-3 inline-block">
        ← {t('backToProduce')}
      </Link>
      <h1 className="text-xl font-bold text-soil mb-1">{t('recommendation')}</h1>

      {loading && <LoadingSpinner label={t('loading')} />}
      <ErrorBanner message={error} />

      {data && (
        <>
          <p className="text-sm text-soil/60 mb-4">{data.crop_name}</p>

          <div className="bg-leaf text-white rounded-2xl p-4 mb-6">
            <p className="text-xs uppercase tracking-wide text-white/70 mb-1">
              {t('recommendedAction')}
            </p>
            <p className="text-lg font-bold">{OPTION_LABELS[data.recommended_option]}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.options.map((opt) => (
              <div
                key={opt.option}
                className={`bg-white rounded-2xl border p-4 ${
                  opt.option === data.recommended_option
                    ? 'border-leaf ring-1 ring-leaf'
                    : 'border-soil/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-soil">{OPTION_LABELS[opt.option]}</h3>
                  <span className="text-xs bg-husk px-2 py-0.5 rounded-full text-soil/70">
                    {t('score')} {opt.recommendation_score}/100
                  </span>
                </div>
                <p className="text-sm text-soil/70 mb-1">
                  {t('profit')}:{' '}
                  <span className="font-medium text-soil">
                    ₹{opt.expected_profit.toLocaleString()}
                  </span>
                </p>
                <p className={`text-sm mb-2 font-medium ${riskColor(opt.risk_label)}`}>
                  {t('risk')}: {opt.risk_label}
                </p>
                <p className="text-xs text-soil/50">{opt.reason}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-soil/40 mt-4">
            {t('estimatedData')}
          </p>
        </>
      )}
    </Layout>
  )
}

export default RecommendationPage

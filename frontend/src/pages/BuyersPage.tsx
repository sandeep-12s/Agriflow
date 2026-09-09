import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { listBuyers, Buyer } from '../api/client'

function BuyersPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [buyers, setBuyers] = useState<Buyer[]>([])
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

  return (
    <Layout>
      <h1 className="text-xl font-bold text-soil mb-1">{t('buyersTitle')}</h1>
      <p className="text-xs text-soil/50 mb-4">{t('buyerNote')}</p>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label={t('loading')} />
      ) : buyers.length === 0 ? (
        <EmptyState title={t('noBuyers')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {buyers.map((b) => (
            <Link
              key={b.id}
              to={`/buyers/${b.id}`}
              className="bg-white rounded-2xl border border-soil/10 p-4 hover:border-leaf transition"
            >
              <h3 className="font-semibold text-soil">{b.name}</h3>
              <p className="text-sm text-soil/70 mb-1">{t('lookingFor')}: {b.product}</p>
              <p className="text-sm text-soil/70 mb-1">
                {t('upTo')} {b.required_quantity} Quintals · ₹{b.offered_price}/quintal
              </p>
              <p className="text-xs text-soil/50">
                {b.location} · {b.quality_requirement}
              </p>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default BuyersPage

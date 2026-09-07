import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import { matchingBuyers, createTransaction, getProduceById, Buyer, Produce } from '../api/client'

function ProduceMatchingBuyersPage() {
  const { id } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [produce, setProduce] = useState<Produce | null>(null)
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [proposingId, setProposingId] = useState<number | null>(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token || !id) return
    Promise.all([getProduceById(token, Number(id)), matchingBuyers(token, Number(id))])
      .then(([p, b]) => {
        setProduce(p)
        setBuyers(b)
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load matching buyers.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  const handlePropose = async (buyer: Buyer) => {
    if (!token || !produce) return
    setProposingId(buyer.id)
    setError('')
    try {
      await createTransaction(token, {
        buyer_id: buyer.id,
        produce_id: produce.id,
        quantity: produce.quantity,
        price: buyer.offered_price,
      })
      setProduce({ ...produce, status: 'sold' })
      setSuccess(`Transaction proposed with ${buyer.name}. Your produce is now marked sold.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this transaction.')
    } finally {
      setProposingId(null)
    }
  }

  return (
    <Layout>
      <Link to="/produce" className="text-sm text-leaf font-medium mb-3 inline-block">
        ← Back to Produce
      </Link>
      <h1 className="text-xl font-bold text-soil mb-1">Matching Buyers</h1>
      {produce && (
        <p className="text-sm text-soil/60 mb-4">
          {produce.crop_name} · {produce.quantity} {produce.unit}
        </p>
      )}

      <ErrorBanner message={error} />
      {success && (
        <p role="status" className="text-sm text-leaf bg-leaf/10 rounded-lg px-3 py-2 mb-4">
          {success}
        </p>
      )}

      {loading ? (
        <LoadingSpinner label="Finding matching buyers…" />
      ) : buyers.length === 0 ? (
        <p className="text-sm text-soil/60">No buyers currently want this much of this crop.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {buyers.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-soil/10 p-4">
              <h3 className="font-semibold text-soil mb-1">{b.name}</h3>
              <p className="text-sm text-soil/70 mb-1">
                ₹{b.offered_price}/quintal · {b.location}
              </p>
              <p className="text-xs text-soil/50 mb-3">Quality: {b.quality_requirement}</p>
              <button
                onClick={() => handlePropose(b)}
                disabled={proposingId === b.id || produce?.status === 'sold'}
                className="w-full bg-leaf text-white text-sm font-medium py-2 rounded-lg hover:bg-leaf/90 transition disabled:opacity-60"
              >
                {proposingId === b.id
                  ? 'Proposing…'
                  : produce?.status === 'sold'
                    ? 'Produce already sold'
                    : 'Propose Transaction'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default ProduceMatchingBuyersPage

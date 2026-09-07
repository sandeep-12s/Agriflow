import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import ErrorBanner from '../components/ErrorBanner'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'
import { getBuyer, Buyer } from '../api/client'

function BuyerDetailPage() {
  const { id } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !id) return
    getBuyer(token, Number(id))
      .then(setBuyer)
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load this buyer.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  return (
    <Layout>
      <Link to="/buyers" className="text-sm text-leaf font-medium mb-3 inline-block">
        ← Back to Buyers
      </Link>

      <ErrorBanner message={error} />

      {loading && <LoadingSpinner label="Loading buyer…" />}

      {buyer && (
        <div className="bg-white rounded-2xl border border-soil/10 p-6 max-w-md">
          <h1 className="text-xl font-bold text-soil mb-1">{buyer.name}</h1>
          <p className="text-sm text-soil/70 mb-4">Looking for: {buyer.product}</p>

          <dl className="text-sm space-y-2 mb-6">
            <div className="flex justify-between">
              <dt className="text-soil/50">Required</dt>
              <dd className="text-soil font-medium">Up to {buyer.required_quantity} Quintals</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soil/50">Offer</dt>
              <dd className="text-soil font-medium">₹{buyer.offered_price}/quintal</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soil/50">Location</dt>
              <dd className="text-soil font-medium">{buyer.location}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-soil/50">Quality Requirement</dt>
              <dd className="text-soil font-medium">{buyer.quality_requirement}</dd>
            </div>
          </dl>

          <a
            href={`mailto:${buyer.contact}`}
            className="block text-center w-full bg-leaf text-white font-medium py-2 rounded-lg hover:bg-leaf/90 transition"
          >
            Contact Buyer
          </a>
          <p className="text-xs text-soil/40 mt-3 text-center">
            To propose selling to this buyer, open "Find Buyers" from a matching produce entry.
          </p>
        </div>
      )}
    </Layout>
  )
}

export default BuyerDetailPage

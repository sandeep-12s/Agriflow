import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import {
  processingOpportunities,
  getProduceById,
  ProcessingOpportunity,
  Produce,
} from '../api/client'

function ProduceProcessingPage() {
  const { id } = useParams()
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [produce, setProduce] = useState<Produce | null>(null)
  const [opportunities, setOpportunities] = useState<ProcessingOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !id) return
    Promise.all([getProduceById(token, Number(id)), processingOpportunities(token, Number(id))])
      .then(([p, o]) => {
        setProduce(p)
        setOpportunities(o)
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load processing opportunities.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  return (
    <Layout>
      <Link to="/produce" className="text-sm text-leaf font-medium mb-3 inline-block">
        ← Back to Produce
      </Link>
      <h1 className="text-xl font-bold text-soil mb-1">Processing Opportunities</h1>
      {produce && (
        <p className="text-sm text-soil/60 mb-4">
          {produce.crop_name} · {produce.quantity} {produce.unit}
        </p>
      )}

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingSpinner label="Calculating processing opportunities…" />
      ) : opportunities.length === 0 ? (
        <p className="text-sm text-soil/60">No processing units accept this crop yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {opportunities.map((o) => (
            <div key={o.processor_id} className="bg-white rounded-2xl border border-soil/10 p-4">
              <h3 className="font-semibold text-soil mb-1">
                {o.input_product} → {o.output_product}
              </h3>
              <p className="text-sm text-soil/70 mb-2">
                {o.processor_name} · {o.distance_km} km
              </p>
              <dl className="text-sm space-y-1">
                <div className="flex justify-between">
                  <dt className="text-soil/50">Input Quantity</dt>
                  <dd className="text-soil">{o.input_quantity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-soil/50">Expected Output</dt>
                  <dd className="text-soil">{o.expected_output}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-soil/50">Processing Cost</dt>
                  <dd className="text-soil">₹{o.processing_cost.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-soil/50">Estimated Revenue</dt>
                  <dd className="text-soil">₹{o.estimated_revenue.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt className="text-soil">Potential Profit</dt>
                  <dd className="text-leaf">₹{o.potential_profit.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}

export default ProduceProcessingPage

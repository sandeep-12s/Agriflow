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
  const [selectedUnit, setSelectedUnit] = useState<ProcessingUnit | null>(null)
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null)
  const [inquiryQty, setInquiryQty] = useState('')
  const [inquiryNotes, setInquiryNotes] = useState('')
  const [submittingInquiry, setSubmittingInquiry] = useState(false)

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

  const handleSendInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnit) return
    setSubmittingInquiry(true)
    setTimeout(() => {
      setSubmittingInquiry(false)
      setInquirySuccess(
        `Inquiry sent to ${selectedUnit.name}! Their procurement team will reach you via phone within 24 hours.`
      )
      setInquiryQty('')
      setInquiryNotes('')
    }, 600)
  }

  const getGoogleMapsUrl = (unit: ProcessingUnit) => {
    if (unit.latitude && unit.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${unit.name}, ${unit.location}`
    )}`
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold text-soil">{t('processingTitle')}</h1>
          <p className="text-xs text-soil/60">
            Connect with certified food processing units & agro-companies to turn raw harvests into high-margin products.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-leaf/10 text-leaf border border-leaf/20 rounded-full self-start md:self-auto">
          🏭 {units.length} Verified Agro-Processors Active
        </span>
      </div>

      <ErrorBanner message={error} />

      {inquirySuccess && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>✓ {inquirySuccess}</span>
          <button
            onClick={() => setInquirySuccess(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-3"
          >
            ✕ Close
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label={t('loading')} />
      ) : units.length === 0 ? (
        <EmptyState
          title={t('noProcessing')}
          description="No processing facilities registered in your immediate vicinity yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => (
            <div
              key={u.id}
              onClick={() => {
                setSelectedUnit(u)
                setInquirySuccess(null)
              }}
              className="bg-white rounded-2xl border border-soil/10 p-5 hover:border-leaf/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 font-bold text-xs">
                    <span>{u.input_product}</span>
                    <span className="text-amber-500">➔</span>
                    <span className="text-leaf">{u.output_product}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-soil/50 bg-soil/5 px-2 py-0.5 rounded-full">
                    {u.distance_km} km away
                  </span>
                </div>

                <h3 className="font-bold text-soil text-base group-hover:text-leaf transition-colors mb-1">
                  {u.name}
                </h3>
                <p className="text-xs text-soil/60 mb-3 flex items-center gap-1">
                  📍 {u.location}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-husk/50 p-2.5 rounded-xl text-xs mb-3">
                  <div>
                    <span className="text-soil/50 block text-[10px] uppercase font-semibold">Processing Fee</span>
                    <span className="font-bold text-soil">₹{u.processing_cost} / quintal</span>
                  </div>
                  <div>
                    <span className="text-soil/50 block text-[10px] uppercase font-semibold">Daily Intake Capacity</span>
                    <span className="font-bold text-soil">{u.input_capacity} MT / day</span>
                  </div>
                </div>

                {u.description && (
                  <p className="text-xs text-soil/70 line-clamp-2 mb-2 italic">
                    "{u.description}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-soil/10 flex items-center justify-between">
                <span className="text-xs text-leaf font-bold group-hover:underline flex items-center gap-1">
                  View Company Details & Contact ➔
                </span>
                <span className="text-xs bg-leaf/10 text-leaf font-semibold px-2 py-0.5 rounded-md">
                  Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company / Processor Detail Modal */}
      {selectedUnit && (
        <div className="fixed inset-0 z-50 bg-soil/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-soil/15 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-leaf p-5 text-white flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white font-semibold text-[11px] mb-1.5">
                  ✓ FSSAI & Quality Certified Processor
                </div>
                <h2 className="text-xl font-black">{selectedUnit.name}</h2>
                <p className="text-xs text-white/80 mt-0.5">
                  📍 {selectedUnit.location} ({selectedUnit.distance_km} km from your registered farm)
                </p>
              </div>
              <button
                onClick={() => setSelectedUnit(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Product Transformation Badge */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                    Product Transformation
                  </span>
                  <div className="text-sm font-black text-soil flex items-center gap-2 mt-0.5">
                    <span className="bg-white px-2 py-0.5 rounded border border-soil/10">
                      {selectedUnit.input_product}
                    </span>
                    <span className="text-amber-600 font-bold">➔ converts to ➔</span>
                    <span className="bg-leaf text-white px-2 py-0.5 rounded">
                      {selectedUnit.output_product}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-soil/50 block">Conversion Yield</span>
                  <span className="text-base font-black text-leaf">
                    {Math.round(selectedUnit.estimated_output * 100)}%
                  </span>
                </div>
              </div>

              {/* Quick Specs Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-soil/5 p-3 rounded-2xl border border-soil/10">
                  <span className="text-[10px] uppercase font-semibold text-soil/50 block">Processing Rate</span>
                  <span className="text-base font-black text-soil mt-1 block">₹{selectedUnit.processing_cost}</span>
                  <span className="text-[10px] text-soil/60">per quintal</span>
                </div>
                <div className="bg-soil/5 p-3 rounded-2xl border border-soil/10">
                  <span className="text-[10px] uppercase font-semibold text-soil/50 block">Daily Capacity</span>
                  <span className="text-base font-black text-soil mt-1 block">{selectedUnit.input_capacity} MT</span>
                  <span className="text-[10px] text-soil/60">daily intake</span>
                </div>
                <div className="bg-soil/5 p-3 rounded-2xl border border-soil/10">
                  <span className="text-[10px] uppercase font-semibold text-soil/50 block">Distance</span>
                  <span className="text-base font-black text-soil mt-1 block">{selectedUnit.distance_km} km</span>
                  <span className="text-[10px] text-soil/60">road transit</span>
                </div>
              </div>

              {/* Company Description & Profile */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-soil/60 mb-1.5">
                  About the Company & Procurement Standards
                </h4>
                <p className="text-xs text-soil/80 leading-relaxed bg-husk/40 p-3.5 rounded-2xl border border-soil/10">
                  {selectedUnit.description ||
                    'Registered commercial agro-processor offering contract processing, bulk produce procurement, and value-added packaging. Payment processed directly via bank transfer upon quality inspection.'}
                </p>
              </div>

              {/* Direct Contact Options */}
              <div className="space-y-2.5">
                <h4 className="text-xs uppercase tracking-wider font-bold text-soil/60">
                  Direct Company Contacts & Location
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedUnit.contact_phone && (
                    <a
                      href={`tel:${selectedUnit.contact_phone}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold hover:bg-emerald-100 transition"
                    >
                      <span className="text-base">📞</span>
                      <div>
                        <span className="text-[10px] text-emerald-700 block font-normal">Call Procurement Dept</span>
                        <span>{selectedUnit.contact_phone}</span>
                      </div>
                    </a>
                  )}

                  {selectedUnit.contact_email && (
                    <a
                      href={`mailto:${selectedUnit.contact_email}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 transition"
                    >
                      <span className="text-base">✉️</span>
                      <div>
                        <span className="text-[10px] text-blue-700 block font-normal">Send Official Email</span>
                        <span className="truncate block max-w-[170px]">{selectedUnit.contact_email}</span>
                      </div>
                    </a>
                  )}
                </div>

                <a
                  href={getGoogleMapsUrl(selectedUnit)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-soil/5 border border-soil/10 text-soil font-semibold text-xs hover:bg-soil/10 transition"
                >
                  <span className="flex items-center gap-2">
                    <span>📍</span>
                    <span>Navigate to Factory: {selectedUnit.location}</span>
                  </span>
                  <span className="text-leaf font-bold">Open Google Maps ↗</span>
                </a>
              </div>

              {/* Request Processing Slot Form */}
              <form onSubmit={handleSendInquiry} className="pt-2 border-t border-soil/10 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-soil/60">
                  Request Processing Slot / Batch Booking
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-soil/70 mb-1">
                      Estimated Produce Quantity (Quintals)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 25"
                      value={inquiryQty}
                      onChange={(e) => setInquiryQty(e.target.value)}
                      required
                      min="1"
                      className="w-full px-3 py-2 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-soil/70 mb-1">
                      Crop Variety & Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Desi Grade A, harvest tomorrow"
                      value={inquiryNotes}
                      onChange={(e) => setInquiryNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingInquiry}
                  className="w-full py-3 rounded-2xl bg-leaf text-white font-bold text-xs hover:bg-leaf/90 transition shadow-sm disabled:opacity-50"
                >
                  {submittingInquiry ? 'Sending Processing Request...' : `Submit Batch Request to ${selectedUnit.name}`}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default ProcessingPage

import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import {
  Buyer,
  BuyerPayload,
  createBuyerRequirement,
  getMyBuyerRequirements,
  deleteBuyerRequirement,
  listProduce,
  Produce,
} from '../api/client'

export default function BuyerPortalPage() {
  const { user, token } = useAuth()
  const [requirements, setRequirements] = useState<Buyer[]>([])
  const [availableProduce, setAvailableProduce] = useState<Produce[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Form State
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cropProduct, setCropProduct] = useState('Tomato')
  const [quantity, setQuantity] = useState('50')
  const [offeredPrice, setOfferedPrice] = useState('2200')
  const [quality, setQuality] = useState('Grade A')
  const [location, setLocation] = useState(user?.location || 'Bareilly, UP')
  const [contact, setContact] = useState(user?.phone || user?.email || '')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const loadData = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [reqs, produceList] = await Promise.all([
        getMyBuyerRequirements(token),
        listProduce(token),
      ])
      setRequirements(reqs)
      setAvailableProduce(produceList.filter((p) => p.status === 'available'))
    } catch (err: any) {
      setError(err?.message || 'Failed to load buyer portal data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const handleDetectLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(4)))
          setLongitude(Number(pos.coords.longitude.toFixed(4)))
          setSuccessMsg('GPS Coordinates captured accurately!')
          setTimeout(() => setSuccessMsg(null), 3000)
        },
        () => {
          setError('Unable to retrieve GPS coordinates from browser.')
        }
      )
    }
  }

  const handleCreateRequirement = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: BuyerPayload = {
        name: user?.name || 'Wholesale Buyer',
        product: cropProduct.trim(),
        required_quantity: parseFloat(quantity),
        offered_price: parseFloat(offeredPrice),
        quality_requirement: quality,
        location: location.trim(),
        contact: contact.trim(),
        latitude,
        longitude,
      }
      await createBuyerRequirement(token, payload)
      setSuccessMsg('Purchase requirement published! Farmers can now view your order.')
      setShowForm(false)
      loadData()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setError(err?.message || 'Could not post requirement')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Mark this purchasing requirement as fulfilled / closed?')) return
    try {
      await deleteBuyerRequirement(token, id)
      setRequirements((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setError(err?.message || 'Failed to delete requirement')
    }
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-soil to-soil/90 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>🛒 Buyer & Wholesale Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Purchase Requirements Manager</h1>
            <p className="text-white/70 text-sm mt-1 max-w-2xl">
              Post what produce you need to buy, your offered prices, and delivery location. Local farmers will view your purchase orders directly.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-3 rounded-2xl bg-leaf text-white font-semibold text-sm hover:bg-leaf/90 transition shadow-sm whitespace-nowrap"
          >
            {showForm ? '✕ Close Form' : '+ Post Buying Requirement'}
          </button>
        </div>

        {error && <ErrorBanner message={error} />}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-leaf/15 border border-leaf/30 text-leaf text-sm font-semibold flex items-center justify-between">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-xs text-soil/50 hover:text-soil">Dismiss</button>
          </div>
        )}

        {/* Post Requirement Form */}
        {showForm && (
          <div className="bg-white rounded-3xl border border-soil/10 p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-soil mb-1">Create Purchase Requirement</h2>
            <p className="text-xs text-soil/60 mb-6">
              Specify what crop you are looking for so matching farmers can contact you.
            </p>

            <form onSubmit={handleCreateRequirement} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Crop / Commodity Needed *
                </label>
                <input
                  type="text"
                  value={cropProduct}
                  onChange={(e) => setCropProduct(e.target.value)}
                  placeholder="e.g. Tomato, Potato, Wheat, Mustard"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Required Quantity (Quintals) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Offered Price (₹ / Quintal) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Quality Specification
                </label>
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf bg-white"
                >
                  <option value="Grade A">Grade A (Premium / Export quality)</option>
                  <option value="Grade B">Grade B (Standard market)</option>
                  <option value="Processing Grade">Processing Grade (Juicing / Puree)</option>
                  <option value="Organic">Organic Certified</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Delivery Location / District *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bareilly APMC, Uttar Pradesh"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-soil/70 mb-1">
                  Contact Phone / Email *
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-soil/20 focus:outline-none focus:border-leaf"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 p-3 bg-soil/5 rounded-2xl">
                <div className="text-xs text-soil/70">
                  <span className="font-semibold block text-soil">📍 Map Geolocation Coordinates (Optional)</span>
                  {latitude && longitude ? (
                    <span className="text-leaf font-bold">Lat: {latitude}, Lng: {longitude}</span>
                  ) : (
                    <span>Add coordinates so farmers can see your warehouse/shop on Google Maps.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  className="px-3 py-1.5 rounded-xl bg-white border border-soil/20 text-xs font-semibold text-soil hover:bg-soil/10 transition"
                >
                  🎯 Use Current GPS Location
                </button>
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-soil/20 text-soil font-semibold text-xs hover:bg-soil/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-leaf text-white font-semibold text-xs hover:bg-leaf/90 transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List of my requirements */}
        <div className="bg-white rounded-3xl border border-soil/10 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-soil">My Active Purchase Orders</h2>
              <p className="text-xs text-soil/60">Manage orders you have posted for farmers to see</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-soil/10 rounded-full text-soil">
              {requirements.length} Active
            </span>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading your purchase listings..." />
          ) : requirements.length === 0 ? (
            <div className="py-12 text-center text-soil/60 bg-soil/5 rounded-2xl">
              <p className="text-sm font-medium mb-1">No active purchase orders yet</p>
              <p className="text-xs text-soil/50 mb-4">Click "Post Buying Requirement" above to list what crop you want to purchase.</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 rounded-xl bg-leaf text-white text-xs font-semibold hover:bg-leaf/90 transition"
              >
                + Post Your First Requirement
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requirements.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl border border-soil/15 bg-white hover:border-leaf/50 transition shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-base text-soil">{req.product}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-leaf/15 text-leaf">
                        ₹{req.offered_price}/qtl
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-soil/70 mb-4">
                      <p>📦 <span className="font-medium text-soil">Required:</span> {req.required_quantity} Quintals</p>
                      <p>🏷️ <span className="font-medium text-soil">Quality:</span> {req.quality_requirement}</p>
                      <p>📍 <span className="font-medium text-soil">Location:</span> {req.location}</p>
                      <p>📞 <span className="font-medium text-soil">Contact:</span> {req.contact}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soil/10 flex items-center justify-between">
                    {req.latitude && req.longitude ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${req.latitude},${req.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-leaf font-bold hover:underline"
                      >
                        📍 View on Maps ↗
                      </a>
                    ) : (
                      <span className="text-[11px] text-soil/40">No GPS set</span>
                    )}

                    <button
                      onClick={() => handleDelete(req.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Close Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Matching Farmer Produce */}
        <div className="bg-white rounded-3xl border border-soil/10 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-soil">Matching Harvested Produce from Farmers</h2>
              <p className="text-xs text-soil/60">Available crops listed by registered farmers in the platform</p>
            </div>
            <Link to="/produce" className="text-xs text-leaf font-bold hover:underline">
              View All Produce →
            </Link>
          </div>

          {availableProduce.length === 0 ? (
            <p className="text-xs text-soil/50 py-4">No harvested produce currently listed by farmers.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {availableProduce.slice(0, 6).map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-soil/10 bg-soil/5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-bold text-soil text-sm mb-1">
                      <span>{p.crop_name}</span>
                      <span className="text-leaf">{p.quantity} {p.unit}</span>
                    </div>
                    <p className="text-soil/60">Quality: {p.quality}</p>
                    <p className="text-soil/60">Location: {p.location}</p>
                  </div>
                  <p className="text-[10px] text-soil/40 mt-2">Harvested on {p.harvest_date}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

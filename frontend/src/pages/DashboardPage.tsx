import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import {
  getDashboardSummary,
  getBuyerDashboardSummary,
  getMyBuyerRequirements,
  listProduce,
  getMyProfile,
  DashboardSummary,
  BuyerDashboardSummary,
  FarmerProfile,
  Buyer,
  Produce,
} from '../api/client'

function DashboardPage() {
  const { token, user, logout, t } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [buyerSummary, setBuyerSummary] = useState<BuyerDashboardSummary | null>(null)
  const [availableProduce, setAvailableProduce] = useState<Produce[]>([])
  const [buyerRequirements, setBuyerRequirements] = useState<Buyer[]>([])
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    setError('')

    getMyProfile(token)
      .then((p) => {
        setProfile(p)
        const isBuyerUser = p.role === 'buyer' || user?.role === 'buyer'
        if (isBuyerUser) {
          return Promise.all([
            getBuyerDashboardSummary(token),
            getMyBuyerRequirements(token),
            listProduce(token),
          ]).then(([bSummary, reqs, prodList]) => {
            setBuyerSummary(bSummary)
            setBuyerRequirements(reqs)
            setAvailableProduce(prodList.filter((x) => x.status === 'available' || !x.status || x.status === 'active'))
          })
        } else {
          return getDashboardSummary(token).then((s) => {
            setSummary(s)
          })
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load your dashboard. Is the backend running?')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const isBuyer = (profile?.role === 'buyer') || (user?.role === 'buyer')

  return (
    <Layout>
      <ErrorBanner message={error} />

      {loading && <LoadingSpinner label={t('loading')} />}

      {!loading && isBuyer && (
        <>
          {/* Buyer Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100/80 border border-blue-300/60 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-2 shadow-xs">
                <span>🏢</span> Wholesale & Procurement Workspace
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-soil">
                Procurement Intelligence{profile ? `, ${profile.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-soil/60 mt-0.5">
                Source directly from verified regional farmers, benchmark APMC mandi rates, and manage procurement orders.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/buyer/portal"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-leaf text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-leaf/90 transition-colors"
              >
                <span>➕</span> Post Buying Requirement
              </Link>
              <Link
                to="/market"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-soil/15 text-soil text-sm font-medium rounded-xl hover:bg-soil/5 transition-colors"
              >
                <span>📊</span> Mandi Rate Explorer
              </Link>
            </div>
          </div>

          {/* Buyer Visual Banner */}
          <div className="dashboard-visual mb-6 overflow-hidden rounded-2xl relative shadow-sm border border-soil/10">
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=85"
              alt="Wholesale Procurement Intelligence"
              className="w-full h-44 md:h-52 object-cover"
            />
            <div className="dashboard-visual-copy absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 md:p-6 flex flex-col justify-end text-white">
              <p className="text-lg md:text-xl font-bold tracking-tight">Direct Farm Sourcing & Transparent Mandi Benchmarks</p>
              <p className="text-xs md:text-sm text-white/80 max-w-xl mt-1">
                Connect directly with verified local growers in your district. Eliminate intermediary costs and secure transparent farm-gate deliveries.
              </p>
            </div>
          </div>

          {/* Next Action Hero Card */}
          {buyerSummary && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 md:p-6 mb-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-1">
                    Recommended Procurement Action
                  </p>
                  <p className="font-medium text-base text-white/95">
                    {buyerSummary.next_action}
                  </p>
                </div>
                <Link
                  to="/buyer/portal"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-900 font-semibold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition-colors whitespace-nowrap self-start md:self-auto"
                >
                  Manage Requirements →
                </Link>
              </div>
            </div>
          )}

          {/* 6 Buyer KPI Cards */}
          {buyerSummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <SummaryCard
                label="Active Buying Requirements"
                value={`${buyerSummary.active_requirements_count} active`}
              />
              <SummaryCard
                label="Farmer Lots Ready"
                value={`${buyerSummary.total_farmer_produce_lots} lots`}
              />
              <SummaryCard
                label="Total Regional Supply"
                value={`${buyerSummary.total_supply_quantity_qtl.toLocaleString()} qtl`}
              />
              <SummaryCard
                label="Available Crop Types"
                value={`${buyerSummary.unique_crops_available} crops`}
              />
              <SummaryCard
                label="Avg Mandi Benchmark"
                value={`₹${buyerSummary.avg_market_price_qtl.toLocaleString()} / qtl`}
              />
              <SummaryCard
                label="Active APMC Mandis"
                value={`${buyerSummary.active_mandis_count} mandis`}
              />
            </div>
          )}

          {/* Available Farmer Produce Section */}
          <div className="bg-white rounded-2xl border border-soil/10 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-soil text-lg">🌾 Available Farmer Harvests in Your Region</h2>
                <p className="text-xs text-soil/60">Verified farm produce entries ready for wholesale procurement</p>
              </div>
              <Link to="/buyer/portal" className="text-xs font-semibold text-leaf hover:underline">
                View all in Portal →
              </Link>
            </div>

            {availableProduce.length === 0 ? (
              <div className="p-8 text-center bg-sand/30 rounded-xl border border-dashed border-soil/20">
                <p className="text-sm font-medium text-soil/70">No produce entries currently listed in this region.</p>
                <p className="text-xs text-soil/50 mt-1">Check back soon or post a buying requirement so local farmers get notified!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableProduce.slice(0, 6).map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-soil/10 bg-sand/20 hover:border-leaf/40 hover:bg-sand/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-base text-soil">{item.crop_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-leaf/15 text-leaf">
                          {item.quality}
                        </span>
                      </div>
                      <p className="text-xs text-soil/70 mb-1">
                        📦 <strong>Quantity:</strong> {item.quantity} {item.unit}
                      </p>
                      <p className="text-xs text-soil/70 mb-1">
                        📍 <strong>Location:</strong> {item.location}
                      </p>
                      <p className="text-xs text-soil/50">
                        🗓️ Harvested: {item.harvest_date}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-soil/10 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-leaf bg-leaf/10 px-2 py-0.5 rounded">
                        {item.status === 'sold' ? 'Sold' : 'Available'}
                      </span>
                      <Link
                        to="/buyer/portal"
                        className="text-xs font-bold text-soil bg-white border border-soil/20 px-2.5 py-1 rounded-lg hover:border-leaf hover:text-leaf transition-colors"
                      >
                        Source Lot →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Active Buying Requirements Section */}
          <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-soil text-lg">📋 Your Posted Buying Requirements (RFQs)</h2>
                <p className="text-xs text-soil/60">Live purchase inquiries broadcasted to regional farmers</p>
              </div>
              <Link to="/buyer/portal" className="text-xs font-semibold text-leaf hover:underline">
                Manage in Portal →
              </Link>
            </div>

            {buyerRequirements.length === 0 ? (
              <div className="p-6 text-center bg-blue-50/50 rounded-xl border border-dashed border-blue-200">
                <p className="text-sm font-medium text-blue-900">You haven't posted any buying requirements yet.</p>
                <p className="text-xs text-blue-700/70 mt-1 mb-3">Post your commodity specifications so farmers can reach out to you directly.</p>
                <Link
                  to="/buyer/portal"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-leaf text-white text-xs font-semibold rounded-lg hover:bg-leaf/90 transition-colors"
                >
                  + Create Buying Requirement
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-soil/10">
                {buyerRequirements.map((req) => (
                  <div key={req.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-soil">{req.product}</span>
                        <span className="px-2 py-0.5 bg-soil/10 text-soil text-xs rounded-full font-medium">{req.quality_requirement}</span>
                      </div>
                      <p className="text-xs text-soil/70 mt-1">
                        Demand: <strong>{req.required_quantity} Qtl</strong> • Offering: <strong className="text-leaf">₹{req.offered_price} / Qtl</strong> • Delivery: {req.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-auto">
                      <span className="text-xs text-soil/60 bg-sand/60 px-2 py-1 rounded">
                        📞 {req.contact}
                      </span>
                      <Link
                        to="/buyer/portal"
                        className="text-xs font-medium text-leaf hover:underline px-2 py-1"
                      >
                        Edit / Close
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !isBuyer && (
        <>
          <div className="flex flex-col gap-1 mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf/75">{t('farmerOverview')}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-soil">{t('goodToSeeYou')}{profile ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
            <p className="text-sm text-soil/60">{t('dashboardIntro')}</p>
          </div>

          <div className="dashboard-visual mb-6">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1600&q=85"
              alt={t('harvestIntelligence')}
            />
            <div className="dashboard-visual-copy">
              <p>{t('harvestIntelligence')}</p>
              <p>{t('harvestTagline')}</p>
            </div>
          </div>

          {summary && (
            <>
              <div className="dashboard-hero text-white rounded-2xl p-5 md:p-6 mb-6">
                <p className="text-xs uppercase tracking-wide text-white/70 mb-1">
                  {t('nextAction')}
                </p>
                <p className="font-medium">{summary.next_action === 'Check your recommendations to decide your next move.' ? t('dashboardNextAction') : summary.next_action}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <SummaryCard label={t('totalProduce')} value={`${summary.total_quantity} qtl`} />
                <SummaryCard label={t('estimatedValue')} value={`₹${summary.estimated_value}`} />
                <SummaryCard label={t('potentialProfit')} value={`₹${summary.potential_profit}`} />
                <SummaryCard label={t('wastageRisk')} value={t(summary.wastage_risk.toLowerCase() === 'low' ? 'low' : summary.wastage_risk.toLowerCase() === 'medium' ? 'medium' : 'high')} />
                <SummaryCard label={t('activeRecommendations')} value={summary.active_recommendations} />
                <SummaryCard label={t('availableBuyers')} value={summary.available_buyers} />
              </div>

              <div className="bg-white rounded-2xl border border-soil/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-soil">{t('yourProduce')}</h2>
                  <Link to="/produce" className="text-sm text-leaf font-medium">
                    {summary.total_produce_entries === 0 ? `${t('addProduce')} →` : `${t('viewAll')} →`}
                  </Link>
                </div>
                {summary.total_produce_entries === 0 ? (
                  <p className="text-sm text-soil/60">{t('noProduce')}</p>
                ) : (
                  <p className="text-sm text-soil/60">
                    {summary.total_produce_entries} {t('entriesOnRecord')}
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card bg-white rounded-2xl border border-soil/10 p-4">
      <p className="text-xs text-soil/50 mb-1">{label}</p>
      <p className="text-lg font-bold text-soil">{value}</p>
    </div>
  )
}

export default DashboardPage

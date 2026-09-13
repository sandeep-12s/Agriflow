import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import WeatherWidget from '../components/WeatherWidget'
import { useAuth } from '../context/AuthContext'
import {
  getDashboardSummary,
  getBuyerDashboardSummary,
  getMyBuyerRequirements,
  getMyProfile,
  DashboardSummary,
  BuyerDashboardSummary,
  FarmerProfile,
  Buyer,
} from '../api/client'

function DashboardPage() {
  const { token, user, logout, t } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [buyerSummary, setBuyerSummary] = useState<BuyerDashboardSummary | null>(null)
  const [buyerRequirements, setBuyerRequirements] = useState<Buyer[]>([])
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showWeather, setShowWeather] = useState(true)

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
          ]).then(([bSummary, reqs]) => {
            setBuyerSummary(bSummary)
            setBuyerRequirements(reqs)
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
                <span>🏢</span> {t('procurementWorkspace')}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-soil">
                {t('procurementIntelligence')}{profile ? `, ${profile.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-sm text-soil/60 mt-0.5">
                {t('procurementSubtitle')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to="/buyer/portal"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-leaf text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-leaf/90 transition-colors"
              >
                <span>➕</span> {t('postBuyingRequirement')}
              </Link>
              <Link
                to="/market"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-soil/15 text-soil text-sm font-medium rounded-xl hover:bg-soil/5 transition-colors"
              >
                <span>📊</span> {t('mandiRateExplorer')}
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
              <p className="text-lg md:text-xl font-bold tracking-tight">{t('directFarmSourcingTitle')}</p>
              <p className="text-xs md:text-sm text-white/80 max-w-xl mt-1">
                {t('directFarmSourcingDesc')}
              </p>
            </div>
          </div>

          {/* Next Action Hero Card */}
          {buyerSummary && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 md:p-6 mb-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold mb-1">
                    {t('recommendedProcurementAction')}
                  </p>
                  <p className="font-medium text-base text-white/95">
                    {buyerSummary.next_action}
                  </p>
                </div>
                <Link
                  to="/buyer/portal"
                  className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-900 font-semibold text-xs rounded-xl shadow-sm hover:bg-blue-50 transition-colors whitespace-nowrap self-start md:self-auto"
                >
                  {t('manageRequirements')}
                </Link>
              </div>
            </div>
          )}

          {/* 6 Buyer KPI Cards */}
          {buyerSummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <SummaryCard
                label={t('activeBuyingRequirements')}
                value={`${buyerSummary.active_requirements_count} ${t('activeUnitsCount')}`}
              />
              <SummaryCard
                label={t('farmerLotsReady')}
                value={`${buyerSummary.total_farmer_produce_lots} ${t('lotsCount')}`}
              />
              <SummaryCard
                label={t('totalRegionalSupply')}
                value={`${buyerSummary.total_supply_quantity_qtl.toLocaleString()} qtl`}
              />
              <SummaryCard
                label={t('availableCropTypes')}
                value={`${buyerSummary.unique_crops_available} ${t('cropsCount')}`}
              />
              <SummaryCard
                label={t('avgMandiBenchmark')}
                value={`₹${buyerSummary.avg_market_price_qtl.toLocaleString()} / qtl`}
              />
              <SummaryCard
                label={t('activeApmcMandis')}
                value={`${buyerSummary.active_mandis_count} ${t('mandisCount')}`}
              />
            </div>
          )}

          {/* Your Active Buying Requirements Section */}
          <div className="bg-white rounded-2xl border border-soil/10 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-soil text-lg">📋 {t('postedBuyingRequirements')}</h2>
                <p className="text-xs text-soil/60">{t('postedRequirementsSubtitle')}</p>
              </div>
              <Link to="/buyer/portal" className="text-xs font-semibold text-leaf hover:underline">
                {t('manageInPortal')}
              </Link>
            </div>

            {buyerRequirements.length === 0 ? (
              <div className="p-6 text-center bg-blue-50/50 rounded-xl border border-dashed border-blue-200">
                <p className="text-sm font-medium text-blue-900">{t('noPostedRequirements')}</p>
                <p className="text-xs text-blue-700/70 mt-1 mb-3">{t('noPostedRequirementsHelp')}</p>
                <Link
                  to="/buyer/portal"
                  className="inline-flex items-center gap-1 px-4 py-2 bg-leaf text-white text-xs font-semibold rounded-lg hover:bg-leaf/90 transition-colors"
                >
                  {t('createBuyingRequirementBtn')}
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
                        {t('demandLabel')} <strong>{req.required_quantity} Qtl</strong> • {t('offeringLabel')} <strong className="text-leaf">₹{req.offered_price} / Qtl</strong> • {t('deliveryLabel')} {req.location}
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
                        {t('editClose')}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf/75">{t('farmerOverview')}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-soil">{t('goodToSeeYou')}{profile ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
              <p className="text-sm text-soil/60">{t('dashboardIntro')}</p>
            </div>

            <button
              onClick={() => setShowWeather((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm border transition shadow-xs ${
                showWeather
                  ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950 hover:bg-emerald-200'
                  : 'bg-white border-soil/20 text-soil hover:bg-sand/40'
              }`}
            >
              <span>{showWeather ? t('hideWeather') : t('showWeatherAdvice')}</span>
            </button>
          </div>

          {/* Live Farm Weather Widget */}
          {showWeather && (
            <WeatherWidget defaultLocationName={profile?.location || 'Field / खेत'} />
          )}

          {/* Quick Farmer Actions Hub */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-soil flex items-center gap-2">
                  <span>🌾</span>
                  <span>{t('quickFarmerActions')}</span>
                </h2>
                <p className="text-xs text-soil/60">
                  {t('quickFarmerActionsSubtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Link
                to="/produce/new"
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🚜</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('newLotBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('sellMyProduce')}</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">{t('addHarvestSell')}</p>
                </div>
              </Link>

              <Link
                to="/market"
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">📊</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('liveRatesBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('mandiRates')}</h3>
                  <p className="text-[11px] text-amber-100 font-medium">{t('liveMandiRates')}</p>
                </div>
              </Link>

              <Link
                to="/buyers"
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🤝</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('tradersBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('directBuyers')}</h3>
                  <p className="text-[11px] text-blue-100 font-medium">{t('wholesaleBuyers')}</p>
                </div>
              </Link>

              <Link
                to="/storage"
                className="p-4 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">❄️</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('storageBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('coldStorage')}</h3>
                  <p className="text-[11px] text-cyan-100 font-medium">{t('safeStorageFinder')}</p>
                </div>
              </Link>

              <Link
                to="/processing"
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🏭</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('factoryBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('foodProcessing')}</h3>
                  <p className="text-[11px] text-purple-100 font-medium">{t('processingUnitsTitle')}</p>
                </div>
              </Link>

              <Link
                to="/assistant"
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-600 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">🩺</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('photoCheckBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('cropDoctorAi')}</h3>
                  <p className="text-[11px] text-rose-100 font-medium">{t('cropDoctorDiagnosis')}</p>
                </div>
              </Link>

              <Link
                to="/waste-utilization"
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-900 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">♻️</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('recoveryBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('wasteSolutions')}</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">{t('wasteToWealth')}</p>
                </div>
              </Link>

              <Link
                to="/analytics"
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-700 to-zinc-800 text-white shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">📈</span>
                  <span className="text-[10px] uppercase font-black bg-white/20 px-2 py-0.5 rounded-full">{t('incomeReportBadge')}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base">{t('farmAccounting')}</h3>
                  <p className="text-[11px] text-slate-200 font-medium">{t('revenueAnalytics')}</p>
                </div>
              </Link>
            </div>
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

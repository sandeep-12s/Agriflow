import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import {
  getDashboardSummary,
  getMyProfile,
  DashboardSummary,
  FarmerProfile,
} from '../api/client'

function DashboardPage() {
  const { token, logout, t } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [profile, setProfile] = useState<FarmerProfile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([getDashboardSummary(token), getMyProfile(token)])
      .then(([s, p]) => {
        setSummary(s)
        setProfile(p)
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

  return (
    <Layout>
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

      <ErrorBanner message={error} />

      {loading && <LoadingSpinner label={t('loading')} />}

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

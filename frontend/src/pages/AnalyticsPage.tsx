import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorBanner from '../components/ErrorBanner'
import { useAuth } from '../context/AuthContext'
import { getAnalyticsDashboard, AnalyticsDashboard } from '../api/client'

const STATUS_COLORS: Record<string, string> = {
  available: '#10B981', // emerald
  stored: '#F59E0B',    // amber
  processing: '#6366F1',// indigo
  sold: '#94A3B8',      // slate
}

// Benchmark data to give immediate visual value if a farmer has not yet logged enough crops
const BENCHMARK_DATA: AnalyticsDashboard = {
  produce_quantity_by_crop: [
    { crop_name: 'Wheat (गेहूं)', value: 85 },
    { crop_name: 'Mustard (सरसों)', value: 42 },
    { crop_name: 'Potato (आलू)', value: 120 },
    { crop_name: 'Tomato (टमाटर)', value: 35 },
    { crop_name: 'Chilli (मिर्च)', value: 18 },
  ],
  revenue_by_crop: [
    { crop_name: 'Wheat (गेहूं)', value: 195500 },
    { crop_name: 'Mustard (सरसों)', value: 243600 },
    { crop_name: 'Potato (आलू)', value: 180000 },
    { crop_name: 'Tomato (टमाटर)', value: 87500 },
    { crop_name: 'Chilli (मिर्च)', value: 108000 },
  ],
  profit_by_crop: [
    { crop_name: 'Wheat (गेहूं)', value: 89000 },
    { crop_name: 'Mustard (सरसों)', value: 132000 },
    { crop_name: 'Potato (आलू)', value: 74000 },
    { crop_name: 'Tomato (टमाटर)', value: 41000 },
    { crop_name: 'Chilli (मिर्च)', value: 62000 },
  ],
  wastage_avoided: 38400,
  price_trends: [
    { crop_name: 'Wheat (गेहूं)', previous_price: 2125, current_price: 2300 },
    { crop_name: 'Mustard (सरसों)', previous_price: 5450, current_price: 5800 },
    { crop_name: 'Potato (आलू)', previous_price: 1350, current_price: 1500 },
    { crop_name: 'Tomato (टमाटर)', previous_price: 2800, current_price: 2500 },
    { crop_name: 'Chilli (मिर्च)', previous_price: 5600, current_price: 6000 },
  ],
  transactions_summary: {
    total_transactions: 14,
    total_quantity: 180,
    total_value: 412500,
    by_status: { completed: 11, pending: 3 },
  },
  produce_status_breakdown: [
    { status: 'available', count: 4 },
    { status: 'stored', count: 3 },
    { status: 'processing', count: 1 },
    { status: 'sold', count: 6 },
  ],
}

export default function AnalyticsPage() {
  const { token, logout, t, user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [useBenchmark, setUseBenchmark] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<'all' | 'rabi' | 'kharif'>('all')

  useEffect(() => {
    if (!token) return
    getAnalyticsDashboard(token)
      .then((res) => {
        setData(res)
        // If user has zero produce registered, default to showing benchmark model so it's not a barren screen
        if (res.produce_quantity_by_crop.length === 0) {
          setUseBenchmark(true)
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          logout()
          navigate('/login')
        } else {
          setError('Could not load analytics.')
        }
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const activeData = useBenchmark ? BENCHMARK_DATA : (data || BENCHMARK_DATA)
  const hasRealData = (data?.produce_quantity_by_crop.length ?? 0) > 0

  // Computed Aggregates
  const stats = useMemo(() => {
    const totalRevenue = activeData.revenue_by_crop.reduce((acc, c) => acc + c.value, 0)
    const totalProfit = activeData.profit_by_crop.reduce((acc, c) => acc + c.value, 0)
    const totalQuantity = activeData.produce_quantity_by_crop.reduce((acc, c) => acc + c.value, 0)
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'
    const wastageSaved = activeData.wastage_avoided || 0
    const txTotalVal = activeData.transactions_summary?.total_value || 0
    const txCount = activeData.transactions_summary?.total_transactions || 0

    // Waste-to-Wealth potential (Estimated recovery value from biomass residues)
    const wasteWealthPotential = Math.round(totalQuantity * 145)

    return {
      totalRevenue,
      totalProfit,
      totalQuantity,
      profitMargin,
      wastageSaved,
      txTotalVal,
      txCount,
      wasteWealthPotential,
    }
  }, [activeData])

  // Chart datasets
  const revenueProfitData = useMemo(() => {
    return activeData.produce_quantity_by_crop.map((q) => {
      const revenue = activeData.revenue_by_crop.find((r) => r.crop_name === q.crop_name)?.value || 0
      const profit = activeData.profit_by_crop.find((p) => p.crop_name === q.crop_name)?.value || 0
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
      return {
        crop: q.crop_name.split(' (')[0], // Short name for axis readability
        fullName: q.crop_name,
        quantity: q.value,
        revenue,
        profit,
        margin,
      }
    })
  }, [activeData])

  const priceTrendData = useMemo(() => {
    return activeData.price_trends.map((pt) => {
      const diff = pt.current_price - pt.previous_price
      const pct = pt.previous_price > 0 ? ((diff / pt.previous_price) * 100).toFixed(1) : '0'
      return {
        crop: pt.crop_name.split(' (')[0],
        fullName: pt.crop_name,
        previous: pt.previous_price,
        current: pt.current_price,
        diff,
        pct: Number(pct),
      }
    })
  }, [activeData])

  const statusData = useMemo(() => {
    return activeData.produce_status_breakdown.map((s) => ({
      name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
      rawStatus: s.status,
      value: s.count,
    }))
  }, [activeData])

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner label={t('loading')} />
      </Layout>
    )
  }

  if (error && !data) {
    return (
      <Layout>
        <ErrorBanner message={error || t('noPriceData')} />
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7 bg-gradient-to-r from-leaf/10 via-wheat/10 to-transparent p-5 md:p-6 rounded-3xl border border-leaf/15">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-leaf text-white">
              {t('analyticsOverview')}
            </span>
            {useBenchmark ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300">
                📊 Regional Benchmark Model (क्षेत्रीय आदर्श मॉडल)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t('liveActivity')}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-soil">
            {t('farmNumbers')}
          </h1>
          <p className="text-xs md:text-sm text-soil/70 mt-1 max-w-xl">
            {t('analyticsIntro')} {user?.name ? `(${user.name})` : ''}
          </p>
        </div>

        {/* Action / Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {hasRealData && (
            <button
              onClick={() => setUseBenchmark(!useBenchmark)}
              className={`text-xs px-3.5 py-2 rounded-xl font-medium transition-all shadow-sm ${
                useBenchmark
                  ? 'bg-soil text-white hover:bg-soil/90'
                  : 'bg-white border border-soil/20 text-soil hover:bg-soil/5'
              }`}
            >
              {useBenchmark ? 'Switch to My Farm Data' : 'Compare Regional Benchmarks'}
            </button>
          )}

          <div className="flex items-center bg-white/90 backdrop-blur rounded-xl border border-soil/20 p-1">
            <button
              onClick={() => setSelectedSeason('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedSeason === 'all'
                  ? 'bg-leaf text-white shadow-sm'
                  : 'text-soil/70 hover:text-soil'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setSelectedSeason('rabi')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedSeason === 'rabi'
                  ? 'bg-leaf text-white shadow-sm'
                  : 'text-soil/70 hover:text-soil'
              }`}
            >
              Rabi
            </button>
            <button
              onClick={() => setSelectedSeason('kharif')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                selectedSeason === 'kharif'
                  ? 'bg-leaf text-white shadow-sm'
                  : 'text-soil/70 hover:text-soil'
              }`}
            >
              Kharif
            </button>
          </div>
        </div>
      </div>

      {/* Benchmark Indicator Notice if no real data */}
      {!hasRealData && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-semibold">{t('farmStory')}</p>
              <p className="text-amber-800/80 text-xs">
                You haven&apos;t added produce yet. Showing simulated regional benchmark data so you can explore analytics capabilities.
              </p>
            </div>
          </div>
          <Link
            to="/produce"
            className="whitespace-nowrap px-3.5 py-1.5 bg-leaf text-white rounded-xl font-medium text-xs hover:bg-leaf/90 transition shadow-sm"
          >
            + Add First Crop
          </Link>
        </div>
      )}

      {/* 5 KPI Metric Cards Bento Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-7">
        {/* Gross Harvest Revenue */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:shadow-md transition group border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-soil/60">
              Gross Valuation
            </p>
            <span className="text-lg">🌾</span>
          </div>
          <p className="text-2xl font-extrabold text-soil mt-2">
            ₹{stats.totalRevenue.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-semibold">
            <span className="bg-emerald-100 px-2 py-0.5 rounded-md">
              {stats.totalQuantity} Quintals
            </span>
            <span className="text-[11px] text-soil/50 font-normal">tracked yield</span>
          </div>
        </div>

        {/* Net Profit & Margin */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:shadow-md transition group border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-soil/60">
              Net Profit
            </p>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 mt-2">
            ₹{stats.totalProfit.toLocaleString()}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-md text-[11px]">
              +{stats.profitMargin}% Margin
            </span>
            <span className="text-[11px] text-soil/50">profitability</span>
          </div>
        </div>

        {/* Spoilage Loss Averted */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:shadow-md transition group border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-soil/60">
              {t('wastageAvoided')}
            </p>
            <span className="text-lg">🛡️</span>
          </div>
          <p className="text-2xl font-extrabold text-teal-800 mt-2">
            ₹{stats.wastageSaved.toLocaleString()}
          </p>
          <p className="text-[11px] text-soil/60 mt-2">
            {t('valueProtected')} via timely storage/sell alerts
          </p>
        </div>

        {/* Mandi Transactions */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:shadow-md transition group border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-soil/60">
              {t('transactions')}
            </p>
            <span className="text-lg">🤝</span>
          </div>
          <p className="text-2xl font-extrabold text-soil mt-2">
            ₹{stats.txTotalVal.toLocaleString()}
          </p>
          <p className="text-[11px] text-soil/60 mt-2">
            {stats.txCount} {t('completedProposals')} realized
          </p>
        </div>

        {/* Waste to Wealth Potential */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-soil/10 p-5 shadow-sm hover:shadow-md transition group border-l-4 border-l-lime-600">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-soil/60">
              Waste to Wealth
            </p>
            <span className="text-lg">♻️</span>
          </div>
          <p className="text-2xl font-extrabold text-leaf mt-2">
            +₹{stats.wasteWealthPotential.toLocaleString()}
          </p>
          <Link
            to="/waste-utilization"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf hover:underline mt-2"
          >
            Convert Stubble &rarr;
          </Link>
        </div>
      </div>

      {/* Main Charts Row: Revenue/Profit Trajectory & Produce Status Donut */}
      <div className="grid gap-6 lg:grid-cols-3 mb-7">
        {/* Revenue vs Profit Area Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-soil/10 p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-bold text-soil flex items-center gap-2">
                <span>📈</span> Harvest Revenue &amp; Net Profit by Crop
              </h2>
              <p className="text-xs text-soil/60 mt-0.5">
                Gross market realization vs. net estimated profit across crops
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span> Revenue
              </span>
              <span className="flex items-center gap-1 text-leaf">
                <span className="w-3 h-3 rounded-full bg-leaf"></span> Net Profit
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueProfitData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8B84B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E8B84B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F5D3A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2F5D3A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#5B463615" />
                <XAxis
                  dataKey="crop"
                  tick={{ fontSize: 12, fill: '#5B4636' }}
                  axisLine={{ stroke: '#5B463620' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5B4636' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(val: unknown) => [`₹${Number(val).toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: '#FFFDF9',
                    borderRadius: '16px',
                    borderColor: '#E2D9C8',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#E8B84B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                  name="Gross Revenue (₹)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#2F5D3A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  name="Net Profit (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Pipeline Donut Chart (Spans 1 col) */}
        <div className="bg-white rounded-3xl border border-soil/10 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-soil flex items-center gap-2">
              <span>📦</span> Inventory Status
            </h2>
            <p className="text-xs text-soil/60 mt-0.5">Distribution across supply stages</p>
          </div>

          <div className="relative h-[210px] w-full my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.rawStatus] || '#5B4636'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: unknown) => [`${val} Batches`, 'Count']}
                  contentStyle={{
                    backgroundColor: '#FFFDF9',
                    borderRadius: '12px',
                    borderColor: '#E2D9C8',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center stat inside donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-soil leading-none">
                {statusData.reduce((acc, s) => acc + s.value, 0)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-soil/50 mt-1">
                Batches
              </span>
            </div>
          </div>

          {/* Status Breakdown Legend Chips */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-soil/10">
            {statusData.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between p-2 rounded-xl bg-husk/50 text-xs"
              >
                <span className="flex items-center gap-1.5 font-medium text-soil truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[s.rawStatus] || '#5B4636' }}
                  ></span>
                  {s.name}
                </span>
                <span className="font-bold text-soil">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Charts Row: Market Price Trends & Crop Profitability Matrix */}
      <div className="grid gap-6 lg:grid-cols-2 mb-7">
        {/* Market Rate Dynamics (Bar Chart with % change badges) */}
        <div className="bg-white rounded-3xl border border-soil/10 p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base md:text-lg font-bold text-soil flex items-center gap-2">
                <span>📊</span> Mandi Rate Dynamics (₹/Quintal)
              </h2>
              <p className="text-xs text-soil/60 mt-0.5">
                Comparison with previous trade cycle in nearest APMC mandis
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-soil/60">
                <span className="w-3 h-3 rounded-full bg-soil/30"></span> Prev
              </span>
              <span className="flex items-center gap-1 text-leaf">
                <span className="w-3 h-3 rounded-full bg-emerald-600"></span> Current
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#5B463615" />
                <XAxis
                  dataKey="crop"
                  tick={{ fontSize: 12, fill: '#5B4636' }}
                  axisLine={{ stroke: '#5B463620' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#5B4636' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(val: unknown) => [`₹${Number(val).toLocaleString()}/Qtl`, '']}
                  contentStyle={{
                    backgroundColor: '#FFFDF9',
                    borderRadius: '16px',
                    borderColor: '#E2D9C8',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="previous" fill="#94A3B8" radius={[4, 4, 0, 0]} name="Previous Price" />
                <Bar dataKey="current" fill="#10B981" radius={[4, 4, 0, 0]} name="Current Price" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Price Delta Chips */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-soil/10">
            {priceTrendData.map((pt) => (
              <div
                key={pt.crop}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-husk text-xs font-medium text-soil"
              >
                <span>{pt.crop}:</span>
                <span
                  className={`font-bold ${
                    pt.pct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {pt.pct >= 0 ? `▲ +${pt.pct}%` : `▼ ${pt.pct}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Crop Profitability Leaderboard */}
        <div className="bg-white rounded-3xl border border-soil/10 p-5 md:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base md:text-lg font-bold text-soil flex items-center gap-2">
              <span>🏆</span> Crop Profitability Ranking
            </h2>
            <p className="text-xs text-soil/60 mt-0.5">
              Net profit contribution and margins per harvest crop
            </p>
          </div>

          <div className="divide-y divide-soil/10 mt-3 space-y-3">
            {revenueProfitData
              .slice()
              .sort((a, b) => b.profit - a.profit)
              .map((c, idx) => (
                <div key={c.fullName} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-soil text-sm">{c.fullName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 text-sm">
                        ₹{c.profit.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-soil/50 ml-1.5">({c.margin}% margin)</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-husk rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-leaf h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          stats.totalProfit > 0 ? (c.profit / stats.totalProfit) * 100 : 0
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-soil/50 mt-1">
                    <span>Yield: {c.quantity} Quintals</span>
                    <span>Revenue: ₹{c.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-4 pt-3 border-t border-soil/10 flex justify-between items-center text-xs">
            <span className="text-soil/70 font-medium">Want to optimize crop yields?</span>
            <Link
              to="/recommendations"
              className="text-leaf font-bold hover:underline inline-flex items-center gap-1"
            >
              View Recommendations &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* AI Kisan Financial & Agronomic Intelligence Advisory */}
      <div className="bg-gradient-to-br from-leaf/10 via-white to-wheat/10 rounded-3xl border border-leaf/20 p-5 md:p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🤖</span>
          <h2 className="text-base md:text-lg font-bold text-soil">
            Kisan Smart Intelligence &amp; Agronomic Advisory (किसान स्मार्ट सलाह)
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-leaf/15 p-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
              <span>📈</span> Mandi Upside Timing
            </div>
            <p className="text-xs text-soil/80 leading-relaxed">
              Mustard and Wheat prices show steady +6% to +8% upside momentum in regional APMC mandis. Staggering your sales across 3 weeks can yield an additional <strong>₹14,000 to ₹22,000</strong>.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">
              <span>🛡️</span> Cold Storage Hedging
            </div>
            <p className="text-xs text-soil/80 leading-relaxed">
              Perishable crops like Potato and Tomato face immediate post-harvest gluts. Utilizing AgriFlow vetted cold storage partners protects against a 25% distress discount.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl border border-lime-600/20 p-4">
            <div className="flex items-center gap-2 text-leaf font-bold text-xs uppercase tracking-wider mb-1">
              <span>♻️</span> Stubble Monetization
            </div>
            <p className="text-xs text-soil/80 leading-relaxed">
              Harvested crops generate approximately {(stats.totalQuantity * 0.8).toFixed(1)} tons of residue. Connecting with local biomass pellet units can unlock <strong>+₹{stats.wasteWealthPotential.toLocaleString()}</strong> in extra earnings.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

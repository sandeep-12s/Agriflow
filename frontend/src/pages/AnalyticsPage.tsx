import { useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  available: '#2F5D3A',
  stored: '#E8B84B',
  processing: '#5B4636',
  sold: '#9CA3AF',
}

function AnalyticsPage() {
  const { token, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    getAnalyticsDashboard(token)
      .then(setData)
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

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner label="Loading analytics…" />
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        <ErrorBanner message={error || 'No data.'} />
      </Layout>
    )
  }

  const revenueProfitData = data.produce_quantity_by_crop.map((q) => {
    const revenue = data.revenue_by_crop.find((r) => r.crop_name === q.crop_name)?.value || 0
    const profit = data.profit_by_crop.find((p) => p.crop_name === q.crop_name)?.value || 0
    return { crop: q.crop_name, quantity: q.value, revenue, profit }
  })

  const priceTrendData = data.price_trends.map((t) => ({
    crop: t.crop_name,
    previous: t.previous_price,
    current: t.current_price,
  }))

  const statusData = data.produce_status_breakdown.map((s) => ({ name: s.status, value: s.count }))

  return (
    <Layout>
      <div className="analytics-header mb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-leaf/75 mb-2">
            Performance overview
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-soil mb-1">Your farm, in numbers</h1>
          <p className="text-sm text-soil/60">
            See where value is being created across your produce, prices, and transactions.
          </p>
        </div>
        <div className="analytics-period">Live from your activity</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 mb-7">
        <StatCard
          label="Wastage avoided"
          value={`₹${data.wastage_avoided.toLocaleString()}`}
          hint="Value protected"
          accent="green"
        />
        <StatCard
          label="Transactions"
          value={data.transactions_summary.total_transactions}
          hint="Completed proposals"
          accent="gold"
        />
        <StatCard
          label="Transaction value"
          value={`₹${data.transactions_summary.total_value.toLocaleString()}`}
          hint="Total realized value"
          accent="soil"
        />
      </div>

      {revenueProfitData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-soil/20 p-10 text-center">
          <p className="text-soil font-semibold mb-1">Your farm story starts here</p>
          <p className="text-sm text-soil/60">
            Add produce and check its recommendations to start seeing charts here.
          </p>
        </div>
      ) : (
        <>
          <div className="analytics-chart-grid">
          <ChartCard title="Produce quantity" subtitle="Volume currently tracked by crop">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueProfitData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#5B463620" />
                <XAxis dataKey="crop" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F6F2E9' }} />
                <Bar dataKey="quantity" fill="#2F5D3A" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue vs profit" subtitle="Estimated value across your harvest">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueProfitData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#5B463620" />
                <XAxis dataKey="crop" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F6F2E9' }} />
                <Legend />
                <Bar dataKey="revenue" fill="#E8B84B" name="Revenue (₹)" />
                <Bar dataKey="profit" fill="#2F5D3A" name="Profit (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          </div>
        </>
      )}

      {priceTrendData.length > 0 && (
        <ChartCard title="Market price trends" subtitle="Current prices compared with the previous period">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={priceTrendData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#5B463620" />
              <XAxis dataKey="crop" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F6F2E9' }} />
              <Legend />
              <Bar dataKey="previous" fill="#9CA3AF" name="Previous Price" />
              <Bar dataKey="current" fill="#2F5D3A" name="Current Price" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {statusData.length > 0 && (
        <ChartCard title="Produce status" subtitle="How your current inventory is moving">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.name] || '#5B4636'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </Layout>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string | number
  hint: string
  accent: 'green' | 'gold' | 'soil'
}) {
  return (
    <div className={`analytics-stat analytics-stat-${accent} bg-white rounded-2xl border border-soil/10 p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-soil/50 mb-3">{label}</p>
      <p className="text-2xl font-bold text-soil leading-none">{value}</p>
      <p className="text-xs text-soil/50 mt-3">{hint}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="analytics-chart-card bg-white rounded-2xl border border-soil/10 p-4 md:p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="font-semibold text-soil">{title}</h2>
          <p className="text-xs text-soil/50 mt-1">{subtitle}</p>
        </div>
        <span className="analytics-chart-dot" aria-hidden="true" />
      </div>
      {children}
    </div>
  )
}

export default AnalyticsPage

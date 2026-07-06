import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import api from '../lib/api'

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#4ade80', '#f87171', '#a78bfa', '#fb7185']

const s = {
  page: { minHeight: '100vh', background: '#0f172a' },
  nav: { background: '#1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid #334155' },
  navTitle: { fontSize: 20, fontWeight: 700, color: '#818cf8' },
  backBtn: { background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '40px 24px' },
  header: { marginBottom: 32 },
  h1: { fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 },
  sub: { color: '#64748b', fontSize: 14 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 },
  statCard: { background: '#1e293b', borderRadius: 10, padding: 20, border: '1px solid #334155' },
  statValue: { fontSize: 36, fontWeight: 800, color: '#818cf8' },
  statLabel: { color: '#64748b', fontSize: 13, marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155' },
  cardFull: { background: '#1e293b', borderRadius: 12, padding: 24, border: '1px solid #334155', marginBottom: 20 },
  h3: { fontSize: 15, fontWeight: 600, color: '#cbd5e1', marginBottom: 20 },
  tableRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #0f172a', fontSize: 13, color: '#94a3b8' },
  badge: { background: '#0f172a', padding: '2px 8px', borderRadius: 4, fontSize: 11, color: '#818cf8' },
  empty: { color: '#475569', textAlign: 'center', padding: 40 },
}

function StatCard({ value, label }) {
  return (
    <div style={s.statCard}>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div style={s.card}>
      <div style={s.h3}>{title}</div>
      {children}
    </div>
  )
}

function toChartData(obj) {
  return Object.entries(obj || {})
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

export default function Analytics() {
  const { code } = useParams()
  const nav = useNavigate()

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['stats', code],
    queryFn: () => api.get(`/urls/${code}/stats`).then(r => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) return <div style={{ ...s.empty, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>Loading analytics…</div>
  if (isError) return <div style={{ ...s.empty, color: '#f87171', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Failed to load stats.</div>

  const countryData = toChartData(stats.clicks_by_country)
  const deviceData = toChartData(stats.clicks_by_device)
  const browserData = toChartData(stats.clicks_by_browser)
  const dateData = Object.entries(stats.clicks_by_date || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, clicks]) => ({ date, clicks }))

  const topCountry = countryData[0]?.name || '—'
  const topDevice = deviceData[0]?.name || '—'

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <button style={s.backBtn} onClick={() => nav('/')}>← Back</button>
        <span style={s.navTitle}>⚡ LinkShort Analytics</span>
      </nav>

      <div style={s.main}>
        <div style={s.header}>
          <h1 style={s.h1}>/{code}</h1>
          <div style={s.sub}>{stats.original_url}</div>
        </div>

        <div style={s.statsRow}>
          <StatCard value={stats.total_clicks} label="Total Clicks" />
          <StatCard value={Object.keys(stats.clicks_by_country || {}).length} label="Countries" />
          <StatCard value={topCountry} label="Top Country" />
          <StatCard value={topDevice} label="Top Device" />
        </div>

        <div style={s.cardFull}>
          <div style={s.h3}>Clicks over time</div>
          {dateData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Line type="monotone" dataKey="clicks" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div style={s.empty}>No click data yet</div>}
        </div>

        <div style={s.grid}>
          <ChartCard title="Clicks by Country">
            {countryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={countryData.slice(0, 8)} layout="vertical">
                  <XAxis type="number" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} width={80} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={s.empty}>No data</div>}
          </ChartCard>

          <ChartCard title="Device Breakdown">
            {deviceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={s.empty}>No data</div>}
          </ChartCard>

          <ChartCard title="Browser Breakdown">
            {browserData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={browserData.slice(0, 6)}>
                  <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={s.empty}>No data</div>}
          </ChartCard>

          <ChartCard title="Recent Clicks">
            {stats.recent_clicks?.length > 0 ? (
              <div>
                {stats.recent_clicks.map((click, i) => (
                  <div key={i} style={s.tableRow}>
                    <span>{new Date(click.clicked_at).toLocaleString()}</span>
                    <span style={s.badge}>{click.country || '—'}</span>
                    <span>{click.device_type || '—'}</span>
                    <span>{click.browser || '—'}</span>
                  </div>
                ))}
              </div>
            ) : <div style={s.empty}>No clicks yet</div>}
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

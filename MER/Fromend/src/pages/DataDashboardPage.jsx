import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'
import Navbar from '../components/Navbar'
import './DataDashboardPage.css'

function fillDays(data, n = 30) {
  const map = {}
  data.forEach(d => { map[d._id] = d.count })
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: map[key] || 0 })
  }
  return days
}

function getInitialDark() {
  try {
    const admin = JSON.parse(localStorage.getItem('admin') || 'null')
    if (admin?.theme === 'dark') return true
    if (admin?.theme === 'light') return false
  } catch { /* ignore */ }
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function AreaChart({ data }) {
  if (!data || data.length < 2) return null
  const W = 600, H = 130, PL = 30, PR = 10, PT = 10, PB = 26
  const cW = W - PL - PR
  const cH = H - PT - PB
  const max = Math.max(...data.map(d => d.count), 1)

  const pts = data.map((d, i) => ({
    x: PL + (i / (data.length - 1)) * cW,
    y: PT + cH - (d.count / max) * cH,
    ...d,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${(PL + cW).toFixed(1)},${(PT + cH).toFixed(1)} L${PL},${(PT + cH).toFixed(1)} Z`
  const gridYs = [0, 0.5, 1].map(pct => ({ y: PT + cH * (1 - pct), val: Math.round(max * pct) }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dd-area-svg" aria-label="Registration trend">
      <defs>
        <linearGradient id="ddAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridYs.map(g => (
        <g key={g.y}>
          <line x1={PL} y1={g.y} x2={W - PR} y2={g.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" />
          <text x={PL - 5} y={g.y + 4} textAnchor="end" fontSize="9" fill="var(--text)">{g.val}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#ddAreaGrad)" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
      {pts.map((p, i) => (
        i % 5 === 0 || i === pts.length - 1 ? (
          <text key={p.date} x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill="var(--text)">
            {p.date.slice(5)}
          </text>
        ) : null
      ))}
      {pts.filter(p => p.count > 0).map(p => (
        <circle key={p.date} cx={p.x} cy={p.y} r="2.5" fill="var(--accent)">
          <title>{p.date}: {p.count} registrations</title>
        </circle>
      ))}
    </svg>
  )
}

function DonutChart({ segments }) {
  const R = 52, CX = 72, CY = 72, STROKE = 20
  const CIRC = 2 * Math.PI * R
  const total = segments.reduce((s, g) => s + g.value, 0)
  let cum = 0
  const arcs = segments.map(seg => {
    const pct = total > 0 ? seg.value / total : 0
    const dash = pct * CIRC
    const offset = -(cum * CIRC)
    cum += pct
    return { ...seg, dash, offset }
  })

  return (
    <div className="dd-donut-wrap">
      <svg width="144" height="144" viewBox="0 0 144 144">
        {total === 0 ? (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        ) : (
          arcs.map(arc => arc.value > 0 && (
            <circle key={arc.label}
              cx={CX} cy={CY} r={R}
              fill="none" stroke={arc.color}
              strokeWidth={STROKE}
              strokeDasharray={`${arc.dash} ${CIRC}`}
              strokeDashoffset={arc.offset}
              transform={`rotate(-90,${CX},${CY})`}
            >
              <title>{arc.label}: {arc.value}</title>
            </circle>
          ))
        )}
        <text x={CX} y={CY - 7} textAnchor="middle" fill="var(--text-h)" fontSize="24" fontWeight="700">{total}</text>
        <text x={CX} y={CY + 13} textAnchor="middle" fill="var(--text)" fontSize="11">total</text>
      </svg>
      <div className="dd-donut-legend">
        {segments.map(seg => {
          const pct = total > 0 ? Math.round(seg.value / total * 100) : 0
          return (
            <div key={seg.label} className="dd-legend-row">
              <div className="dd-legend-dot" style={{ background: seg.color }} />
              <span className="dd-legend-label">{seg.label}</span>
              <span className="dd-legend-val">{seg.value.toLocaleString()}</span>
              <span className="dd-legend-pct">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HBarChart({ items, totalItems, colorFn, showPct }) {
  const max = Math.max(...items.map(d => d.count), 1)
  return (
    <div className="dd-hbar-list">
      {items.map((item, i) => {
        const pct = max > 0 ? (item.count / max) * 100 : 0
        const sharePct = totalItems > 0 ? Math.round((item.count / totalItems) * 100) : Math.round(pct)
        return (
          <div key={item._id ?? i} className="dd-hbar-row">
            <span className="dd-hbar-label" title={item._id ?? 'Unknown'}>{item._id ?? 'Unknown'}</span>
            <div className="dd-hbar-track">
              <div className="dd-hbar-fill" style={{ width: `${pct}%`, background: colorFn ? colorFn(i, item) : 'var(--accent)' }} />
            </div>
            <span className="dd-hbar-val">
              {item.count.toLocaleString()}
              {showPct && <span className="dd-hbar-pct"> {sharePct}%</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="dd-metric-card">
      {icon && (
        <div className="dd-metric-icon" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
          {icon}
        </div>
      )}
      <div className="dd-metric-body">
        <div className="dd-metric-value" style={{ color }}>{value}</div>
        <div className="dd-metric-label">{label}</div>
        {sub && <div className="dd-metric-sub">{sub}</div>}
      </div>
    </div>
  )
}

const PIPELINE_ORDER = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost']
const PIPELINE_COLORS = {
  Lead: '#6366f1', Contacted: '#3b82f6', Qualified: '#06b6d4',
  Proposal: '#f59e0b', 'Closed Won': '#22c55e', 'Closed Lost': '#ef4444',
}
const STATUS_COLORS = { Active: '#22c55e', Inactive: '#ca8a04', Banned: '#ef4444' }
const GENDER_COLORS  = { Male: '#6366f1', Female: '#ec4899', Other: '#8b5cf6' }
const PALETTE = ['#3b82f6','#6366f1','#ec4899','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316']
const IP_COLORS = ['#3b82f6', '#6366f1', '#22c55e', '#f59e0b']

export default function DataDashboardPage() {
  useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [isDark, setIsDark]   = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    apiFetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleThemeToggle = () => {
    const next = !isDark
    setIsDark(next)
    apiFetch('/api/auth/theme', { method: 'PATCH', body: JSON.stringify({ theme: next ? 'dark' : 'light' }) }).catch(() => {})
    try {
      const stored = JSON.parse(localStorage.getItem('admin') || 'null')
      if (stored) localStorage.setItem('admin', JSON.stringify({ ...stored, theme: next ? 'dark' : 'light' }))
    } catch { /* ignore */ }
  }

  const days      = data ? fillDays(data.registrationsByDay) : []
  const totalRegs = days.reduce((s, d) => s + d.count, 0)
  const activeRate = data && data.totals.total > 0
    ? Math.round((data.totals.active / data.totals.total) * 100)
    : 0

  const genderSegments = data
    ? [
        { label: 'Male',   value: data.genderBreakdown.find(g => g._id === 'Male')?.count   ?? 0, color: GENDER_COLORS.Male },
        { label: 'Female', value: data.genderBreakdown.find(g => g._id === 'Female')?.count ?? 0, color: GENDER_COLORS.Female },
        { label: 'Other',  value: data.genderBreakdown.find(g => g._id === 'Other')?.count  ?? 0, color: GENDER_COLORS.Other },
      ]
    : []

  const pipelineData = data
    ? PIPELINE_ORDER
        .map(stage => ({ _id: stage, count: data.pipelineBreakdown.find(p => p._id === stage)?.count ?? 0 }))
        .filter(p => p.count > 0)
    : []

  return (
    <div className="dd-page">
      <Navbar isDark={isDark} onToggleTheme={handleThemeToggle} onSettings={null} />

      <main className="main dd-main">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Data Dashboard</h1>
            <p className="subtitle">Full dataset visualisation — users, demographics, pipeline & activity</p>
          </div>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            Users
          </Link>
        </div>

        {loading && <p className="state">Loading dashboard…</p>}
        {error   && <p className="state error">{error}</p>}

        {data && (
          <>
            {/* ── KPI row ── */}
            <div className="dd-kpi-row">
              <MetricCard
                label="Total Users" value={data.totals.total.toLocaleString()}
                sub={`${activeRate}% active`} color="var(--accent)"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              />
              <MetricCard
                label="Active" value={data.totals.active.toLocaleString()}
                sub={`${data.totals.inactive} inactive · ${data.totals.banned} banned`} color="#22c55e"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
              />
              <MetricCard
                label="New (30 days)" value={totalRegs.toLocaleString()}
                sub="registrations" color="#8b5cf6"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
              />
              <MetricCard
                label="Deal Value"
                value={data.deal.totalValue > 0 ? `$${(data.deal.totalValue / 1000).toFixed(1)}k` : '$0'}
                sub={`across ${data.deal.count} deals`} color="#f59e0b"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
              />
              <MetricCard
                label="Pipeline Leads"
                value={(data.pipelineBreakdown.find(p => p._id === 'Lead')?.count ?? 0).toLocaleString()}
                sub="in Lead stage" color="#6366f1"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
              />
            </div>

            {/* ── Registration trend ── */}
            <div className="dd-section">
              <div className="dd-section-hdr">
                <span className="dd-section-title">Registration Trend</span>
                <span className="dd-section-sub">{totalRegs} new user{totalRegs !== 1 ? 's' : ''} in the last 30 days</span>
              </div>
              <AreaChart data={days} />
            </div>

            {/* ── Gender + Pipeline ── */}
            <div className="dd-2col">
              <div className="dd-section">
                <div className="dd-section-hdr">
                  <span className="dd-section-title">Gender Distribution</span>
                  <span className="dd-section-sub">{data.totals.total.toLocaleString()} users</span>
                </div>
                <DonutChart segments={genderSegments} />
              </div>

              <div className="dd-section">
                <div className="dd-section-hdr">
                  <span className="dd-section-title">Pipeline Stages</span>
                  <span className="dd-section-sub">{data.totals.total.toLocaleString()} users</span>
                </div>
                <HBarChart
                  items={pipelineData}
                  totalItems={data.totals.total}
                  colorFn={(_, item) => PIPELINE_COLORS[item._id] ?? 'var(--accent)'}
                  showPct
                />
              </div>
            </div>

            {/* ── Status + Email Domains ── */}
            <div className="dd-2col">
              <div className="dd-section">
                <div className="dd-section-hdr">
                  <span className="dd-section-title">User Status</span>
                </div>
                <HBarChart
                  items={data.statusBreakdown}
                  totalItems={data.totals.total}
                  colorFn={(_, item) => STATUS_COLORS[item._id] ?? 'var(--text)'}
                  showPct
                />
              </div>

              {data.emailDomains?.length > 0 && (
                <div className="dd-section">
                  <div className="dd-section-hdr">
                    <span className="dd-section-title">Email Domains</span>
                    <span className="dd-section-sub">Top 10</span>
                  </div>
                  <HBarChart
                    items={data.emailDomains}
                    colorFn={i => PALETTE[i % PALETTE.length]}
                  />
                </div>
              )}
            </div>

            {/* ── Top names + IP Classes ── */}
            <div className="dd-2col">
              {data.topFirstNames?.length > 0 && (
                <div className="dd-section">
                  <div className="dd-section-hdr">
                    <span className="dd-section-title">Top First Names</span>
                    <span className="dd-section-sub">Top 10</span>
                  </div>
                  <HBarChart
                    items={data.topFirstNames}
                    colorFn={i => PALETTE[i % PALETTE.length]}
                  />
                </div>
              )}

              {data.ipClasses?.length > 0 && (
                <div className="dd-section">
                  <div className="dd-section-hdr">
                    <span className="dd-section-title">IP Address Classes</span>
                    <span className="dd-section-sub">RFC 791 classification</span>
                  </div>
                  <HBarChart
                    items={data.ipClasses}
                    totalItems={data.totals.total}
                    colorFn={i => IP_COLORS[i % IP_COLORS.length]}
                    showPct
                  />
                </div>
              )}
            </div>

            {/* ── Recently active ── */}
            {data.recentlyActive.length > 0 && (
              <div className="dd-section">
                <div className="dd-section-hdr">
                  <span className="dd-section-title">Recently Active Users</span>
                  <span className="dd-section-sub">Last 5 profile views</span>
                </div>
                <div className="dd-active-list">
                  {data.recentlyActive.map((u, i) => {
                    const seed   = encodeURIComponent(`${u.first_name} ${u.last_name}`)
                    const avatar = u.photo || `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
                    return (
                      <div key={u._id} className="dd-active-row">
                        <span className="dd-active-rank">{i + 1}</span>
                        <img className="dd-active-avatar" src={avatar} alt="" />
                        <div className="dd-active-info">
                          <div className="dd-active-name">{u.first_name} {u.last_name}</div>
                          <div className="dd-active-email">{u.email}</div>
                        </div>
                        <span className="dd-active-time">
                          {u.lastActivity
                            ? new Date(u.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

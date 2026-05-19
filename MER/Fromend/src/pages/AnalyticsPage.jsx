import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../utils/api'
import Navbar from '../components/Navbar'
import './AnalyticsPage.css'

// Fill in every day of the last 30 days, defaulting missing dates to 0
function fillDays(data, n = 30) {
  const map = {}
  data.forEach(d => { map[d._id] = d.count })
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d   = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: map[key] || 0 })
  }
  return days
}

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 600, H = 160, PL = 28, PB = 22, PT = 8, PR = 8
  const cW = W - PL - PR
  const cH = H - PT - PB
  const bW = cW / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart-svg" aria-label="Registrations bar chart">
      {[0, 0.5, 1].map(pct => {
        const y   = PT + cH * (1 - pct)
        const val = Math.round(max * pct)
        return (
          <g key={pct}>
            <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={PL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text)">{val}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * cH, d.count > 0 ? 2 : 0)
        const x = PL + i * bW + 1
        const y = PT + cH - h
        return (
          <g key={d.date}>
            <rect x={x} y={y} width={bW - 2} height={h} fill="var(--accent)" opacity={0.75} rx="2">
              <title>{d.date}: {d.count}</title>
            </rect>
            {i % 5 === 0 && (
              <text x={x + bW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text)">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function getInitialDark() {
  try {
    const admin = JSON.parse(localStorage.getItem('admin') || 'null')
    if (admin?.theme === 'dark') return true
    if (admin?.theme === 'light') return false
  } catch { /* ignore parse errors */ }
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function AnalyticsPage() {
  useAuth()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [isDark, setIsDark] = useState(getInitialDark)

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
    apiFetch('/api/auth/theme', { method: 'PATCH', body: JSON.stringify({ theme: next ? 'dark' : 'light' }) }).catch(() => { /* ignore */ })
    try {
      const stored = JSON.parse(localStorage.getItem('admin') || 'null')
      if (stored) localStorage.setItem('admin', JSON.stringify({ ...stored, theme: next ? 'dark' : 'light' }))
    } catch { /* ignore parse errors */ }
  }

  const days      = data ? fillDays(data.registrationsByDay) : []
  const totalRegs = days.reduce((s, d) => s + d.count, 0)

  const STATUS_COLORS = { Active: '#22c55e', Inactive: '#ca8a04', Banned: '#ef4444' }
  const GENDER_COLORS = { Male: '#6366f1', Female: '#ec4899', Other: '#8b5cf6', null: 'var(--text)' }

  return (
    <div className="analytics-page">
      <Navbar isDark={isDark} onToggleTheme={handleThemeToggle} onSettings={null} />

      <main className="main analytics-main">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Analytics</h1>
            <p className="subtitle">User statistics and trends</p>
          </div>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Users
          </Link>
        </div>

        {loading && <p className="state">Loading analytics…</p>}
        {error   && <p className="state error">{error}</p>}

        {data && (
          <>
            {/* Totals */}
            <div className="an-cards">
              {[
                { label: 'Total Users', value: data.totals.total,    color: 'var(--accent)' },
                { label: 'Active',      value: data.totals.active,   color: '#22c55e' },
                { label: 'Inactive',    value: data.totals.inactive, color: '#ca8a04' },
                { label: 'Banned',      value: data.totals.banned,   color: '#ef4444' },
              ].map(c => (
                <div key={c.label} className="an-card">
                  <div className="an-card-val" style={{ color: c.color }}>{c.value}</div>
                  <div className="an-card-label">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Registrations chart */}
            <div className="an-section">
              <div className="an-section-header">
                <span className="an-section-title">Registrations — Last 30 Days</span>
                <span className="an-section-sub">{totalRegs} new user{totalRegs !== 1 ? 's' : ''}</span>
              </div>
              <BarChart data={days} />
            </div>

            {/* Breakdowns */}
            <div className="an-breakdowns">
              <div className="an-section an-breakdown">
                <div className="an-section-header"><span className="an-section-title">By Status</span></div>
                <div className="an-breakdown-list">
                  {data.statusBreakdown.map(s => {
                    const pct = data.totals.total > 0 ? Math.round((s.count / data.totals.total) * 100) : 0
                    return (
                      <div key={s._id} className="an-breakdown-row">
                        <span className="an-bd-label">{s._id || 'Unknown'}</span>
                        <div className="an-bd-bar-wrap">
                          <div className="an-bd-bar" style={{ width: `${pct}%`, background: STATUS_COLORS[s._id] || 'var(--text)' }} />
                        </div>
                        <span className="an-bd-val">{s.count} <span className="an-bd-pct">({pct}%)</span></span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="an-section an-breakdown">
                <div className="an-section-header"><span className="an-section-title">By Gender</span></div>
                <div className="an-breakdown-list">
                  {data.genderBreakdown.map(g => {
                    const pct = data.totals.total > 0 ? Math.round((g.count / data.totals.total) * 100) : 0
                    return (
                      <div key={g._id || 'null'} className="an-breakdown-row">
                        <span className="an-bd-label">{g._id || 'Unknown'}</span>
                        <div className="an-bd-bar-wrap">
                          <div className="an-bd-bar" style={{ width: `${pct}%`, background: GENDER_COLORS[g._id] || 'var(--text)' }} />
                        </div>
                        <span className="an-bd-val">{g.count} <span className="an-bd-pct">({pct}%)</span></span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recently active */}
            {data.recentlyActive.length > 0 && (
              <div className="an-section">
                <div className="an-section-header"><span className="an-section-title">Recently Active Users</span></div>
                <div className="an-active-list">
                  {data.recentlyActive.map((u, i) => (
                    <div key={u._id} className="an-active-row">
                      <span className="an-active-rank">{i + 1}</span>
                      <img className="an-active-avatar" src={u.photo || avatarUrl(u.first_name, u.last_name)} alt="" />
                      <div className="an-active-info">
                        <div className="an-active-name">{u.first_name} {u.last_name}</div>
                        <div className="an-active-email">{u.email}</div>
                      </div>
                      <span className="an-active-time">{fmt(u.lastActivity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

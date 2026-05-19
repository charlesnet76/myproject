import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d ago` : new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const ACTION_META = {
  created:       { label: 'created',       color: '#22c55e' },
  updated:       { label: 'updated',       color: 'var(--accent)' },
  deleted:       { label: 'deleted',       color: '#ef4444' },
  bulk_imported: { label: 'bulk-imported', color: '#8b5cf6' },
  emailed:       { label: 'emailed',       color: '#f59e0b' },
}

export default function ActivityFeed({ refresh }) {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]     = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiFetch('/api/activity')
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (open) fetchLogs() }, [open, refresh, fetchLogs])

  return (
    <div className="activity-panel">
      <button className="activity-toggle" onClick={() => setOpen(o => !o)}>
        <span className="activity-toggle-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Recent Activity
        </span>
        <svg className={`activity-chevron${open ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      {open && (
        <div className="activity-body">
          {loading ? (
            <p className="activity-empty">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="activity-empty">No activity yet.</p>
          ) : (
            <div className="activity-list">
              {logs.map(log => {
                const meta = ACTION_META[log.action] || { label: log.action, color: 'var(--text)' }
                return (
                  <div key={log._id} className="activity-row">
                    <div className="activity-dot" style={{ background: meta.color }} />
                    <div className="activity-text">
                      <strong>{log.adminName}</strong>
                      {' '}<span style={{ color: meta.color }}>{meta.label}</span>
                      {' '}<span className="activity-target">{log.targetName}</span>
                      {log.detail && <span className="activity-detail"> — {log.detail}</span>}
                    </div>
                    <span className="activity-time">{timeAgo(log.createdAt)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

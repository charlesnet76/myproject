import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch } from '../utils/api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const ACTION_META = {
  created:       { label: 'created a user',     color: '#22c55e' },
  updated:       { label: 'updated a user',     color: 'var(--accent)' },
  deleted:       { label: 'deleted a user',     color: '#ef4444' },
  bulk_imported: { label: 'bulk-imported users', color: '#8b5cf6' },
  emailed:       { label: 'emailed a user',     color: '#f59e0b' },
}

export default function NotificationBell() {
  const [logs, setLogs]   = useState([])
  const [open, setOpen]   = useState(false)
  const [lastRead, setLastRead] = useState(() => Number(localStorage.getItem('notifLastRead') || 0))
  const wrapRef = useRef(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res  = await apiFetch('/api/activity')
      const data = await res.json()
      setLogs(Array.isArray(data) ? data.slice(0, 20) : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs()
    const id = setInterval(fetchLogs, 30000)
    return () => clearInterval(id)
  }, [fetchLogs])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = logs.filter(l => new Date(l.createdAt).getTime() > lastRead).length

  const handleToggle = () => {
    if (!open) {
      const now = Date.now()
      setLastRead(now)
      localStorage.setItem('notifLastRead', String(now))
    }
    setOpen(o => !o)
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="theme-toggle notif-btn" onClick={handleToggle} aria-label="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unread === 0
              ? <span className="notif-all-read">All caught up</span>
              : <span className="notif-new">{unread} new</span>
            }
          </div>
          {logs.length === 0 ? (
            <p className="notif-empty">No activity yet.</p>
          ) : (
            <div className="notif-list">
              {logs.map(log => {
                const meta    = ACTION_META[log.action] || { label: log.action, color: 'var(--text)' }
                const isUnread = new Date(log.createdAt).getTime() > lastRead
                return (
                  <div key={log._id} className={`notif-row${isUnread ? ' unread' : ''}`}>
                    <div className="notif-dot" style={{ background: meta.color }} />
                    <div className="notif-text">
                      <strong>{log.adminName}</strong> {meta.label}
                      {log.targetName && <> — <span className="notif-target">{log.targetName}</span></>}
                      {log.detail && <span className="notif-detail"> ({log.detail})</span>}
                    </div>
                    <span className="notif-time">{timeAgo(log.createdAt)}</span>
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

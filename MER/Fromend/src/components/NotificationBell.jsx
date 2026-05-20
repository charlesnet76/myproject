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

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ACTION_META = {
  created:       { label: 'created a user',      color: '#22c55e' },
  updated:       { label: 'updated a user',      color: 'var(--accent)' },
  deleted:       { label: 'deleted a user',      color: '#ef4444' },
  bulk_imported: { label: 'bulk-imported users', color: '#8b5cf6' },
  emailed:       { label: 'emailed a user',      color: '#f59e0b' },
}

export default function NotificationBell() {
  const [logs, setLogs]         = useState([])
  const [reminders, setReminders] = useState([])
  const [open, setOpen]         = useState(false)
  const [tab, setTab]           = useState('activity') // 'activity' | 'reminders'
  const [lastRead, setLastRead] = useState(() => Number(localStorage.getItem('notifLastRead') || 0))
  const wrapRef = useRef(null)

  const fetchLogs = useCallback(async () => {
    try {
      const res  = await apiFetch('/api/activity')
      const data = await res.json()
      setLogs(Array.isArray(data) ? data.slice(0, 20) : [])
    } catch { /* ignore */ }
  }, [])

  const fetchReminders = useCallback(async () => {
    try {
      const res  = await apiFetch('/api/reminders?done=false')
      const data = await res.json()
      setReminders(Array.isArray(data) ? data : [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs(); fetchReminders()
    const id = setInterval(() => { fetchLogs(); fetchReminders() }, 30000)
    return () => clearInterval(id)
  }, [fetchLogs, fetchReminders])

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unreadActivity = logs.filter(l => new Date(l.createdAt).getTime() > lastRead).length
  const dueReminders   = reminders.filter(r => new Date(r.dueAt) <= new Date()).length
  const totalBadge     = unreadActivity + dueReminders

  const handleToggle = () => {
    if (!open) {
      const now = Date.now()
      setLastRead(now)
      localStorage.setItem('notifLastRead', String(now))
    }
    setOpen(o => !o)
  }

  const handleToggleDone = async (id) => {
    try {
      const res  = await apiFetch(`/api/reminders/${id}/done`, { method: 'PATCH' })
      const data = await res.json()
      setReminders(prev => data.done ? prev.filter(r => r._id !== id) : prev.map(r => r._id === id ? data : r))
    } catch { /* ignore */ }
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="theme-toggle notif-btn" onClick={handleToggle} aria-label="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {totalBadge > 0 && <span className="notif-badge">{totalBadge > 9 ? '9+' : totalBadge}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-tabs">
            <button className={`notif-tab${tab === 'activity' ? ' active' : ''}`} onClick={() => setTab('activity')}>
              Activity {unreadActivity > 0 && <span className="notif-tab-badge">{unreadActivity}</span>}
            </button>
            <button className={`notif-tab${tab === 'reminders' ? ' active' : ''}`} onClick={() => setTab('reminders')}>
              Reminders {dueReminders > 0 && <span className="notif-tab-badge overdue">{dueReminders}</span>}
            </button>
          </div>

          {tab === 'activity' && (
            logs.length === 0 ? (
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
            )
          )}

          {tab === 'reminders' && (
            reminders.length === 0 ? (
              <p className="notif-empty">No pending reminders.</p>
            ) : (
              <div className="notif-list">
                {reminders.map(r => {
                  const overdue = new Date(r.dueAt) < new Date()
                  return (
                    <div key={r._id} className={`notif-row reminder-notif-row${overdue ? ' overdue' : ''}`}>
                      <button className="reminder-check-sm" onClick={() => handleToggleDone(r._id)} title="Mark done">
                        <span className="reminder-circle-sm" />
                      </button>
                      <div className="notif-text">
                        {r.userId && <strong>{r.userId.first_name} {r.userId.last_name} — </strong>}
                        {r.note}
                        <div className="notif-time" style={{ display: 'block', marginTop: 2 }}>
                          {overdue ? <span style={{ color: '#ef4444' }}>Overdue · </span> : null}
                          {fmtDate(r.dueAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

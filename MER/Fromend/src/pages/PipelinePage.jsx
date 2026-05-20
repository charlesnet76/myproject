import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import UserDetailModal from '../components/UserDetailModal'
import ToastContainer from '../components/Toast'
import './PipelinePage.css'

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost']
const STAGE_COLORS = {
  'Lead':        '#6366f1',
  'Contacted':   '#3b82f6',
  'Qualified':   '#06b6d4',
  'Proposal':    '#f59e0b',
  'Closed Won':  '#22c55e',
  'Closed Lost': '#ef4444',
}

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function fmt(val) {
  if (!val) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
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

export default function PipelinePage() {
  useAuth()
  const [columns, setColumns] = useState(() => Object.fromEntries(STAGES.map(s => [s, []])))
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [toasts, setToasts]       = useState([])
  const [isDark, setIsDark]       = useState(getInitialDark)
  const [dragOver, setDragOver]   = useState(null)
  const dragRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const fetchPipeline = async () => {
    try {
      const res  = await apiFetch('/api/pipeline')
      const data = await res.json()
      setColumns(data)
      setError(null)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPipeline() }, [])

  const addToast = (msg, type = 'success') => {
    setToasts(p => [...p, { id: Date.now(), message: msg, type }])
  }

  const handleDragStart = (e, userId, fromStage) => {
    dragRef.current = { userId, fromStage }
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = async (e, toStage) => {
    e.preventDefault()
    setDragOver(null)
    const { userId, fromStage } = dragRef.current || {}
    if (!userId || fromStage === toStage) return
    dragRef.current = null

    setColumns(prev => {
      const user = prev[fromStage]?.find(u => u._id === userId)
      if (!user) return prev
      return {
        ...prev,
        [fromStage]: prev[fromStage].filter(u => u._id !== userId),
        [toStage]:   [...(prev[toStage] || []), { ...user, pipelineStage: toStage }],
      }
    })

    try {
      await apiFetch(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify({ pipelineStage: toStage }) })
    } catch {
      addToast('Failed to move user', 'error')
      fetchPipeline()
    }
  }

  const handleUpdate = (updated) => {
    setColumns(prev => {
      const newCols = { ...prev }
      STAGES.forEach(s => { newCols[s] = (prev[s] || []).map(u => u._id === updated._id ? updated : u) })
      const oldStage = STAGES.find(s => (prev[s] || []).some(u => u._id === updated._id))
      const newStage = updated.pipelineStage || 'Lead'
      if (oldStage && oldStage !== newStage) {
        newCols[oldStage] = (newCols[oldStage] || []).filter(u => u._id !== updated._id)
        newCols[newStage] = [...(newCols[newStage] || []), updated]
      }
      return newCols
    })
    setSelectedUser(updated)
  }

  const totalValue = STAGES.reduce((sum, s) =>
    sum + (columns[s] || []).reduce((a, u) => a + (u.deal?.value || 0), 0), 0)

  const handleThemeToggle = () => {
    const next = !isDark
    setIsDark(next)
    apiFetch('/api/auth/theme', { method: 'PATCH', body: JSON.stringify({ theme: next ? 'dark' : 'light' }) }).catch(() => {})
    try {
      const stored = JSON.parse(localStorage.getItem('admin') || 'null')
      if (stored) localStorage.setItem('admin', JSON.stringify({ ...stored, theme: next ? 'dark' : 'light' }))
    } catch { /* ignore */ }
  }

  return (
    <div className="pipeline-page">
      <Navbar isDark={isDark} onToggleTheme={handleThemeToggle} onSettings={null} />

      <main className="main pipeline-main">
        <div className="page-header">
          <div className="page-header-text">
            <h1>Pipeline</h1>
            <p className="subtitle">
              Drag users across stages to track your sales pipeline
              {totalValue > 0 && <> · <strong style={{ color: '#22c55e' }}>{fmt(totalValue)} total pipeline value</strong></>}
            </p>
          </div>
          <Link to="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            Users
          </Link>
        </div>

        {loading && <p className="state">Loading pipeline…</p>}
        {error   && <p className="state error">{error}</p>}

        {!loading && !error && (
          <div className="kanban-board">
            {STAGES.map(stage => {
              const stageUsers = columns[stage] || []
              const stageTotal = stageUsers.reduce((s, u) => s + (u.deal?.value || 0), 0)
              return (
                <div
                  key={stage}
                  className={`kanban-col${dragOver === stage ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(stage) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => handleDrop(e, stage)}
                >
                  <div className="kanban-col-header">
                    <div className="kanban-stage-dot" style={{ background: STAGE_COLORS[stage] }} />
                    <span className="kanban-stage-name">{stage}</span>
                    <span className="kanban-count">{stageUsers.length}</span>
                    {stageTotal > 0 && <span className="kanban-total">{fmt(stageTotal)}</span>}
                  </div>
                  <div className="kanban-cards">
                    {stageUsers.map(user => (
                      <div
                        key={user._id}
                        className="kanban-card"
                        draggable
                        onDragStart={e => handleDragStart(e, user._id, stage)}
                        onClick={() => setSelectedUser(user)}
                      >
                        <img className="kanban-avatar" src={user.photo || avatarUrl(user.first_name, user.last_name)} alt="" />
                        <div className="kanban-info">
                          <div className="kanban-name">{user.first_name} {user.last_name}</div>
                          <div className="kanban-email">{user.email}</div>
                          {user.deal?.value > 0 && <div className="kanban-deal">{fmt(user.deal.value)}</div>}
                          {user.tags?.length > 0 && (
                            <div className="kanban-tags">
                              {user.tags.slice(0, 2).map(t => <span key={t} className="kanban-tag">{t}</span>)}
                              {user.tags.length > 2 && <span className="kanban-tag">+{user.tags.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageUsers.length === 0 && (
                      <div className="kanban-empty">Drop users here</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdate={handleUpdate}
          onToast={addToast}
          onActivityRefresh={() => {}}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from './utils/api'
import Navbar from './components/Navbar'
import AddUserModal from './components/AddUserModal'
import UserDetailModal from './components/UserDetailModal'
import AdminSettingsModal from './components/AdminSettingsModal'
import ToastContainer from './components/Toast'
import StatsChart from './components/StatsChart'
import ActivityFeed from './components/ActivityFeed'
import './App.css'

const LIMIT = 12
const GENDERS = ['All', 'Male', 'Female', 'Other']
const SORT_OPTIONS = [
  { label: 'Newest first',   sort: 'createdAt',   order: 'desc' },
  { label: 'Oldest first',   sort: 'createdAt',   order: 'asc'  },
  { label: 'Name A → Z',    sort: 'first_name',   order: 'asc'  },
  { label: 'Name Z → A',    sort: 'first_name',   order: 'desc' },
  { label: 'Email A → Z',   sort: 'email',        order: 'asc'  },
  { label: 'Last active',   sort: 'lastActivity', order: 'desc' },
]
const STAT_COLORS = { Total: 'var(--accent)', Male: '#6366f1', Female: '#ec4899', Other: '#8b5cf6' }
const STAT_ICONS = {
  Total: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Male:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><path d="m16 8 4-4"/><path d="M20 4h-4v4"/></svg>,
  Female:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/><path d="M9 19h6"/></svg>,
  Other: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>{STAT_ICONS[label]}</div>
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

function UserCard({ user, confirmDelete, onDeleteClick, onDeleteConfirm, onDeleteCancel, onSelect, isSelected, onToggleSelect }) {
  const isConfirming = confirmDelete === user._id
  return (
    <div className={`user-card ${isConfirming ? 'confirming' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(user)} role="button" style={{ cursor: 'pointer' }}>
      <div className="card-top">
        <input type="checkbox" className="card-checkbox" checked={isSelected} onChange={() => onToggleSelect(user._id)} onClick={e => e.stopPropagation()} />
        <img className="card-avatar" src={user.photo || avatarUrl(user.first_name, user.last_name)} alt={`${user.first_name} ${user.last_name}`} />
      </div>
      <div className="card-body">
        <div className="card-name-row">
          <div className="card-name">{user.first_name} {user.last_name}</div>
          <span className={`pill pill-sm ${(user.status || 'active').toLowerCase()}`}>{user.status || 'Active'}</span>
        </div>
        <div className="card-email">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          {user.email}
        </div>
        <div className="card-ip">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          <span className="mono">{user.ip_address || '—'}</span>
        </div>
        <div className="card-activity">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>{timeAgo(user.lastActivity)}</span>
        </div>
      </div>
      <div className="card-footer" onClick={e => e.stopPropagation()}>
        {isConfirming ? (
          <div className="confirm-row">
            <button className="btn-danger" onClick={() => onDeleteConfirm(user._id)}>Confirm</button>
            <button className="btn-ghost" onClick={onDeleteCancel}>Cancel</button>
          </div>
        ) : (
          <button className="btn-delete" onClick={() => onDeleteClick(user._id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function UserCardSkeleton() {
  return (
    <div className="user-card skeleton-card">
      <div className="card-top"><div className="skeleton skel-avatar" /></div>
      <div className="card-body">
        <div className="skeleton skel-line w70" />
        <div className="skeleton skel-line w90" />
        <div className="skeleton skel-line w50" />
        <div className="skeleton skel-line w60" />
      </div>
      <div className="card-footer"><div className="skeleton skel-line w40" /></div>
    </div>
  )
}

function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button className="btn-secondary pag-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
        Prev
      </button>
      <span className="pag-info">Page <strong>{page}</strong> of <strong>{pages}</strong> · {total} users</span>
      <button className="btn-secondary pag-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  )
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

function loadSearchHistory() {
  try { return JSON.parse(localStorage.getItem('searchHistory') || '[]') } catch { return [] }
}
function saveSearchHistory(h) {
  localStorage.setItem('searchHistory', JSON.stringify(h.slice(0, 8)))
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, male: 0, female: 0, other: 0 })
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') || '')
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [genderFilter, setGenderFilter] = useState(() => searchParams.get('gender') || 'All')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'All')
  const [sortIdx, setSortIdx] = useState(() => { const s = Number(searchParams.get('sort')); return s >= 0 && s < SORT_OPTIONS.length ? s : 0 })
  const [page, setPage] = useState(() => { const p = Number(searchParams.get('page')); return p >= 1 ? p : 1 })
  const [activityKey, setActivityKey] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [toasts, setToasts] = useState([])
  const [isDark, setIsDark] = useState(getInitialDark)
  const [searchHistory, setSearchHistory] = useState(loadSearchHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const csvInputRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Sync filters to URL
  useEffect(() => {
    const params = {}
    if (search) params.q = search
    if (genderFilter !== 'All') params.gender = genderFilter
    if (statusFilter !== 'All') params.status = statusFilter
    if (sortIdx !== 0) params.sort = String(sortIdx)
    if (page !== 1) params.page = String(page)
    setSearchParams(params, { replace: true })
  }, [search, genderFilter, statusFilter, sortIdx, page, setSearchParams])

  // Debounce search input + update history
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput); setPage(1)
      if (searchInput.trim()) {
        setSearchHistory(prev => {
          const next = [searchInput.trim(), ...prev.filter(h => h !== searchInput.trim())]
          saveSearchHistory(next)
          return next.slice(0, 8)
        })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { sort, order } = SORT_OPTIONS[sortIdx]
    const params = new URLSearchParams({ page, limit: LIMIT, sort, order })
    if (search) params.set('search', search)
    if (genderFilter !== 'All') params.set('gender', genderFilter)
    if (statusFilter !== 'All') params.set('status', statusFilter)
    try {
      const res = await apiFetch(`/api/users?${params}`)
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
      setStats(data.stats)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, genderFilter, statusFilter, sortIdx])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUsers() }, [fetchUsers])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
  }
  const removeToast = id => setToasts(prev => prev.filter(t => t.id !== id))

  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    try {
      const res = await apiFetch(`/api/users/${user._id}/activity`, { method: 'PATCH' })
      const updated = await res.json()
      setUsers(prev => prev.map(u => u._id === updated._id ? updated : u))
      setSelectedUser(updated)
    } catch { /* best-effort */ }
  }

  const bumpActivity = () => setActivityKey(k => k + 1)
  const handleAdd = () => { fetchUsers(); bumpActivity(); addToast('User added') }
  const handleUpdate = (updated) => { setUsers(prev => prev.map(u => u._id === updated._id ? updated : u)); setSelectedUser(updated); addToast(`${updated.first_name} ${updated.last_name} updated`) }
  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
      const deleted = users.find(u => u._id === id)
      addToast(`${deleted?.first_name ?? 'User'} ${deleted?.last_name ?? ''} deleted`)
      bumpActivity(); fetchUsers()
    } catch { addToast('Failed to delete user', 'error') }
    finally { setConfirmDelete(null) }
  }

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedIds(new Set(users.map(u => u._id)))
  const clearSelection = () => { setSelectedIds(new Set()); setConfirmBulk(false) }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => apiFetch(`/api/users/${id}`, { method: 'DELETE' })))
      addToast(`${selectedIds.size} users deleted`)
      bumpActivity(); clearSelection()
      fetchUsers()
    } catch { addToast('Bulk delete failed', 'error') }
    finally { setBulkDeleting(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await apiFetch('/api/users/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'aerobase-users.csv'; a.click()
      URL.revokeObjectURL(url)
      addToast('Users exported to CSV')
    } catch { addToast('Export failed', 'error') }
    finally { setExporting(false) }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(','); const obj = {}
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim() })
        return { first_name: obj.first_name, last_name: obj.last_name, email: obj.email, gender: obj.gender, ip_address: obj.ip_address }
      }).filter(u => u.email)
      const res = await apiFetch('/api/users/bulk', { method: 'POST', body: JSON.stringify({ users: parsed }) })
      const { imported, skipped } = await res.json()
      addToast(`Imported ${imported} users${skipped ? `, ${skipped} skipped` : ''}`)
      setPage(1); fetchUsers()
    } catch { addToast('CSV import failed', 'error') }
    finally { setImporting(false); e.target.value = '' }
  }

  return (
    <>
      <Navbar isDark={isDark} onToggleTheme={() => {
        const next = !isDark; setIsDark(next)
        apiFetch('/api/auth/theme', { method: 'PATCH', body: JSON.stringify({ theme: next ? 'dark' : 'light' }) }).catch(() => {})
        try {
          const stored = JSON.parse(localStorage.getItem('admin') || 'null')
          if (stored) localStorage.setItem('admin', JSON.stringify({ ...stored, theme: next ? 'dark' : 'light' }))
        } catch { /* ignore parse errors */ }
      }} onSettings={() => setShowSettings(true)} />
      <main className="main">

        <div className="page-header">
          <div className="page-header-text">
            <h1>User Directory</h1>
            <p className="subtitle">Manage and browse all registered users</p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Add User
          </button>
        </div>

        {!loading && !error && (
          <div className="stats-section">
            <div className="stats-cards">
              {Object.entries({ Total: stats.total, Male: stats.male, Female: stats.female, Other: stats.other }).map(([label, value]) => (
                <StatCard key={label} label={label} value={value} color={STAT_COLORS[label]} />
              ))}
            </div>
            <StatsChart stats={{ Male: stats.male, Female: stats.female, Other: stats.other }} />
          </div>
        )}

        <ActivityFeed refresh={activityKey} />

        <div className="toolbar">
          <div className="search-wrap" style={{ position: 'relative' }}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="search" type="search" placeholder="Search by name or email…" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            />
            {showHistory && searchHistory.length > 0 && !searchInput && (
              <div className="search-history-dropdown">
                {searchHistory.map((h, i) => (
                  <button key={i} className="search-history-item" onMouseDown={() => { setSearchInput(h); setShowHistory(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.18-6.49"/></svg>
                    {h}
                  </button>
                ))}
                <button className="search-history-clear" onMouseDown={() => { setSearchHistory([]); saveSearchHistory([]) }}>Clear history</button>
              </div>
            )}
          </div>
          <div className="filter-pills">
            {GENDERS.map(g => (
              <button key={g} className={`filter-pill ${genderFilter === g ? 'active' : ''}`} onClick={() => { setGenderFilter(g); setPage(1); clearSelection() }}>{g}</button>
            ))}
          </div>
          <select className="sort-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); clearSelection() }}>
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Banned">Banned</option>
          </select>
          <select className="sort-select" value={sortIdx} onChange={e => { setSortIdx(Number(e.target.value)); setPage(1); clearSelection() }}>
            {SORT_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
          </select>
          <button className="btn-import" onClick={() => csvInputRef.current?.click()} disabled={importing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button className="btn-import" onClick={handleExport} disabled={exporting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
        </div>

        {selectedIds.size > 0 && (
          <div className="bulk-bar">
            <span className="bulk-count">{selectedIds.size} selected</span>
            <button className="btn-ghost btn-sm" onClick={selectAll}>Select page</button>
            <button className="btn-ghost btn-sm" onClick={clearSelection}>Clear</button>
            <div className="bulk-bar-sep" />
            {confirmBulk ? (
              <>
                <span className="bulk-confirm-label">Delete {selectedIds.size} users?</span>
                <button className="btn-danger btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting}>{bulkDeleting ? 'Deleting…' : 'Confirm'}</button>
                <button className="btn-ghost btn-sm" onClick={() => setConfirmBulk(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn-delete btn-sm" onClick={() => setConfirmBulk(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Delete selected
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
          <p className="results-count">Showing <strong>{users.length}</strong> of <strong>{total}</strong> {search || genderFilter !== 'All' ? 'matching ' : ''}users</p>
        )}

        {loading && (
          <div className="card-grid">
            {Array.from({ length: LIMIT }).map((_, i) => <UserCardSkeleton key={i} />)}
          </div>
        )}
        {error && <p className="state error">{error}</p>}

        {!loading && !error && users.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="empty-title">No users found</p>
            <p className="empty-sub">Try adjusting your search or filters</p>
            {(searchInput || genderFilter !== 'All') && (
              <button className="btn-secondary" onClick={() => { setSearchInput(''); setGenderFilter('All') }}>Clear filters</button>
            )}
          </div>
        )}

        {users.length > 0 && (
          <div className="card-grid">
            {users.map(user => (
              <UserCard key={user._id} user={user} confirmDelete={confirmDelete}
                onDeleteClick={setConfirmDelete} onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setConfirmDelete(null)} onSelect={handleSelectUser}
                isSelected={selectedIds.has(user._id)} onToggleSelect={toggleSelect} />
            ))}
          </div>
        )}

        <Pagination page={page} pages={pages} total={total} onPage={setPage} />
      </main>

      {showModal    && <AddUserModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
      {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={handleUpdate} onToast={addToast} onActivityRefresh={bumpActivity} />}
      {showSettings && <AdminSettingsModal onClose={() => setShowSettings(false)} onToast={addToast} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

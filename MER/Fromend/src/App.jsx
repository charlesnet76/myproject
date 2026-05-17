import { useState, useEffect, useRef } from 'react'
import { apiFetch } from './utils/api'
import Navbar from './components/Navbar'
import AddUserModal from './components/AddUserModal'
import UserDetailModal from './components/UserDetailModal'
import ToastContainer from './components/Toast'
import StatsChart from './components/StatsChart'
import './App.css'

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

const GENDERS = ['All', 'Male', 'Female', 'Other']
const STAT_COLORS = { Total: 'var(--accent)', Male: '#3b82f6', Female: '#ec4899', Other: '#8b5cf6' }

const STAT_ICONS = {
  Total: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Male:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="14" r="6"/><path d="m16 8 4-4"/><path d="M20 4h-4v4"/></svg>,
  Female:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/><path d="M9 19h6"/></svg>,
  Other: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
}

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
        {STAT_ICONS[label]}
      </div>
      <div className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

function UserCard({ user, confirmDelete, onDeleteClick, onDeleteConfirm, onDeleteCancel, onSelect }) {
  const isConfirming = confirmDelete === user._id
  return (
    <div className={`user-card ${isConfirming ? 'confirming' : ''}`} onClick={() => onSelect(user)} role="button" style={{ cursor: 'pointer' }}>
      <div className="card-top">
        <img className="card-avatar" src={avatarUrl(user.first_name, user.last_name)} alt={`${user.first_name} ${user.last_name}`} />
      </div>
      <div className="card-body">
        <div className="card-name">{user.first_name} {user.last_name}</div>
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
      <div className="card-footer" onClick={(e) => e.stopPropagation()}>
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

function getInitialDark() {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export default function App() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [toasts, setToasts] = useState([])
  const [isDark, setIsDark] = useState(getInitialDark)
  const [importing, setImporting] = useState(false)
  const csvInputRef = useRef(null)

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
  }
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  useEffect(() => {
    apiFetch('/api/users')
      .then((res) => { if (!res.ok) throw new Error(`Server error: ${res.status}`); return res.json() })
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectUser = async (user) => {
    setSelectedUser(user)
    try {
      const res = await apiFetch(`/api/users/${user._id}/activity`, { method: 'PATCH' })
      const updated = await res.json()
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)))
      setSelectedUser(updated)
    } catch { /* best-effort */ }
  }

  const handleAdd = (user) => { setUsers((prev) => [user, ...prev]); addToast(`${user.first_name} ${user.last_name} added`) }
  const handleUpdate = (updated) => { setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u))); setSelectedUser(updated); addToast(`${updated.first_name} ${updated.last_name} updated`) }

  const handleDelete = async (id) => {
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' })
      const deleted = users.find((u) => u._id === id)
      setUsers((prev) => prev.filter((u) => u._id !== id))
      addToast(`${deleted?.first_name ?? 'User'} ${deleted?.last_name ?? ''} deleted`)
    } catch { addToast('Failed to delete user', 'error') }
    finally { setConfirmDelete(null) }
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.trim().split('\n')
      const headers = lines[0].split(',').map((h) => h.trim())
      const parsed = lines.slice(1).map((line) => {
        const vals = line.split(',')
        const obj = {}
        headers.forEach((h, i) => { obj[h] = vals[i]?.trim() })
        return { first_name: obj.first_name, last_name: obj.last_name, email: obj.email, gender: obj.gender, ip_address: obj.ip_address }
      }).filter((u) => u.email)

      const res = await apiFetch('/api/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: parsed }),
      })
      const { imported, skipped } = await res.json()
      addToast(`Imported ${imported} users${skipped ? `, ${skipped} skipped (duplicates)` : ''}`)
      const updated = await apiFetch('/api/users').then((r) => r.json())
      setUsers(updated)
    } catch { addToast('CSV import failed', 'error') }
    finally { setImporting(false); e.target.value = '' }
  }

  const filtered = users.filter((u) => {
    const name = `${u.first_name} ${u.last_name}`.toLowerCase()
    const q = search.toLowerCase()
    return (name.includes(q) || u.email.toLowerCase().includes(q)) && (genderFilter === 'All' || u.gender === genderFilter)
  })

  const stats = {
    Total:  users.length,
    Male:   users.filter((u) => u.gender === 'Male').length,
    Female: users.filter((u) => u.gender === 'Female').length,
    Other:  users.filter((u) => u.gender === 'Other').length,
  }

  return (
    <>
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark((d) => !d)} />
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
              {Object.entries(stats).map(([label, value]) => (
                <StatCard key={label} label={label} value={value} color={STAT_COLORS[label]} />
              ))}
            </div>
            <StatsChart stats={stats} />
          </div>
        )}

        <div className="toolbar">
          <div className="search-wrap">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="search" type="search" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-pills">
            {GENDERS.map((g) => (
              <button key={g} className={`filter-pill ${genderFilter === g ? 'active' : ''}`} onClick={() => setGenderFilter(g)}>{g}</button>
            ))}
          </div>
          <button className="btn-import" onClick={() => csvInputRef.current?.click()} disabled={importing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvImport} />
        </div>

        {!loading && !error && (
          <p className="results-count">Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users</p>
        )}

        {loading && <div className="state-wrap"><div className="spinner" /><p>Loading users…</p></div>}
        {error   && <p className="state error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="empty-title">No users found</p>
            <p className="empty-sub">Try adjusting your search or filters</p>
            {(search || genderFilter !== 'All') && (
              <button className="btn-secondary" onClick={() => { setSearch(''); setGenderFilter('All') }}>Clear filters</button>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="card-grid">
            {filtered.map((user) => (
              <UserCard key={user._id} user={user} confirmDelete={confirmDelete}
                onDeleteClick={setConfirmDelete} onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setConfirmDelete(null)} onSelect={handleSelectUser} />
            ))}
          </div>
        )}
      </main>

      {showModal    && <AddUserModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
      {selectedUser && <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={handleUpdate} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

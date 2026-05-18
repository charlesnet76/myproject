import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function AdminSettingsModal({ onClose, onToast }) {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [admins, setAdmins] = useState([])
  const [loadingAdmins, setLoadingAdmins] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwError, setPwError] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [addError, setAddError] = useState(null)
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    if (tab === 'admins') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingAdmins(true)
      apiFetch('/api/auth/admins')
        .then(r => r.json())
        .then(setAdmins)
        .finally(() => setLoadingAdmins(false))
    }
  }, [tab])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm)
      return setPwError('New passwords do not match')
    setPwSaving(true); setPwError(null)
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onToast('Password updated successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    if (addForm.password !== addForm.confirm) return setAddError('Passwords do not match')
    setAddSaving(true); setAddError(null)
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: addForm.name, email: addForm.email, password: addForm.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAdmins(prev => [data.admin ? { _id: data.admin.id, name: data.admin.name, email: data.admin.email, createdAt: new Date() } : data, ...prev])
      onToast(`${addForm.name} added as admin`)
      setAddForm({ name: '', email: '', password: '', confirm: '' })
      setShowAddForm(false)
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddSaving(false)
    }
  }

  const handleDeleteAdmin = async (id) => {
    try {
      const res = await apiFetch(`/api/auth/admins/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAdmins(prev => prev.filter(a => a._id !== id))
      onToast('Admin removed')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="settings-tabs">
          <button className={`settings-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>My Profile</button>
          <button className={`settings-tab ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>Admins</button>
        </div>

        {tab === 'profile' && (
          <div className="settings-body">
            <div className="profile-info">
              <div className="profile-avatar">{admin?.name?.[0]?.toUpperCase()}</div>
              <div>
                <div className="profile-name">{admin?.name}</div>
                <div className="profile-email">{admin?.email}</div>
              </div>
            </div>

            <div className="settings-divider">Change Password</div>
            <form onSubmit={handlePasswordChange} className="pw-form">
              <label>Current Password
                <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm({...pwForm, currentPassword: e.target.value})} required />
              </label>
              <label>New Password
                <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({...pwForm, newPassword: e.target.value})} required minLength={8} placeholder="Min. 8 characters" />
              </label>
              <label>Confirm New Password
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} required />
              </label>
              {pwError && <p className="form-error">{pwError}</p>}
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Saving…' : 'Update password'}
                </button>
              </div>
            </form>

            <div className="settings-divider danger-zone">Danger Zone</div>
            <button className="btn-ghost-danger btn-full" onClick={() => { logout(); navigate('/login') }}>
              Log out of all devices
            </button>
          </div>
        )}

        {tab === 'admins' && (
          <div className="settings-body">
            {showAddForm ? (
              <form onSubmit={handleAddAdmin} className="pw-form add-admin-form">
                <div className="settings-divider">New Admin</div>
                <label>Name
                  <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} placeholder="Full name" required />
                </label>
                <label>Email
                  <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} placeholder="admin@example.com" required />
                </label>
                <label>Password
                  <input type="password" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} placeholder="Min. 8 characters" required minLength={8} />
                </label>
                <label>Confirm Password
                  <input type="password" value={addForm.confirm} onChange={e => setAddForm({...addForm, confirm: e.target.value})} required />
                </label>
                {addError && <p className="form-error">{addError}</p>}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setShowAddForm(false); setAddError(null) }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={addSaving}>{addSaving ? 'Adding…' : 'Add admin'}</button>
                </div>
              </form>
            ) : (
              <button className="btn-secondary btn-full add-admin-btn" onClick={() => setShowAddForm(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                Add admin
              </button>
            )}
            {loadingAdmins ? (
              <div className="state-wrap"><div className="spinner" /><p>Loading…</p></div>
            ) : (
              <div className="admins-list">
                {admins.map(a => (
                  <div key={a._id} className="admin-row">
                    <div className="admin-row-avatar">{a.name?.[0]?.toUpperCase()}</div>
                    <div className="admin-row-info">
                      <span className="admin-row-name">
                        {a.name}
                        {a._id === admin?.id && <span className="you-badge">you</span>}
                      </span>
                      <span className="admin-row-email">{a.email}</span>
                    </div>
                    <span className="admin-row-date">{fmt(a.createdAt)}</span>
                    {a._id !== admin?.id && (
                      confirmDelete === a._id ? (
                        <div className="confirm-row">
                          <button className="btn-danger" onClick={() => handleDeleteAdmin(a._id)}>Confirm</button>
                          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn-ghost-danger" onClick={() => setConfirmDelete(a._id)}>Remove</button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

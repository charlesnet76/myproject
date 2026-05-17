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

  useEffect(() => {
    if (tab === 'admins') {
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

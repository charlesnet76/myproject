import { useState, useRef } from 'react'
import { apiFetch } from '../utils/api'

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const infoRows = [
  { label: 'First Name',    key: 'first_name' },
  { label: 'Last Name',     key: 'last_name' },
  { label: 'Email',         key: 'email' },
  { label: 'Gender',        key: 'gender' },
  { label: 'IP Address',    key: 'ip_address' },
  { label: 'Last Activity', key: 'lastActivity', render: fmt },
  { label: 'Member Since',  key: 'createdAt',    render: fmt },
  { label: 'Last Updated',  key: 'updatedAt',    render: fmt },
]

export default function UserDetailModal({ user, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef(null)

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const res = await apiFetch(`/api/users/${user._id}/photo`, { method: 'POST', body: form })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      onUpdate(updated)
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name:  user.last_name,
    email:      user.email,
    gender:     user.gender || '',
    ip_address: user.ip_address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      onUpdate(data)
      setIsEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      first_name: user.first_name,
      last_name:  user.last_name,
      email:      user.email,
      gender:     user.gender || '',
      ip_address: user.ip_address || '',
    })
    setError(null)
    setIsEditing(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>

        <div className="detail-header">
          <div className="detail-avatar-wrap">
            <img
              className="detail-avatar"
              src={user.photo || avatarUrl(user.first_name, user.last_name)}
              alt={`${user.first_name} ${user.last_name}`}
            />
            <button
              type="button"
              className="avatar-upload-btn"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              title="Upload photo"
            >
              {uploading
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
          <div className="detail-title">
            <h2>{user.first_name} {user.last_name}</h2>
            <span className={`pill ${user.gender?.toLowerCase()}`}>{user.gender || '—'}</span>
          </div>
          <div className="detail-header-actions">
            {!isEditing && (
              <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
            )}
            <button className="icon-btn detail-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="detail-form">
            <div className="form-row">
              <label>First Name<input name="first_name" value={form.first_name} onChange={handleChange} required /></label>
              <label>Last Name<input name="last_name"  value={form.last_name}  onChange={handleChange} required /></label>
            </div>
            <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
            <label>
              Gender
              <select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>
            <label>IP Address<input name="ip_address" value={form.ip_address} onChange={handleChange} /></label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="detail-table-wrap">
            <table className="detail-table">
              <tbody>
                {infoRows.map(({ label, key, render }) => (
                  <tr key={key}>
                    <th>{label}</th>
                    <td>{render ? render(user[key]) : (user[key] || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}

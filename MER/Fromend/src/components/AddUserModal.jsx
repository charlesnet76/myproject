import { useState } from 'react'
import { apiFetch } from '../utils/api'

function AddUserModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', gender: '', ip_address: '', status: 'Active',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')
      onAdd(data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add User</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              First Name
              <input name="first_name" value={form.first_name} onChange={handleChange} required />
            </label>
            <label>
              Last Name
              <input name="last_name" value={form.last_name} onChange={handleChange} required />
            </label>
          </div>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <label>
            Gender
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option value="">Select…</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            IP Address
            <input name="ip_address" value={form.ip_address} onChange={handleChange} placeholder="e.g. 192.168.1.1" />
          </label>
          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Banned</option>
            </select>
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddUserModal

import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../utils/api'

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function timeAgoShort(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d ago` : fmt(dateStr)
}

const STATUS_CLASS = { Active: 'active', Inactive: 'inactive', Banned: 'banned' }

const infoRows = [
  { label: 'First Name',    key: 'first_name' },
  { label: 'Last Name',     key: 'last_name' },
  { label: 'Email',         key: 'email' },
  { label: 'Gender',        key: 'gender' },
  { label: 'Status',        key: 'status' },
  { label: 'IP Address',    key: 'ip_address' },
  { label: 'Last Activity', key: 'lastActivity', render: fmt },
  { label: 'Member Since',  key: 'createdAt',    render: fmt },
  { label: 'Last Updated',  key: 'updatedAt',    render: fmt },
]

export default function UserDetailModal({ user, onClose, onUpdate, onToast, onActivityRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name:  user.last_name,
    email:      user.email,
    gender:     user.gender    || '',
    ip_address: user.ip_address || '',
    status:     user.status    || 'Active',
  })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef(null)

  // Notes
  const [notes, setNotes]         = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote]     = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Tags
  const [tags, setTags] = useState(user.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [savingTags, setSavingTags] = useState(false)

  // AI score
  const [aiScore, setAiScore] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Email
  const [showEmail, setShowEmail] = useState(false)
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' })
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotesLoading(true)
    apiFetch(`/api/users/${user._id}/notes`)
      .then(r => r.json())
      .then(d => setNotes(Array.isArray(d) ? d : []))
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false))
  }, [user._id])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('photo', file)
      const res = await apiFetch(`/api/users/${user._id}/photo`, { method: 'POST', body: fd })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      onUpdate(updated)
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(null)
    try {
      const res = await apiFetch(`/api/users/${user._id}`, {
        method: 'PUT', body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      onUpdate(data); onActivityRefresh?.(); setIsEditing(false)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setForm({ first_name: user.first_name, last_name: user.last_name, email: user.email,
              gender: user.gender || '', ip_address: user.ip_address || '', status: user.status || 'Active' })
    setError(null); setIsEditing(false)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const res = await apiFetch(`/api/users/${user._id}/notes`, {
        method: 'POST', body: JSON.stringify({ text: newNote }),
      })
      const note = await res.json()
      if (!res.ok) throw new Error(note.error)
      setNotes(prev => [note, ...prev]); setNewNote('')
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setAddingNote(false) }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await apiFetch(`/api/users/${user._id}/notes/${noteId}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n._id !== noteId))
    } catch (err) { onToast?.(err.message, 'error') }
  }

  const handleAddTag = async () => {
    const t = tagInput.trim().toLowerCase()
    if (!t || tags.includes(t)) { setTagInput(''); return }
    const next = [...tags, t]
    setSavingTags(true)
    try {
      const res = await apiFetch(`/api/users/${user._id}/tags`, { method: 'PATCH', body: JSON.stringify({ tags: next }) })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      setTags(next); setTagInput(''); onUpdate(updated)
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setSavingTags(false) }
  }

  const handleRemoveTag = async (tag) => {
    const next = tags.filter(t => t !== tag)
    try {
      const res = await apiFetch(`/api/users/${user._id}/tags`, { method: 'PATCH', body: JSON.stringify({ tags: next }) })
      const updated = await res.json()
      if (!res.ok) throw new Error(updated.error)
      setTags(next); onUpdate(updated)
    } catch (err) { onToast?.(err.message, 'error') }
  }

  const handleAiScore = async () => {
    setAiLoading(true); setAiScore(null)
    try {
      const res = await apiFetch(`/api/ai/score/${user._id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiScore(data)
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setAiLoading(false) }
  }

  const handleSendEmail = async (e) => {
    e.preventDefault(); setSendingEmail(true)
    try {
      const res = await apiFetch(`/api/users/${user._id}/email`, {
        method: 'POST', body: JSON.stringify(emailForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onToast?.('Email sent successfully')
      onActivityRefresh?.()
      setShowEmail(false); setEmailForm({ subject: '', message: '' })
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setSendingEmail(false) }
  }

  const viewMode = !isEditing && !showEmail

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="detail-header">
          <div className="detail-avatar-wrap">
            <img className="detail-avatar" src={user.photo || avatarUrl(user.first_name, user.last_name)} alt="" />
            <button type="button" className="avatar-upload-btn" onClick={() => photoInputRef.current?.click()} disabled={uploading}>
              {uploading
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              }
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />

          <div className="detail-title">
            <h2>{user.first_name} {user.last_name}</h2>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {user.gender && <span className={`pill ${user.gender.toLowerCase()}`}>{user.gender}</span>}
              <span className={`pill ${STATUS_CLASS[user.status] || 'active'}`}>{user.status || 'Active'}</span>
            </div>
          </div>

          <div className="detail-header-actions">
            {viewMode && (
              <>
                <button className="btn-secondary btn-sm" onClick={() => setShowEmail(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  Email
                </button>
                <button className="btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
              </>
            )}
            <button className="icon-btn detail-close" onClick={onClose} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* ── Email compose ── */}
        {showEmail && (
          <form onSubmit={handleSendEmail} className="detail-form">
            <p className="email-to">To: <strong>{user.email}</strong></p>
            <label>Subject<input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} required placeholder="Enter subject…" /></label>
            <label>
              Message
              <textarea
                className="detail-textarea"
                rows={4}
                value={emailForm.message}
                onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))}
                required
                placeholder="Write your message…"
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => { setShowEmail(false); setEmailForm({ subject: '', message: '' }) }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={sendingEmail}>{sendingEmail ? 'Sending…' : 'Send email'}</button>
            </div>
          </form>
        )}

        {/* ── Edit form ── */}
        {isEditing && (
          <form onSubmit={handleSave} className="detail-form">
            <div className="form-row">
              <label>First Name<input name="first_name" value={form.first_name} onChange={handleChange} required /></label>
              <label>Last Name<input name="last_name"  value={form.last_name}  onChange={handleChange} required /></label>
            </div>
            <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
            <div className="form-row">
              <label>Gender
                <select name="gender" value={form.gender} onChange={handleChange}>
                  <option value="">Select…</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </label>
              <label>Status
                <select name="status" value={form.status} onChange={handleChange}>
                  <option>Active</option><option>Inactive</option><option>Banned</option>
                </select>
              </label>
            </div>
            <label>IP Address<input name="ip_address" value={form.ip_address} onChange={handleChange} /></label>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        )}

        {/* ── View mode ── */}
        {viewMode && (
          <>
            {/* ── AI Score ── */}
            <div className="ai-score-section">
              <div className="ai-score-header">
                <span className="notes-title">AI Lead Score</span>
                <button className="btn-secondary btn-sm" onClick={handleAiScore} disabled={aiLoading}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  {aiLoading ? 'Scoring…' : aiScore ? 'Re-score' : 'Score with AI'}
                </button>
              </div>
              {aiScore && (
                <div className="ai-score-result">
                  <div className="ai-score-badge" style={{ background: aiScore.score >= 7 ? '#10b981' : aiScore.score >= 4 ? '#f59e0b' : '#ef4444' }}>
                    {aiScore.score}/10
                  </div>
                  <div className="ai-score-text">
                    <p className="ai-reason">{aiScore.reason}</p>
                    <p className="ai-rec"><strong>Next step:</strong> {aiScore.recommendation}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Tags ── */}
            <div className="notes-section">
              <div className="notes-header">
                <span className="notes-title">Tags</span>
                {tags.length > 0 && <span className="notes-count">{tags.length}</span>}
              </div>
              <div className="tags-list">
                {tags.map(t => (
                  <span key={t} className="tag-chip">
                    {t}
                    <button className="tag-remove" onClick={() => handleRemoveTag(t)}>×</button>
                  </span>
                ))}
                {tags.length === 0 && <span style={{ color: 'var(--text)', fontSize: 13 }}>No tags yet.</span>}
              </div>
              <div className="note-add" style={{ marginTop: 8 }}>
                <input
                  className="tag-input"
                  placeholder="Add a tag… (Enter to add)"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  disabled={savingTags}
                />
                <button className="btn-primary btn-sm" onClick={handleAddTag} disabled={savingTags || !tagInput.trim()}>
                  {savingTags ? '…' : 'Add'}
                </button>
              </div>
            </div>

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

            {/* Notes */}
            <div className="notes-section">
              <div className="notes-header">
                <span className="notes-title">Notes</span>
                {notes.length > 0 && <span className="notes-count">{notes.length}</span>}
              </div>

              {notesLoading ? (
                <p className="notes-empty">Loading…</p>
              ) : notes.length > 0 ? (
                <div className="notes-list">
                  {notes.map(note => (
                    <div key={note._id} className="note-row">
                      <div className="note-body">
                        <p className="note-text">{note.text}</p>
                        <div className="note-meta">{note.adminName} · {timeAgoShort(note.createdAt)}</div>
                      </div>
                      <button className="icon-btn note-delete" onClick={() => handleDeleteNote(note._id)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notes-empty">No notes yet.</p>
              )}

              <div className="note-add">
                <textarea
                  className="detail-textarea note-input"
                  rows={2}
                  placeholder="Add a note… (Enter to submit)"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                />
                <button className="btn-primary btn-sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                  {addingNote ? 'Adding…' : 'Add note'}
                </button>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

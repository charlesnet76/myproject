import { useState, useRef, useEffect } from 'react'
import { apiFetch } from '../utils/api'

const STAGES = ['Lead', 'Contacted', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost']

function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fmtMoney(val, currency = 'USD') {
  if (!val) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val)
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

function isOverdue(dueAt) {
  return !dueAt ? false : new Date(dueAt) < new Date()
}

const STATUS_CLASS = { Active: 'active', Inactive: 'inactive', Banned: 'banned' }

const infoRows = [
  { label: 'First Name',     key: 'first_name' },
  { label: 'Last Name',      key: 'last_name' },
  { label: 'Email',          key: 'email' },
  { label: 'Gender',         key: 'gender' },
  { label: 'Status',         key: 'status' },
  { label: 'Pipeline Stage', key: 'pipelineStage' },
  { label: 'IP Address',     key: 'ip_address' },
  { label: 'Last Activity',  key: 'lastActivity', render: fmt },
  { label: 'Member Since',   key: 'createdAt',    render: fmt },
]

export default function UserDetailModal({ user, onClose, onUpdate, onToast, onActivityRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    first_name:     user.first_name,
    last_name:      user.last_name,
    email:          user.email,
    gender:         user.gender      || '',
    ip_address:     user.ip_address  || '',
    status:         user.status      || 'Active',
    pipelineStage:  user.pipelineStage || 'Lead',
    deal_value:     user.deal?.value     || '',
    deal_currency:  user.deal?.currency  || 'USD',
    deal_closeDate: user.deal?.closeDate ? new Date(user.deal.closeDate).toISOString().slice(0, 10) : '',
    deal_notes:     user.deal?.notes     || '',
  })
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [uploading, setUploading] = useState(false)
  const photoInputRef = useRef(null)

  // Notes
  const [notes, setNotes]             = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNote, setNewNote]         = useState('')
  const [addingNote, setAddingNote]   = useState(false)

  // Tags
  const [tags, setTags]       = useState(user.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [savingTags, setSavingTags] = useState(false)

  // Reminders
  const [reminders, setReminders]           = useState([])
  const [remindersLoading, setRemindersLoading] = useState(false)
  const [newReminder, setNewReminder]       = useState({ note: '', dueAt: '' })
  const [addingReminder, setAddingReminder] = useState(false)

  // Email
  const [showEmail, setShowEmail]   = useState(false)
  const [emailForm, setEmailForm]   = useState({ subject: '', message: '' })
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemindersLoading(true)
    apiFetch(`/api/users/${user._id}/reminders`)
      .then(r => r.json())
      .then(d => setReminders(Array.isArray(d) ? d : []))
      .catch(() => setReminders([]))
      .finally(() => setRemindersLoading(false))
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
      const body = {
        first_name:    form.first_name,
        last_name:     form.last_name,
        email:         form.email,
        gender:        form.gender,
        ip_address:    form.ip_address,
        status:        form.status,
        pipelineStage: form.pipelineStage,
        deal: {
          value:     Number(form.deal_value) || 0,
          currency:  form.deal_currency || 'USD',
          closeDate: form.deal_closeDate || null,
          notes:     form.deal_notes,
        },
      }
      const res  = await apiFetch(`/api/users/${user._id}`, { method: 'PUT', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user')
      onUpdate(data); onActivityRefresh?.(); setIsEditing(false)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleCancel = () => {
    setForm({
      first_name:     user.first_name,
      last_name:      user.last_name,
      email:          user.email,
      gender:         user.gender      || '',
      ip_address:     user.ip_address  || '',
      status:         user.status      || 'Active',
      pipelineStage:  user.pipelineStage || 'Lead',
      deal_value:     user.deal?.value     || '',
      deal_currency:  user.deal?.currency  || 'USD',
      deal_closeDate: user.deal?.closeDate ? new Date(user.deal.closeDate).toISOString().slice(0, 10) : '',
      deal_notes:     user.deal?.notes     || '',
    })
    setError(null); setIsEditing(false)
  }

  // ── Tags ──────────────────────────────────────────────────
  const saveTags = async (nextTags) => {
    setSavingTags(true)
    try {
      const res  = await apiFetch(`/api/users/${user._id}/tags`, { method: 'PATCH', body: JSON.stringify({ tags: nextTags }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpdate(data)
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setSavingTags(false) }
  }

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) { setTagInput(''); return }
    const next = [...tags, t]
    setTags(next); setTagInput(''); saveTags(next)
  }

  const handleRemoveTag = (t) => {
    const next = tags.filter(x => x !== t)
    setTags(next); saveTags(next)
  }

  // ── Notes ─────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    try {
      const res  = await apiFetch(`/api/users/${user._id}/notes`, { method: 'POST', body: JSON.stringify({ text: newNote }) })
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

  // ── Reminders ─────────────────────────────────────────────
  const handleAddReminder = async () => {
    if (!newReminder.note.trim() || !newReminder.dueAt) return
    setAddingReminder(true)
    try {
      const res  = await apiFetch(`/api/users/${user._id}/reminders`, { method: 'POST', body: JSON.stringify(newReminder) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReminders(prev => [...prev, data].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)))
      setNewReminder({ note: '', dueAt: '' })
    } catch (err) { onToast?.(err.message, 'error') }
    finally { setAddingReminder(false) }
  }

  const handleToggleReminder = async (id) => {
    try {
      const res  = await apiFetch(`/api/reminders/${id}/done`, { method: 'PATCH' })
      const data = await res.json()
      setReminders(prev => prev.map(r => r._id === id ? data : r))
    } catch (err) { onToast?.(err.message, 'error') }
  }

  const handleDeleteReminder = async (id) => {
    try {
      await apiFetch(`/api/reminders/${id}`, { method: 'DELETE' })
      setReminders(prev => prev.filter(r => r._id !== id))
    } catch (err) { onToast?.(err.message, 'error') }
  }

  // ── Email ─────────────────────────────────────────────────
  const handleSendEmail = async (e) => {
    e.preventDefault(); setSendingEmail(true)
    try {
      const res  = await apiFetch(`/api/users/${user._id}/email`, { method: 'POST', body: JSON.stringify(emailForm) })
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
              {user.pipelineStage && <span className="pill pill-pipeline">{user.pipelineStage}</span>}
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
              <textarea className="detail-textarea" rows={4} value={emailForm.message}
                onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} required placeholder="Write your message…" />
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
              <label>Last Name<input  name="last_name"  value={form.last_name}  onChange={handleChange} required /></label>
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
            <div className="form-row">
              <label>IP Address<input name="ip_address" value={form.ip_address} onChange={handleChange} /></label>
              <label>Pipeline Stage
                <select name="pipelineStage" value={form.pipelineStage} onChange={handleChange}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <div className="form-section-title">Deal / Opportunity</div>
            <div className="form-row">
              <label>Deal Value<input name="deal_value" type="number" min="0" step="1" value={form.deal_value} onChange={handleChange} placeholder="0" /></label>
              <label>Currency<input  name="deal_currency" value={form.deal_currency} onChange={handleChange} placeholder="USD" /></label>
            </div>
            <div className="form-row">
              <label>Close Date<input name="deal_closeDate" type="date" value={form.deal_closeDate} onChange={handleChange} /></label>
            </div>
            <label>Deal Notes<textarea className="detail-textarea" name="deal_notes" rows={2} value={form.deal_notes} onChange={handleChange} placeholder="Notes about this deal…" /></label>

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
            <div className="detail-table-wrap">
              <table className="detail-table">
                <tbody>
                  {infoRows.map(({ label, key, render }) => (
                    <tr key={key}><th>{label}</th><td>{render ? render(user[key]) : (user[key] || '—')}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Deal ── */}
            {(user.deal?.value > 0 || user.deal?.notes) && (
              <div className="detail-section">
                <div className="detail-section-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Deal
                </div>
                <div className="deal-grid">
                  {user.deal?.value > 0 && (
                    <div className="deal-stat">
                      <span className="deal-val">{fmtMoney(user.deal.value, user.deal?.currency)}</span>
                      <span className="deal-label">Value</span>
                    </div>
                  )}
                  {user.deal?.closeDate && (
                    <div className="deal-stat">
                      <span className="deal-val">{fmt(user.deal.closeDate)}</span>
                      <span className="deal-label">Close Date</span>
                    </div>
                  )}
                </div>
                {user.deal?.notes && <p className="deal-notes">{user.deal.notes}</p>}
              </div>
            )}

            {/* ── Tags ── */}
            <div className="detail-section">
              <div className="detail-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                Tags {savingTags && <span className="tags-saving">saving…</span>}
              </div>
              <div className="tags-list">
                {tags.map(t => (
                  <span key={t} className="tag-chip">
                    {t}
                    <button className="tag-remove" onClick={() => handleRemoveTag(t)} aria-label={`Remove ${t}`}>×</button>
                  </span>
                ))}
                {tags.length === 0 && <span className="tags-empty">No tags yet</span>}
              </div>
              <div className="tag-add-row">
                <input
                  className="tag-input"
                  placeholder="Add tag…"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                />
                <button className="btn-secondary btn-sm" onClick={handleAddTag} disabled={!tagInput.trim()}>Add</button>
              </div>
            </div>

            {/* ── Reminders ── */}
            <div className="detail-section">
              <div className="detail-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Reminders
                {reminders.filter(r => !r.done).length > 0 && (
                  <span className="reminders-badge">{reminders.filter(r => !r.done).length}</span>
                )}
              </div>

              {remindersLoading ? (
                <p className="notes-empty">Loading…</p>
              ) : reminders.length > 0 ? (
                <div className="reminders-list">
                  {reminders.map(r => (
                    <div key={r._id} className={`reminder-row${r.done ? ' done' : ''}${isOverdue(r.dueAt) && !r.done ? ' overdue' : ''}`}>
                      <button className="reminder-check" onClick={() => handleToggleReminder(r._id)} aria-label="Toggle done">
                        {r.done
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <span className="reminder-circle" />
                        }
                      </button>
                      <div className="reminder-body">
                        <p className="reminder-note">{r.note}</p>
                        <div className="reminder-meta">
                          {isOverdue(r.dueAt) && !r.done
                            ? <span className="reminder-overdue">Overdue · </span>
                            : null
                          }
                          {new Date(r.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {' · '}{r.adminName}
                        </div>
                      </div>
                      <button className="icon-btn note-delete" onClick={() => handleDeleteReminder(r._id)} title="Delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="notes-empty">No reminders set.</p>
              )}

              <div className="reminder-add">
                <input
                  className="reminder-note-input"
                  placeholder="Reminder note…"
                  value={newReminder.note}
                  onChange={e => setNewReminder(r => ({ ...r, note: e.target.value }))}
                />
                <input
                  type="date"
                  className="reminder-date-input"
                  value={newReminder.dueAt}
                  onChange={e => setNewReminder(r => ({ ...r, dueAt: e.target.value }))}
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleAddReminder}
                  disabled={addingReminder || !newReminder.note.trim() || !newReminder.dueAt}
                >
                  {addingReminder ? '…' : 'Add'}
                </button>
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="detail-section">
              <div className="detail-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Notes {notes.length > 0 && <span className="notes-count">{notes.length}</span>}
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
                <textarea className="detail-textarea note-input" rows={2}
                  placeholder="Add a note… (Enter to submit)" value={newNote}
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

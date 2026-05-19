import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

const PRESET_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

const FIELD_OPTIONS = [
  { value: 'status',     label: 'Status' },
  { value: 'gender',     label: 'Gender' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name',  label: 'Last Name' },
  { value: 'email',      label: 'Email' },
  { value: 'tags',       label: 'Tags' },
]

const OPERATOR_OPTIONS = [
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'not equals' },
  { value: 'contains',     label: 'contains' },
  { value: 'includes_tag', label: 'includes tag' },
]

// Only show includes_tag when field === 'tags'
function operatorsForField(field) {
  if (field === 'tags') return OPERATOR_OPTIONS
  return OPERATOR_OPTIONS.filter(o => o.value !== 'includes_tag')
}

const EMPTY_FORM = {
  name:        '',
  description: '',
  color:       '#3b82f6',
  filters:     [],
}

function emptyFilter() {
  return { field: 'status', operator: 'equals', value: '' }
}

function FilterRow({ filter, index, onChange, onRemove }) {
  const ops = operatorsForField(filter.field)

  function handleFieldChange(field) {
    // Reset operator if switching away from tags (includes_tag is tags-only)
    const op = field !== 'tags' && filter.operator === 'includes_tag' ? 'equals' : filter.operator
    onChange(index, { ...filter, field, operator: op })
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        className="form-input"
        style={{ flex: '1 1 110px', minWidth: 0 }}
        value={filter.field}
        onChange={e => handleFieldChange(e.target.value)}
      >
        {FIELD_OPTIONS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        className="form-input"
        style={{ flex: '1 1 120px', minWidth: 0 }}
        value={filter.operator}
        onChange={e => onChange(index, { ...filter, operator: e.target.value })}
      >
        {ops.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <input
        className="form-input"
        style={{ flex: '2 1 120px', minWidth: 0 }}
        type="text"
        placeholder="Value"
        value={filter.value}
        onChange={e => onChange(index, { ...filter, value: e.target.value })}
      />
      <button
        type="button"
        className="btn-icon-remove"
        onClick={() => onRemove(index)}
        title="Remove filter"
        aria-label="Remove filter"
      >
        ×
      </button>
    </div>
  )
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: value === c ? `3px solid ${c}` : '3px solid transparent',
            outlineOffset: 2,
            transition: 'outline .15s',
          }}
          aria-label={`Color ${c}`}
        >
          {value === c && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

export default function SegmentsPage() {
  const [segments, setSegments]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [showForm, setShowForm]           = useState(false)
  const [editSegment, setEditSegment]     = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [formErr, setFormErr]             = useState(null)
  const [previewSegment, setPreviewSegment] = useState(null)
  const [previewUsers, setPreviewUsers]   = useState({ users: [], count: 0 })
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr, setPreviewErr]       = useState(null)

  useEffect(() => { fetchSegments() }, [])

  async function fetchSegments() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/segments')
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setSegments(Array.isArray(data) ? data : (data.segments ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditSegment(null)
    setForm(EMPTY_FORM)
    setFormErr(null)
    setShowForm(true)
  }

  function openEdit(segment) {
    setEditSegment(segment)
    setForm({
      name:        segment.name        ?? '',
      description: segment.description ?? '',
      color:       segment.color       ?? '#3b82f6',
      filters:     Array.isArray(segment.filters) ? segment.filters.map(f => ({ ...f })) : [],
    })
    setFormErr(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditSegment(null)
    setFormErr(null)
  }

  function handleFilterChange(index, updated) {
    setForm(prev => ({
      ...prev,
      filters: prev.filters.map((f, i) => i === index ? updated : f),
    }))
  }

  function handleFilterRemove(index) {
    setForm(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }))
  }

  function addFilter() {
    setForm(prev => ({ ...prev, filters: [...prev.filters, emptyFilter()] }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormErr('Name is required.'); return }
    setSaving(true)
    setFormErr(null)
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        color:       form.color,
        filters:     form.filters.filter(f => f.value.trim() !== ''),
      }
      let res
      if (editSegment) {
        res = await apiFetch(`/api/segments/${editSegment._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        res = await apiFetch('/api/segments', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Server error ${res.status}`)
      }
      await fetchSegments()
      closeForm()
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(segment) {
    if (!window.confirm(`Delete segment "${segment.name}"?`)) return
    try {
      const res = await apiFetch(`/api/segments/${segment._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setSegments(prev => prev.filter(s => s._id !== segment._id))
      if (previewSegment?._id === segment._id) closePreview()
    } catch (e) {
      alert(e.message)
    }
  }

  async function openPreview(segment) {
    setPreviewSegment(segment)
    setPreviewUsers({ users: [], count: 0 })
    setPreviewErr(null)
    setPreviewLoading(true)
    try {
      const res = await apiFetch(`/api/segments/${segment._id}/users`)
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      // Accept { users, count } or plain array
      if (Array.isArray(data)) {
        setPreviewUsers({ users: data, count: data.length })
      } else {
        setPreviewUsers({ users: data.users ?? [], count: data.count ?? (data.users?.length ?? 0) })
      }
    } catch (e) {
      setPreviewErr(e.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setPreviewSegment(null)
    setPreviewErr(null)
  }

  const STATUS_COLORS = { Active: '#10b981', Inactive: '#f59e0b', Banned: '#ef4444' }

  return (
    <>
      <style>{`
        .segments-page { min-height: 100vh; background: var(--page-bg); padding: 24px; box-sizing: border-box; }
        .segments-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .segments-header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-h); }
        .segments-header .subtitle { margin: 2px 0 0; font-size: 13px; color: var(--text); }
        .btn-primary { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity .15s; }
        .btn-primary:hover { opacity: .88; }
        .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-ghost:hover { background: var(--accent-bg); }
        .btn-link { background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; padding: 4px 8px; border-radius: 5px; transition: background .15s; }
        .btn-link:hover { background: var(--accent-bg); }
        .btn-danger-sm { background: transparent; border: 1px solid rgba(239,68,68,.3); color: #ef4444; padding: 4px 10px; border-radius: 5px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-danger-sm:hover { background: rgba(239,68,68,.08); }
        .btn-icon-remove { background: none; border: 1px solid var(--border); color: var(--text); width: 28px; height: 28px; border-radius: 5px; cursor: pointer; font-size: 16px; line-height: 1; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .btn-icon-remove:hover { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.3); color: #ef4444; }
        .segments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        .segment-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 16px; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px; }
        .seg-card-top { display: flex; align-items: flex-start; gap: 10px; }
        .seg-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
        .seg-card-name { font-size: 14px; font-weight: 700; color: var(--text-h); margin: 0; }
        .seg-card-desc { font-size: 12px; color: var(--text); margin: 0; }
        .seg-card-meta { font-size: 11px; color: var(--text); opacity: .75; }
        .seg-card-actions { display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid var(--border); padding-top: 10px; }
        .empty-state { text-align: center; padding: 60px 0; color: var(--text); }
        .empty-state p { margin: 0; font-size: 14px; }
        .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100; }
        .panel { position: fixed; top: 0; right: 0; bottom: 0; width: 440px; max-width: 95vw; background: var(--bg); border-left: 1px solid var(--border); z-index: 101; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.12); overflow-y: auto; }
        .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .panel-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-h); }
        .panel-close { background: none; border: none; font-size: 20px; color: var(--text); cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px; }
        .panel-close:hover { background: var(--accent-bg); }
        .panel-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 12px; font-weight: 600; color: var(--text-h); }
        .form-input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); font-size: 13px; font-family: inherit; transition: border-color .15s; box-sizing: border-box; width: 100%; }
        .form-input:focus { outline: none; border-color: var(--accent); }
        .form-error { font-size: 12px; color: #ef4444; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: 6px; padding: 7px 10px; }
        .filters-list { display: flex; flex-direction: column; gap: 8px; }
        .panel-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; flex-shrink: 0; }
        .preview-list { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
        .preview-user-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: var(--page-bg); border: 1px solid var(--border); border-radius: 7px; }
        .preview-user-name { font-size: 13px; font-weight: 600; color: var(--text-h); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-user-email { font-size: 11px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .preview-count { font-size: 12px; color: var(--text); }
        .state-msg { text-align: center; padding: 40px 0; color: var(--text); font-size: 14px; }
        .state-msg.error { color: #ef4444; }
      `}</style>

      <div className="segments-page">
        <div className="segments-header">
          <div>
            <h1>Customer Segments</h1>
            <p className="subtitle">Define and manage audience segments</p>
          </div>
          <button className="btn-primary" onClick={openNew}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Segment
          </button>
        </div>

        {loading && <p className="state-msg">Loading segments…</p>}
        {error   && <p className="state-msg error">{error}</p>}

        {!loading && !error && segments.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: .3, display: 'block', margin: '0 auto 12px' }}>
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
            </svg>
            <p>No segments yet. Create one to get started.</p>
          </div>
        )}

        {!loading && !error && segments.length > 0 && (
          <div className="segments-grid">
            {segments.map(seg => (
              <div className="segment-card" key={seg._id}>
                <div className="seg-card-top">
                  <span className="seg-color-dot" style={{ background: seg.color || '#3b82f6' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="seg-card-name">{seg.name}</p>
                    {seg.description && <p className="seg-card-desc">{seg.description}</p>}
                  </div>
                </div>
                <div className="seg-card-meta">
                  {Array.isArray(seg.filters) ? seg.filters.length : 0} filter{(Array.isArray(seg.filters) ? seg.filters.length : 0) !== 1 ? 's' : ''}
                </div>
                <div className="seg-card-actions">
                  <button className="btn-link" onClick={() => openPreview(seg)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4, verticalAlign: -1 }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Preview
                  </button>
                  <button className="btn-ghost" onClick={() => openEdit(seg)}>Edit</button>
                  <button className="btn-danger-sm" onClick={() => handleDelete(seg)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form panel (new / edit) */}
      {showForm && (
        <>
          <div className="panel-overlay" onClick={closeForm} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-header">
              <h2>{editSegment ? 'Edit Segment' : 'New Segment'}</h2>
              <button className="panel-close" onClick={closeForm}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="panel-body">
                {formErr && <div className="form-error">{formErr}</div>}
                <div className="form-group">
                  <label className="form-label">Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Segment name"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <ColorPicker value={form.color} onChange={c => setForm(p => ({ ...p, color: c }))} />
                </div>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="form-label" style={{ marginBottom: 0 }}>Filters</span>
                    <button type="button" className="btn-ghost" onClick={addFilter} style={{ padding: '3px 10px', fontSize: 12 }}>
                      + Add Filter
                    </button>
                  </div>
                  {form.filters.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, opacity: .7 }}>
                      No filters — this segment will match all users.
                    </p>
                  )}
                  <div className="filters-list">
                    {form.filters.map((filter, i) => (
                      <FilterRow
                        key={i}
                        filter={filter}
                        index={i}
                        onChange={handleFilterChange}
                        onRemove={handleFilterRemove}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : (editSegment ? 'Save Changes' : 'Create Segment')}
                </button>
                <button className="btn-ghost" type="button" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Preview panel */}
      {previewSegment && (
        <>
          <div className="panel-overlay" onClick={closePreview} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{ width: 12, height: 12, borderRadius: '50%', background: previewSegment.color || '#3b82f6', display: 'inline-block', flexShrink: 0 }}
                />
                <h2 style={{ margin: 0 }}>{previewSegment.name}</h2>
              </div>
              <button className="panel-close" onClick={closePreview}>×</button>
            </div>
            <div className="panel-body">
              {previewLoading && <p className="state-msg">Loading users…</p>}
              {previewErr && <p className="state-msg error">{previewErr}</p>}
              {!previewLoading && !previewErr && (
                <>
                  <p className="preview-count">
                    {previewUsers.count} matching user{previewUsers.count !== 1 ? 's' : ''}
                  </p>
                  {previewUsers.users.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--text)', textAlign: 'center', padding: '20px 0' }}>
                      No users match this segment.
                    </p>
                  ) : (
                    <div className="preview-list">
                      {previewUsers.users.map(user => (
                        <div className="preview-user-row" key={user._id}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="preview-user-name">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="preview-user-email">{user.email}</div>
                          </div>
                          {user.status && (
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 99, color: '#fff', flexShrink: 0,
                              background: STATUS_COLORS[user.status] || '#94a3b8',
                            }}>
                              {user.status}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="panel-footer">
              <button className="btn-ghost" onClick={closePreview} style={{ flex: 1 }}>Close</button>
              <button className="btn-ghost" onClick={() => { closePreview(); openEdit(previewSegment) }}>
                Edit Segment
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

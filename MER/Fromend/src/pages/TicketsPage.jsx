import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

const STATUSES   = ['All', 'Open', 'InProgress', 'Resolved', 'Closed']
const PRIORITIES = ['All', 'Low', 'Medium', 'High']

const PRIORITY_COLORS = {
  Low:    '#10b981',
  Medium: '#f59e0b',
  High:   '#ef4444',
}

const STATUS_COLORS = {
  Open:       '#3b82f6',
  InProgress: '#8b5cf6',
  Resolved:   '#10b981',
  Closed:     '#94a3b8',
}

const EMPTY_FORM = {
  subject:      '',
  description:  '',
  priority:     'Medium',
  contactName:  '',
  contactEmail: '',
  assignedTo:   '',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || '#94a3b8'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, color: '#fff',
      background: color, whiteSpace: 'nowrap',
    }}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#94a3b8'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, color: '#fff',
      background: color, whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

export default function TicketsPage() {
  const [tickets, setTickets]             = useState([])
  const [filter, setFilter]               = useState({ status: 'All', priority: 'All' })
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [showForm, setShowForm]           = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [newTicket, setNewTicket]         = useState(EMPTY_FORM)
  const [saving, setSaving]               = useState(false)
  const [formErr, setFormErr]             = useState(null)
  const [detailErr, setDetailErr]         = useState(null)

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/tickets')
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : (data.tickets ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = tickets.filter(t => {
    if (filter.status !== 'All' && t.status !== filter.status) return false
    if (filter.priority !== 'All' && t.priority !== filter.priority) return false
    return true
  })

  function openNew() {
    setNewTicket(EMPTY_FORM)
    setFormErr(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setFormErr(null)
  }

  function openDetail(ticket) {
    setSelectedTicket({ ...ticket })
    setDetailErr(null)
  }

  function closeDetail() {
    setSelectedTicket(null)
    setDetailErr(null)
  }

  async function handleCreateSubmit(e) {
    e.preventDefault()
    if (!newTicket.subject.trim()) { setFormErr('Subject is required.'); return }
    setSaving(true)
    setFormErr(null)
    try {
      const payload = {
        subject:      newTicket.subject.trim(),
        description:  newTicket.description.trim(),
        priority:     newTicket.priority,
        contactName:  newTicket.contactName.trim(),
        contactEmail: newTicket.contactEmail.trim(),
        assignedTo:   newTicket.assignedTo.trim(),
      }
      const res = await apiFetch('/api/tickets', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Server error ${res.status}`)
      }
      await fetchTickets()
      closeForm()
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDetailSave() {
    if (!selectedTicket.subject?.trim()) { setDetailErr('Subject is required.'); return }
    setSaving(true)
    setDetailErr(null)
    try {
      const res = await apiFetch(`/api/tickets/${selectedTicket._id}`, {
        method: 'PUT',
        body: JSON.stringify(selectedTicket),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Server error ${res.status}`)
      }
      const updated = await res.json().catch(() => selectedTicket)
      setTickets(prev => prev.map(t => t._id === selectedTicket._id ? (updated._id ? updated : selectedTicket) : t))
      closeDetail()
    } catch (e) {
      setDetailErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(ticket, status) {
    // Optimistic update in both the list and the detail panel
    const updated = { ...ticket, status }
    setTickets(prev => prev.map(t => t._id === ticket._id ? updated : t))
    if (selectedTicket?._id === ticket._id) setSelectedTicket(updated)
    try {
      const res = await apiFetch(`/api/tickets/${ticket._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Status update failed')
    } catch {
      // Revert
      setTickets(prev => prev.map(t => t._id === ticket._id ? ticket : t))
      if (selectedTicket?._id === ticket._id) setSelectedTicket(ticket)
    }
  }

  async function handleDelete(ticket) {
    if (!window.confirm(`Delete ticket "${ticket.subject}"?`)) return
    try {
      const res = await apiFetch(`/api/tickets/${ticket._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setTickets(prev => prev.filter(t => t._id !== ticket._id))
      if (selectedTicket?._id === ticket._id) closeDetail()
    } catch (e) {
      alert(e.message)
    }
  }

  const showResolution = selectedTicket &&
    (selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed')

  return (
    <>
      <style>{`
        .tickets-page { min-height: 100vh; background: var(--page-bg); padding: 24px; box-sizing: border-box; }
        .tickets-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 12px; }
        .tickets-header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-h); }
        .tickets-header .subtitle { margin: 2px 0 0; font-size: 13px; color: var(--text); }
        .tickets-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
        .toolbar-label { font-size: 12px; font-weight: 600; color: var(--text); }
        .filter-select { padding: 7px 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); font-size: 13px; cursor: pointer; }
        .toolbar-spacer { flex: 1; }
        .btn-primary { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity .15s; }
        .btn-primary:hover { opacity: .88; }
        .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-ghost:hover { background: var(--accent-bg); }
        .btn-danger-sm { background: transparent; border: 1px solid rgba(239,68,68,.3); color: #ef4444; padding: 4px 10px; border-radius: 5px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-danger-sm:hover { background: rgba(239,68,68,.08); }
        .tickets-table { width: 100%; border-collapse: collapse; background: var(--bg); border-radius: 10px; overflow: hidden; box-shadow: var(--shadow); border: 1px solid var(--border); }
        .tickets-table th { background: var(--page-bg); color: var(--text); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
        .tickets-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--text-h); vertical-align: middle; }
        .tickets-table tr:last-child td { border-bottom: none; }
        .tickets-table tbody tr:hover { background: var(--accent-bg); cursor: pointer; }
        .ticket-subject { font-weight: 600; color: var(--accent); }
        .ticket-subject:hover { text-decoration: underline; }
        .td-actions { display: flex; gap: 6px; align-items: center; }
        .empty-state { text-align: center; padding: 60px 0; color: var(--text); }
        .empty-state svg { opacity: .3; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto; }
        .empty-state p { margin: 0; font-size: 14px; }
        .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100; }
        .panel { position: fixed; top: 0; right: 0; bottom: 0; width: 420px; max-width: 95vw; background: var(--bg); border-left: 1px solid var(--border); z-index: 101; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.12); overflow-y: auto; }
        .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid var(--border); }
        .panel-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-h); }
        .panel-close { background: none; border: none; font-size: 20px; color: var(--text); cursor: pointer; line-height: 1; padding: 2px 6px; border-radius: 4px; }
        .panel-close:hover { background: var(--accent-bg); }
        .panel-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .form-group { display: flex; flex-direction: column; gap: 5px; }
        .form-label { font-size: 12px; font-weight: 600; color: var(--text-h); }
        .form-input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg); color: var(--text-h); font-size: 13px; font-family: inherit; transition: border-color .15s; box-sizing: border-box; width: 100%; }
        .form-input:focus { outline: none; border-color: var(--accent); }
        textarea.form-input { resize: vertical; min-height: 80px; }
        .form-error { font-size: 12px; color: #ef4444; background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: 6px; padding: 7px 10px; }
        .panel-footer { padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; }
        .detail-meta { font-size: 12px; color: var(--text); display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .state-msg { text-align: center; padding: 40px 0; color: var(--text); font-size: 14px; }
        .state-msg.error { color: #ef4444; }
      `}</style>

      <div className="tickets-page">
        <div className="tickets-header">
          <div>
            <h1>Support Tickets</h1>
            <p className="subtitle">Manage customer support requests</p>
          </div>
        </div>

        <div className="tickets-toolbar">
          <span className="toolbar-label">Status:</span>
          <select
            className="filter-select"
            value={filter.status}
            onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="toolbar-label">Priority:</span>
          <select
            className="filter-select"
            value={filter.priority}
            onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}
          >
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="toolbar-spacer" />
          <button className="btn-primary" onClick={openNew}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Ticket
          </button>
        </div>

        {loading && <p className="state-msg">Loading tickets…</p>}
        {error   && <p className="state-msg error">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            <p>No tickets found</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Contact</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <tr key={ticket._id} onClick={() => openDetail(ticket)}>
                  <td><span className="ticket-subject">{ticket.subject}</span></td>
                  <td style={{ color: 'var(--text)' }}>
                    {ticket.contactName || '—'}
                    {ticket.contactEmail && (
                      <div style={{ fontSize: 11, marginTop: 2 }}>{ticket.contactEmail}</div>
                    )}
                  </td>
                  <td><PriorityBadge priority={ticket.priority} /></td>
                  <td><StatusBadge status={ticket.status} /></td>
                  <td style={{ color: 'var(--text)', fontSize: 12 }}>{fmtDate(ticket.createdAt)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="td-actions">
                      <button className="btn-ghost" onClick={() => openDetail(ticket)}>View</button>
                      <button className="btn-danger-sm" onClick={() => handleDelete(ticket)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New ticket form panel */}
      {showForm && (
        <>
          <div className="panel-overlay" onClick={closeForm} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-header">
              <h2>New Ticket</h2>
              <button className="panel-close" onClick={closeForm}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit} style={{ display: 'contents' }}>
              <div className="panel-body">
                {formErr && <div className="form-error">{formErr}</div>}
                <div className="form-group">
                  <label className="form-label">Subject <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={newTicket.subject}
                    onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))}
                    placeholder="Ticket subject"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={newTicket.description}
                    onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe the issue…"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input"
                    value={newTicket.priority}
                    onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}
                  >
                    {PRIORITIES.filter(p => p !== 'All').map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newTicket.contactName}
                    onChange={e => setNewTicket(p => ({ ...p, contactName: e.target.value }))}
                    placeholder="Customer name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={newTicket.contactEmail}
                    onChange={e => setNewTicket(p => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newTicket.assignedTo}
                    onChange={e => setNewTicket(p => ({ ...p, assignedTo: e.target.value }))}
                    placeholder="Agent name or email"
                  />
                </div>
              </div>
              <div className="panel-footer">
                <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Create Ticket'}
                </button>
                <button className="btn-ghost" type="button" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Detail / edit panel */}
      {selectedTicket && (
        <>
          <div className="panel-overlay" onClick={closeDetail} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-header">
              <h2>Ticket Detail</h2>
              <button className="panel-close" onClick={closeDetail}>×</button>
            </div>
            <div className="panel-body">
              {detailErr && <div className="form-error">{detailErr}</div>}
              <div className="detail-meta">
                <PriorityBadge priority={selectedTicket.priority} />
                <StatusBadge status={selectedTicket.status} />
                <span style={{ marginLeft: 'auto', fontSize: 11 }}>{fmtDate(selectedTicket.createdAt)}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Subject <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="form-input"
                  type="text"
                  value={selectedTicket.subject ?? ''}
                  onChange={e => setSelectedTicket(p => ({ ...p, subject: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={selectedTicket.description ?? ''}
                  onChange={e => setSelectedTicket(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={selectedTicket.priority ?? 'Medium'}
                  onChange={e => setSelectedTicket(p => ({ ...p, priority: e.target.value }))}
                >
                  {PRIORITIES.filter(p => p !== 'All').map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={selectedTicket.status ?? 'Open'}
                  onChange={e => handleStatusChange(selectedTicket, e.target.value)}
                >
                  {STATUSES.filter(s => s !== 'All').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input
                  className="form-input"
                  type="text"
                  value={selectedTicket.contactName ?? ''}
                  onChange={e => setSelectedTicket(p => ({ ...p, contactName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={selectedTicket.contactEmail ?? ''}
                  onChange={e => setSelectedTicket(p => ({ ...p, contactEmail: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned To</label>
                <input
                  className="form-input"
                  type="text"
                  value={selectedTicket.assignedTo ?? ''}
                  onChange={e => setSelectedTicket(p => ({ ...p, assignedTo: e.target.value }))}
                />
              </div>
              {showResolution && (
                <div className="form-group">
                  <label className="form-label">Resolution</label>
                  <textarea
                    className="form-input"
                    value={selectedTicket.resolution ?? ''}
                    onChange={e => setSelectedTicket(p => ({ ...p, resolution: e.target.value }))}
                    placeholder="Describe how the issue was resolved…"
                  />
                </div>
              )}
            </div>
            <div className="panel-footer">
              <button
                className="btn-primary"
                onClick={handleDetailSave}
                disabled={saving}
                style={{ flex: 1 }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="btn-danger-sm"
                onClick={() => handleDelete(selectedTicket)}
              >
                Delete
              </button>
              <button className="btn-ghost" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

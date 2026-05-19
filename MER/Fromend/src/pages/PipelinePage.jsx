import { useState, useEffect } from 'react'
import { apiFetch } from '../utils/api'

const STAGES = ['New', 'Qualified', 'Proposal', 'Won', 'Lost']

const STAGE_COLORS = {
  New:       '#3b82f6',
  Qualified: '#8b5cf6',
  Proposal:  '#f59e0b',
  Won:       '#10b981',
  Lost:      '#ef4444',
}

const EMPTY_FORM = { title: '', value: '', contactName: '', contactEmail: '', notes: '' }

function fmtVal(v) {
  const n = Number(v) || 0
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function PipelinePage() {
  const [deals, setDeals]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editDeal, setEditDeal] = useState(null)
  const [newDeal, setNewDeal]   = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState(null)

  useEffect(() => { fetchDeals() }, [])

  async function fetchDeals() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch('/api/deals')
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      setDeals(Array.isArray(data) ? data : (data.deals ?? []))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditDeal(null)
    setNewDeal(EMPTY_FORM)
    setFormErr(null)
    setShowForm(true)
  }

  function openEdit(deal) {
    setEditDeal(deal)
    setNewDeal({
      title:        deal.title        ?? '',
      value:        deal.value        ?? '',
      contactName:  deal.contactName  ?? '',
      contactEmail: deal.contactEmail ?? '',
      notes:        deal.notes        ?? '',
    })
    setFormErr(null)
    setShowForm(true)
  }

  function closePanel() {
    setShowForm(false)
    setEditDeal(null)
    setFormErr(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!newDeal.title.trim()) { setFormErr('Title is required.'); return }
    setSaving(true)
    setFormErr(null)
    try {
      const payload = {
        title:        newDeal.title.trim(),
        value:        Number(newDeal.value) || 0,
        contactName:  newDeal.contactName.trim(),
        contactEmail: newDeal.contactEmail.trim(),
        notes:        newDeal.notes.trim(),
        ...(!editDeal ? { stage: 'New' } : {}),
      }
      let res
      if (editDeal) {
        res = await apiFetch(`/api/deals/${editDeal._id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        res = await apiFetch('/api/deals', { method: 'POST', body: JSON.stringify(payload) })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Server error ${res.status}`)
      }
      await fetchDeals()
      closePanel()
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleStageChange(deal, stage) {
    // Optimistic update
    setDeals(prev => prev.map(d => d._id === deal._id ? { ...d, stage } : d))
    try {
      const res = await apiFetch(`/api/deals/${deal._id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      })
      if (!res.ok) throw new Error('Stage update failed')
    } catch {
      // Revert on failure
      setDeals(prev => prev.map(d => d._id === deal._id ? deal : d))
    }
  }

  async function handleDelete(deal) {
    if (!window.confirm(`Delete deal "${deal.title}"?`)) return
    try {
      const res = await apiFetch(`/api/deals/${deal._id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeals(prev => prev.filter(d => d._id !== deal._id))
    } catch (e) {
      alert(e.message)
    }
  }

  const totalDeals = deals.length
  const totalValue = deals.reduce((s, d) => s + (Number(d.value) || 0), 0)

  return (
    <>
      <style>{`
        .pipeline-page { min-height: 100vh; background: var(--page-bg); padding: 24px; box-sizing: border-box; }
        .pipeline-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .pipeline-header h1 { margin: 0; font-size: 22px; font-weight: 700; color: var(--text-h); }
        .pipeline-header .subtitle { margin: 2px 0 0; font-size: 13px; color: var(--text); }
        .pipeline-summary { font-size: 12px; color: var(--text); margin-top: 4px; }
        .btn-primary { background: var(--accent); color: #fff; border: none; padding: 8px 16px; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: opacity .15s; }
        .btn-primary:hover { opacity: .88; }
        .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-ghost:hover { background: var(--accent-bg); }
        .btn-danger { background: transparent; border: none; color: #ef4444; padding: 4px 8px; border-radius: 5px; font-size: 12px; cursor: pointer; transition: background .15s; }
        .btn-danger:hover { background: rgba(239,68,68,.1); }
        .pipeline-grid { display: flex; gap: 12px; align-items: flex-start; overflow-x: auto; padding-bottom: 12px; }
        .pipeline-col { flex: 0 0 220px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; display: flex; flex-direction: column; box-shadow: var(--shadow); }
        .col-header { padding: 12px 14px 10px; border-bottom: 1px solid var(--border); }
        .col-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .col-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .col-name { font-size: 13px; font-weight: 700; color: var(--text-h); }
        .col-badge { background: var(--page-bg); border: 1px solid var(--border); color: var(--text); font-size: 11px; font-weight: 600; border-radius: 99px; padding: 1px 7px; margin-left: auto; }
        .col-total { font-size: 12px; color: var(--text); }
        .col-cards { padding: 10px 10px 12px; display: flex; flex-direction: column; gap: 8px; min-height: 60px; }
        .deal-card { background: var(--page-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
        .deal-card-title { font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer; background: none; border: none; padding: 0; text-align: left; font-family: inherit; }
        .deal-card-title:hover { text-decoration: underline; }
        .deal-card-contact { font-size: 12px; color: var(--text); }
        .deal-card-value { font-size: 13px; font-weight: 700; color: var(--text-h); }
        .deal-card-actions { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
        .stage-select { flex: 1; font-size: 11px; padding: 3px 6px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg); color: var(--text); cursor: pointer; }
        .col-empty { font-size: 12px; color: var(--text); text-align: center; padding: 16px 0; opacity: .6; }
        .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100; }
        .panel { position: fixed; top: 0; right: 0; bottom: 0; width: 380px; max-width: 95vw; background: var(--bg); border-left: 1px solid var(--border); z-index: 101; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,.12); overflow-y: auto; }
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
        .state-msg { text-align: center; padding: 40px 0; color: var(--text); font-size: 14px; }
        .state-msg.error { color: #ef4444; }
      `}</style>

      <div className="pipeline-page">
        <div className="pipeline-header">
          <div>
            <h1>Sales Pipeline</h1>
            <p className="subtitle">Track deals through your sales stages</p>
            <p className="pipeline-summary">
              {totalDeals} deal{totalDeals !== 1 ? 's' : ''} &nbsp;·&nbsp; Total value: {fmtVal(totalValue)}
            </p>
          </div>
          <button className="btn-primary" onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Deal
          </button>
        </div>

        {loading && <p className="state-msg">Loading deals…</p>}
        {error   && <p className="state-msg error">{error}</p>}

        {!loading && !error && (
          <div className="pipeline-grid">
            {STAGES.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage)
              const stageTotal = stageDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
              const color      = STAGE_COLORS[stage]
              return (
                <div className="pipeline-col" key={stage}>
                  <div className="col-header">
                    <div className="col-title-row">
                      <span className="col-dot" style={{ background: color }} />
                      <span className="col-name">{stage}</span>
                      <span className="col-badge">{stageDeals.length}</span>
                    </div>
                    <div className="col-total" style={{ color }}>{fmtVal(stageTotal)}</div>
                  </div>
                  <div className="col-cards">
                    {stageDeals.length === 0 && (
                      <div className="col-empty">No deals</div>
                    )}
                    {stageDeals.map(deal => (
                      <div className="deal-card" key={deal._id}>
                        <button className="deal-card-title" onClick={() => openEdit(deal)}>
                          {deal.title}
                        </button>
                        {deal.contactName && (
                          <div className="deal-card-contact">{deal.contactName}</div>
                        )}
                        <div className="deal-card-value">{fmtVal(deal.value)}</div>
                        <div className="deal-card-actions">
                          <select
                            className="stage-select"
                            value={deal.stage}
                            onChange={e => handleStageChange(deal, e.target.value)}
                          >
                            {STAGES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            className="btn-danger"
                            title="Delete deal"
                            onClick={() => handleDelete(deal)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Slide-in panel */}
      {showForm && (
        <>
          <div className="panel-overlay" onClick={closePanel} />
          <div className="panel" role="dialog" aria-modal="true">
            <div className="panel-header">
              <h2>{editDeal ? 'Edit Deal' : 'New Deal'}</h2>
              <button className="panel-close" onClick={closePanel}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="panel-body">
                {formErr && <div className="form-error">{formErr}</div>}
                <div className="form-group">
                  <label className="form-label">Title <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    className="form-input"
                    type="text"
                    value={newDeal.title}
                    onChange={e => setNewDeal(p => ({ ...p, title: e.target.value }))}
                    placeholder="Deal title"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Value ($)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newDeal.value}
                    onChange={e => setNewDeal(p => ({ ...p, value: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newDeal.contactName}
                    onChange={e => setNewDeal(p => ({ ...p, contactName: e.target.value }))}
                    placeholder="Contact name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={newDeal.contactEmail}
                    onChange={e => setNewDeal(p => ({ ...p, contactEmail: e.target.value }))}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    value={newDeal.notes}
                    onChange={e => setNewDeal(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Any additional notes…"
                  />
                </div>
              </div>
              <div className="panel-footer">
                <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : (editDeal ? 'Save Changes' : 'Add Deal')}
                </button>
                <button className="btn-ghost" type="button" onClick={closePanel}>Cancel</button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}

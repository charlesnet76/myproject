import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import './AuthPage.css'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) return setError('Passwords do not match')
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
          <span className="auth-brand">AeroBase</span>
        </div>

        {done ? (
          <>
            <h2 className="auth-title">Password reset!</h2>
            <p className="auth-sub">Redirecting you to sign in…</p>
          </>
        ) : (
          <>
            <h2 className="auth-title">Set new password</h2>
            <p className="auth-sub">Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                New Password
                <input type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} placeholder="Min. 8 characters" required minLength={8} />
              </label>
              <label>
                Confirm Password
                <input type="password" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} placeholder="••••••••" required />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
            <p className="auth-footer"><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  )
}

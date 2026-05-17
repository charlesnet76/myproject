import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import './AuthPage.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
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

        {sent ? (
          <>
            <h2 className="auth-title">Check your email</h2>
            <p className="auth-sub">If <strong>{email}</strong> is registered, a reset link is on its way. Check your spam folder too.</p>
            <p className="auth-footer"><Link to="/login">Back to sign in</Link></p>
          </>
        ) : (
          <>
            <h2 className="auth-title">Forgot password?</h2>
            <p className="auth-sub">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                Email
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
              </label>
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" className="btn-primary auth-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="auth-footer"><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  )
}

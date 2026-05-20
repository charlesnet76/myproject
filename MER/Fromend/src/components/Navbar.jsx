import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import NotificationBell from './NotificationBell'

export default function Navbar({ isDark, onToggleTheme, onSettings }) {
  const { admin, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
            <path d="M21 16v-2l-8-5V3.5C13 2.67 12.33 2 11.5 2S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
        <span className="brand-name">AeroBase</span>
      </div>

      <div className="navbar-links">
        <Link to="/dashboard"  className={`nav-link ${location.pathname === '/dashboard'  ? 'active' : ''}`}>Users</Link>
        <Link to="/pipeline"   className={`nav-link ${location.pathname === '/pipeline'   ? 'active' : ''}`}>Pipeline</Link>
        <Link to="/analytics"  className={`nav-link ${location.pathname === '/analytics'  ? 'active' : ''}`}>Analytics</Link>
      </div>

      <div className="navbar-right">
        {admin && (
          <button className="admin-badge" onClick={onSettings} title="Settings">
            <div className="admin-avatar">{admin.name?.[0]?.toUpperCase()}</div>
            <span className="admin-name">{admin.name}</span>
          </button>
        )}

        <NotificationBell />

        <button className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {isDark ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        <button className="btn-logout" onClick={handleLogout} aria-label="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </nav>
  )
}

import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin')) } catch { return null }
  })

  const login = (adminData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('admin', JSON.stringify(adminData))
    setAdmin(adminData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    setAdmin(null)
  }

  // Auto-logout when token expires (fired by apiFetch on 401)
  useEffect(() => {
    const handler = () => {
      logout()
      window.location.href = '/login'
    }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

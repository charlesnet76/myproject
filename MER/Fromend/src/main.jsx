/* eslint-disable react-refresh/only-export-components */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import App from './App.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import AnalyticsPage from './pages/AnalyticsPage.jsx'
import PipelinePage from './pages/PipelinePage.jsx'
import DataDashboardPage from './pages/DataDashboardPage.jsx'
import './index.css'

function ProtectedRoute({ children }) {
  const { admin } = useAuth()
  return admin ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { admin } = useAuth()
  return admin ? <Navigate to="/dashboard" replace /> : children
}

function Root() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                      element={<LandingPage />} />
          <Route path="/login"                 element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"              element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password"       element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/dashboard"             element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/analytics"             element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/pipeline"              element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
          <Route path="/data"                  element={<ProtectedRoute><DataDashboardPage /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode><Root /></StrictMode>
)

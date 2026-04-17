import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import DashboardLayout from './components/layout/DashboardLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import HomeOverview from './pages/HomeOverview.jsx'
import AppManagement from './pages/AppManagement.jsx'
import AppConfigure from './pages/AppConfigure.jsx'
import LiveSessions from './pages/LiveSessions.jsx'
import ServerManagement from './pages/ServerManagement.jsx'
import VpnAnalytics from './pages/VpnAnalytics.jsx'
import ProtocolHealth from './pages/ProtocolHealth.jsx'
import CountryIntelligence from './pages/CountryIntelligence.jsx'
import IspIntelligence from './pages/IspIntelligence.jsx'
import PoliciesOverrides from './pages/PoliciesOverrides.jsx'
import LogsEvents from './pages/LogsEvents.jsx'
import ReportsAnalytics from './pages/ReportsAnalytics.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import SystemSettings from './pages/SystemSettings.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Protected – all inside the dashboard shell */}
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<HomeOverview />} />
            <Route path="app-management" element={<AppManagement />} />
            <Route path="app-management/:appId/configure" element={<AppConfigure />} />
            <Route path="live-sessions"        element={<LiveSessions />} />
            <Route path="server-management"    element={<ServerManagement />} />
            <Route path="vpn-analytics"        element={<VpnAnalytics />} />
            <Route path="protocol-health"      element={<ProtocolHealth />} />
            <Route path="country-intelligence" element={<CountryIntelligence />} />
            <Route path="isp-intelligence"     element={<IspIntelligence />} />
            <Route path="policies"             element={<PoliciesOverrides />} />
            <Route path="logs"                 element={<LogsEvents />} />
            <Route path="reports"              element={<ReportsAnalytics />} />
            <Route path="protocol-configs"     element={<PlaceholderPage title="Protocol Configs" />} />
            <Route path="settings"             element={<SystemSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
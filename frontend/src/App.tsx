import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/context/AuthContext'
import { canAccessPath, defaultPathForRole } from '@/lib/access'
import { LoginPage } from '@/pages/LoginPage'
import { PublicReportPage } from '@/pages/PublicReportPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { LiveDemoPage } from '@/pages/LiveDemoPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { WeatherPage } from '@/pages/WeatherPage'
import { CommanderPage } from '@/pages/CommanderPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { AdminPage } from '@/pages/AdminPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SearchPage } from '@/pages/SearchPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { type ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-slate-400">Validating session…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ path, children }: { path: string; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-slate-400">Validating session…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessPath(user.role, path)) return <Navigate to={defaultPathForRole(user.role)} replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/report" element={<PublicReportPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/demo" element={<RoleRoute path="/demo"><LiveDemoPage /></RoleRoute>} />
        <Route index element={<RoleRoute path="/"><DashboardPage /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute path="/settings"><SettingsPage /></RoleRoute>} />
        <Route path="/incidents" element={<RoleRoute path="/incidents"><IncidentsPage /></RoleRoute>} />
        <Route path="/map" element={<RoleRoute path="/map"><MapPage /></RoleRoute>} />
        <Route path="/resources" element={<RoleRoute path="/resources"><ResourcesPage /></RoleRoute>} />
        <Route path="/weather" element={<RoleRoute path="/weather"><WeatherPage /></RoleRoute>} />
        <Route path="/commander" element={<RoleRoute path="/commander"><CommanderPage /></RoleRoute>} />
        <Route path="/analytics" element={<RoleRoute path="/analytics"><AnalyticsPage /></RoleRoute>} />
        <Route path="/search" element={<RoleRoute path="/search"><SearchPage /></RoleRoute>} />
        <Route path="/assignments" element={<RoleRoute path="/assignments"><AssignmentsPage /></RoleRoute>} />
        <Route path="/reports" element={<RoleRoute path="/reports"><ReportsPage /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute path="/admin"><AdminPage /></RoleRoute>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/context/AuthContext'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { MapPage } from '@/pages/MapPage'
import { ResourcesPage } from '@/pages/ResourcesPage'
import { CommanderPage } from '@/pages/CommanderPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { type ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-slate-400">Validating session…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/commander" element={<CommanderPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

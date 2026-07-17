import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import {
  queryKeys,
  useAdminAuditLogsQuery,
  useAdminOverviewQuery,
  useAdminUsersQuery,
  useSimulationStateQuery,
  useSystemHealthQuery,
  useTimelineEventsQuery,
} from '@/lib/queries'
import { Badge } from '@/components/Badge'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'

export function AdminPage() {
  const queryClient = useQueryClient()
  const overviewQuery = useAdminOverviewQuery()
  const usersQuery = useAdminUsersQuery()
  const auditQuery = useAdminAuditLogsQuery()
  const simulationQuery = useSimulationStateQuery()
  const healthQuery = useSystemHealthQuery()
  const timelineQuery = useTimelineEventsQuery()

  const users = usersQuery.data ?? []
  const auditLogs = auditQuery.data ?? []
  const overview = overviewQuery.data
  const simulation = simulationQuery.data
  const health = healthQuery.data
  const timeline = timelineQuery.data ?? []

  const roleCounts = useMemo(
    () => ({
      admin: users.filter((u) => u.role === 'county_admin' || u.role === 'administrator').length,
      leader: users.filter((u) => u.role === 'community_leader' || u.role === 'incident_commander').length,
      volunteer: users.filter((u) => u.role === 'community_volunteer' || u.role === 'dispatcher' || u.role === 'field_responder').length,
    }),
    [users],
  )

  async function toggleActive(userId: number, nextState: boolean) {
    await api.updateUser(userId, { is_active: nextState })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAuditLogs }),
    ])
  }

  async function refreshMonitoring() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.simulationState }),
      queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth }),
      queryClient.invalidateQueries({ queryKey: queryKeys.timelineEvents }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOverview }),
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAuditLogs }),
    ])
  }

  async function startSimulation() {
    await api.simulationStart()
    await refreshMonitoring()
  }

  async function stopSimulation() {
    await api.simulationStop()
    await refreshMonitoring()
  }

  async function stepSimulation() {
    await api.simulationStep()
    await refreshMonitoring()
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="County admin" title="Oversight" description="Accounts, health, audits, and simulation." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Users" value={overview?.total_users ?? users.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Active" value={overview?.active_users ?? users.filter((u) => u.is_active).length} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Open" value={overview?.open_incidents ?? 0} accent="bg-rose-50 text-rose-700" />
        <StatCard title="Audit" value={overview?.audit_events_24h ?? 0} accent="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Health</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{simulation?.is_running ? 'Running' : 'Paused'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void refreshMonitoring()} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Refresh
                </button>
                <button onClick={() => void stepSimulation()} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                  Step
                </button>
                <button onClick={() => void startSimulation()} className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                  Start
                </button>
                <button onClick={() => void stopSimulation()} className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700">
                  Stop
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Mini label="Tick" value={simulation ? `#${simulation.tick}` : '—'} />
              <Mini label="Scenario" value={simulation?.scenario_name ?? 'baseline'} />
              <Mini label="Server" value={health?.server_status ?? 'unknown'} />
              <Mini label="DB" value={health?.database_status ?? 'unknown'} />
              <Mini label="WS" value={health?.websocket_status ?? 'unknown'} />
              <Mini label="CPU" value={health ? `${health.cpu_usage_percent}%` : '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Users</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">Access</div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge label={`ADM ${roleCounts.admin}`} tone="bg-rose-50 text-rose-700 ring-rose-200" />
                <Badge label={`LEAD ${roleCounts.leader}`} tone="bg-sky-50 text-sky-700 ring-sky-200" />
                <Badge label={`VOL ${roleCounts.volunteer}`} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-950">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{user.role}</td>
                      <td className="px-4 py-3 text-slate-700">{user.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(user.id, !user.is_active)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          {user.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Timeline" items={timeline.slice(0, 10).map((event) => `${event.title} · ${event.severity}`)} />
          <Panel title="Audit" items={auditLogs.slice(0, 10).map((entry) => `${entry.action} · ${entry.entity_type} ${entry.entity_id ?? 'n/a'}`)} />
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

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
      <SectionHeader
        eyebrow="County admin"
        title="System control and oversight"
        description="Manage accounts, monitor live operational health, and review audit and simulation events."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Users" value={overview?.total_users ?? users.length} />
        <StatCard title="Active" value={overview?.active_users ?? users.filter((u) => u.is_active).length} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard title="Open Incidents" value={overview?.open_incidents ?? 0} accent="bg-red-500/15 text-red-300" />
        <StatCard title="Audit Events" value={overview?.audit_events_24h ?? 0} accent="bg-amber-500/15 text-amber-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Monitoring</div>
                <h2 className="mt-2 text-2xl font-semibold">System Health and Simulation</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void refreshMonitoring()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
                  Refresh
                </button>
                <button onClick={() => void stepSimulation()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10">
                  Step Simulation
                </button>
                <button onClick={() => void startSimulation()} className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25">
                  Start
                </button>
                <button onClick={() => void stopSimulation()} className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 ring-1 ring-red-500/30 hover:bg-red-500/25">
                  Stop
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Tile label="Simulation" value={simulation?.is_running ? 'running' : 'paused'} />
              <Tile label="Tick" value={simulation ? `#${simulation.tick}` : '—'} />
              <Tile label="Scenario" value={simulation?.scenario_name ?? 'baseline'} />
              <Tile label="Server" value={health?.server_status ?? 'unknown'} />
              <Tile label="Database" value={health?.database_status ?? 'unknown'} />
              <Tile label="WebSocket" value={health?.websocket_status ?? 'unknown'} />
              <Tile label="Memory" value={health ? `${health.memory_usage_mb} MB` : '—'} />
              <Tile label="CPU" value={health ? `${health.cpu_usage_percent}%` : '—'} />
              <Tile label="Connections" value={health ? `${health.open_connections}` : '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">User Management</div>
            <h2 className="mt-2 text-2xl font-semibold">Accounts and access levels</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge label={`ADMIN ${roleCounts.admin}`} tone="bg-red-500/15 text-red-200 ring-red-500/30" />
              <Badge label={`LEAD ${roleCounts.leader}`} tone="bg-calm/15 text-calm ring-calm/30" />
              <Badge label={`VOL ${roleCounts.volunteer}`} tone="bg-amber-500/15 text-amber-200 ring-amber-500/30" />
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-950/60">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-xs text-slate-400">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">{user.is_active ? 'Active' : 'Inactive'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => void toggleActive(user.id, !user.is_active)}
                          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
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
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Operational Timeline</div>
            <h2 className="mt-2 text-2xl font-semibold">Recent Simulation Events</h2>
            <div className="mt-4 space-y-3">
              {timeline.slice(0, 10).map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{event.title}</div>
                    <Badge label={event.severity.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{event.narrative}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Audit Log</div>
            <div className="mt-4 space-y-3">
              {auditLogs.slice(0, 12).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{entry.action}</div>
                    <Badge label={entry.severity.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {entry.entity_type} {entry.entity_id ?? 'n/a'} · {new Date(entry.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  )
}

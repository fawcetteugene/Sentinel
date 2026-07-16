import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { createOperationsSocket } from '@/lib/ws'
import { useDashboardQuery, useResourcesQuery, queryKeys } from '@/lib/queries'
import type { OperationalEvent, Resource } from '@/types'
import { StatCard } from '@/components/StatCard'
import { SectionHeader } from '@/components/SectionHeader'
import { SeverityBadge } from '@/components/Badge'
import { LiveEventList } from '@/components/LiveEventList'
import { MapPanel } from '@/components/MapPanel'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const summaryQuery = useDashboardQuery()
  const resourcesQuery = useResourcesQuery()
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<OperationalEvent[]>([])

  useEffect(() => {
    const socket = createOperationsSocket((event) => {
      setEvents((current) => [event, ...current].slice(0, 30))
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      void queryClient.invalidateQueries({ queryKey: queryKeys.resources })
    })
    return () => socket.close()
  }, [queryClient])

  useEffect(() => {
    if (resourcesQuery.data) setResources(resourcesQuery.data)
  }, [resourcesQuery.data])

  if (summaryQuery.isLoading || !summaryQuery.data) {
    return <div className="p-10 text-slate-400">Loading command center…</div>
  }

  const summary = summaryQuery.data

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Operations Overview</div>
          <h1 className="mt-2 text-4xl font-semibold">Sentinel AI Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Live operational state, incident prioritization, and AI recommendations for emergency response teams.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity="critical" />
          <SeverityBadge severity="high" />
          <SeverityBadge severity="moderate" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Incidents" value={summary.total_active_incidents} detail="All incidents requiring operational attention" />
        <StatCard title="Critical" value={summary.critical_incidents} accent="bg-red-500/15 text-red-300" />
        <StatCard title="Available Responders" value={summary.available_responders} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard title="Ambulances" value={summary.ambulances} accent="bg-amber-500/15 text-amber-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <MapPanel incidents={summary.live_incidents} resources={resources} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
              <SectionHeader eyebrow="AI Recommendations" title="Command Guidance" />
              <div className="mt-4 space-y-3">
                {summary.ai_recommendations.map((item) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
              <SectionHeader eyebrow="Recent Alerts" title="Live Feed" />
              <div className="mt-4 space-y-3">
                {summary.recent_alerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-sm font-semibold">{alert.title}</div>
                    <div className="mt-1 text-sm text-slate-400">{alert.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <SectionHeader eyebrow="Operational Journal" title="Recent Operations" />
            <div className="mt-4">
              <LiveEventList events={events} />
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <SectionHeader eyebrow="AI Command" title="Summary" />
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm font-medium">Current picture</div>
                <div className="mt-1 text-sm text-slate-400">
                  Responders are tracking {summary.total_active_incidents} active incidents across the city.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm font-medium">Critical alert</div>
                <div className="mt-1 text-sm text-slate-400">
                  {summary.critical_incidents} incidents need commander escalation.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="text-sm font-medium">Resource posture</div>
                <div className="mt-1 text-sm text-slate-400">
                  {summary.available_responders} responders are available for dispatch.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { queryKeys, useCommanderQuery, useMissionControlQuery } from '@/lib/queries'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { Badge } from '@/components/Badge'

export function CommanderPage() {
  const queryClient = useQueryClient()
  const missionQuery = useMissionControlQuery()
  const briefingQuery = useCommanderQuery()
  const mission = missionQuery.data
  const briefing = briefingQuery.data

  async function autoDispatch() {
    await api.autoDispatch(3)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
      queryClient.invalidateQueries({ queryKey: queryKeys.commander }),
    ])
  }

  if (!mission || !briefing) return <div className="p-6 text-slate-500">Loading missions…</div>

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Commander" title="Missions" description="Priorities, nearby help, and short explanations." />
        <button onClick={autoDispatch} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
          Auto-dispatch
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Priorities" value={mission.priorities.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Responders" value={mission.available_responders} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Vehicles" value={mission.available_vehicles} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Critical" value={mission.critical_incidents} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Plan</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">Mission list</div>
              </div>
              <Badge label={`ACTIVE ${mission.recommended_actions.length}`} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
            </div>
            <div className="mt-4 space-y-3">
              {mission.recommended_actions.map((action) => (
                <motion.div key={action.incident_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{action.incident_title}</div>
                      <div className="text-sm text-slate-500">{action.responder_name ?? 'Unassigned'}{action.resource_name ? ` · ${action.resource_name}` : ''}</div>
                    </div>
                    <Badge label={action.priority.toUpperCase()} tone="bg-sky-50 text-sky-700 ring-sky-200" />
                  </div>
                  <div className="mt-2 text-sm text-slate-700">{action.instructions}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Briefing" title="Why this plan" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MiniList title="Priorities" items={briefing.priorities} />
              <MiniList title="Allocations" items={briefing.responder_allocation} />
              <MiniList title="Actions" items={briefing.action_plan} />
              <MiniList title="Gaps" items={briefing.resource_shortages} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Panel title="Summary" text={mission.summary} />
          <Panel title="Weather" text={mission.weather_summary ?? 'No weather summary'} />
          <Panel title="Notes" items={mission.operational_notes} />
          <Panel title="Forecast" text={briefing.escalation_forecast} />
          <Panel title="Advice" text={briefing.evacuation_advice} />
          <Panel title="Report" text={briefing.situation_report} />
        </div>
      </div>
    </div>
  )
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-2 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function Panel({ title, text, items }: { title: string; text?: string; items?: string[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{title}</div>
      {text ? <div className="mt-3 text-sm leading-6 text-slate-700">{text}</div> : null}
      {items ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

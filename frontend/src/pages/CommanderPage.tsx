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

  if (!mission || !briefing) {
    return <div className="p-6 text-slate-600">Loading community missions…</div>
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader
        eyebrow="Community missions"
        title="Simple mission planning and volunteer coordination"
        description="The screen prioritizes urgent reports, proposes nearby helpers, and explains every recommendation in plain language."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Priorities" value={mission.priorities.length} detail={mission.summary} />
        <StatCard title="Responders" value={mission.available_responders} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard title="Vehicles" value={mission.available_vehicles} accent="bg-amber-500/15 text-amber-300" />
        <StatCard title="Critical Incidents" value={mission.critical_incidents} accent="bg-red-500/15 text-red-300" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Operational Summary</div>
          <div className="mt-2 text-lg text-slate-100">{mission.summary}</div>
          <div className="mt-2 text-sm text-slate-400">{mission.weather_summary ?? 'Weather conditions are not available.'}</div>
        </div>
        <button onClick={autoDispatch} className="rounded-2xl bg-calm px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          Auto-create community missions
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Recommended Actions</div>
                  <h2 className="mt-2 text-2xl font-semibold">Mission Plan</h2>
                </div>
              <Badge label={`Active ${mission.recommended_actions.length}`} tone="bg-calm/15 text-calm ring-calm/30" />
            </div>
            <div className="mt-4 space-y-3">
              {mission.recommended_actions.map((action) => (
                <motion.div key={action.incident_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{action.incident_title}</div>
                      <div className="text-sm text-slate-400">
                        {action.responder_name ?? 'Unassigned responder'} {action.resource_name ? `· ${action.resource_name}` : ''}
                      </div>
                    </div>
                    <Badge label={action.priority} tone="bg-white/10 text-slate-200 ring-white/10" />
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{action.instructions}</div>
                  <div className="mt-3 text-xs text-slate-500">{action.explanation}</div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Commander Briefing</div>
            <h2 className="mt-2 text-2xl font-semibold">AI Explanation Layer</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{briefing.summary}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BriefingList title="Priorities" items={briefing.priorities} />
              <BriefingList title="Responder Allocation" items={briefing.responder_allocation} />
              <BriefingList title="Action Plan" items={briefing.action_plan} />
              <BriefingList title="Resource Shortages" items={briefing.resource_shortages} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Operational Notes" items={mission.operational_notes} />
          <Panel title="Escalation Forecast" text={briefing.escalation_forecast} />
          <Panel title="Evacuation Advice" text={briefing.evacuation_advice} />
          <Panel title="Situation Report" text={briefing.situation_report} />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="text-sm font-semibold">Why the plan looks this way</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {briefing.explanation.map((line) => (
                <div key={line} className="rounded-2xl bg-slate-950/70 p-3">{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BriefingList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 space-y-2 text-sm text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function Panel({ title, text, items }: { title: string; text?: string; items?: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="text-sm font-semibold">{title}</div>
      {text ? <div className="mt-3 text-sm leading-7 text-slate-300">{text}</div> : null}
      {items ? (
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

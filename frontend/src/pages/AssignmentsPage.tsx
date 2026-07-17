import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys, useAssignmentsQuery } from '@/lib/queries'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'
import { StatCard } from '@/components/StatCard'

export function AssignmentsPage() {
  const queryClient = useQueryClient()
  const assignmentsQuery = useAssignmentsQuery()
  const assignments = assignmentsQuery.data ?? []

  async function autoDispatch() {
    await api.autoDispatch(5)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
    ])
  }

  const active = assignments.filter((item) => item.status !== 'completed').length

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Assignments" title="Missions" description="Live tasks for responders and volunteers." />
        <button onClick={autoDispatch} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
          Auto-dispatch
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Missions" value={assignments.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Active" value={active} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Completed" value={assignments.length - active} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Urgent" value={assignments.filter((item) => item.priority.toLowerCase().includes('p1') || item.priority.toLowerCase().includes('critical')).length} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-950">{assignment.mission}</div>
                <div className="mt-1 text-sm text-slate-500">{assignment.location}</div>
              </div>
              <Badge label={assignment.priority.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat label="ETA" value={`${assignment.eta_minutes} min`} />
              <MiniStat label="Status" value={assignment.status} />
              <MiniStat label="Assignee" value={`#${assignment.assignee_id}`} />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{assignment.instructions}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

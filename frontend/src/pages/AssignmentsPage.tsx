import type { Assignment } from '@/types'
import { SectionHeader } from '@/components/SectionHeader'
import { useAssignmentsQuery } from '@/lib/queries'

export function AssignmentsPage() {
  const assignmentsQuery = useAssignmentsQuery()
  const assignments = assignmentsQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="Task Assignment" title="Dispatcher missions and responder instructions" />
      <div className="grid gap-4 xl:grid-cols-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{assignment.mission}</div>
                <div className="text-sm text-slate-400">{assignment.location}</div>
              </div>
              <div className="rounded-full bg-calm/15 px-3 py-1 text-xs font-semibold text-calm">{assignment.priority}</div>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/70 p-3">ETA {assignment.eta_minutes} min</div>
              <div className="rounded-2xl bg-slate-950/70 p-3">Status {assignment.status}</div>
              <div className="rounded-2xl bg-slate-950/70 p-3 md:col-span-2">{assignment.instructions}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

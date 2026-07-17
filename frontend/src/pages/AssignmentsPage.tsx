import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys, useAssignmentsQuery } from '@/lib/queries'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'

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

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow="Task Assignment"
          title="Dispatcher missions and responder instructions"
          description="Assignments are generated manually or through mission automation for the most urgent incidents."
        />
        <button onClick={autoDispatch} className="rounded-2xl bg-calm px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110">
          Auto-dispatch missions
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {assignments.map((assignment) => (
          <div key={assignment.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">{assignment.mission}</div>
                <div className="text-sm text-slate-400">{assignment.location}</div>
              </div>
              <Badge label={assignment.priority} tone="bg-calm/15 text-calm ring-calm/30" />
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

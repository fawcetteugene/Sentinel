import type { AnalyticsSummary } from '@/types'
import { SectionHeader } from '@/components/SectionHeader'
import { BarChart } from '@/components/Charts'
import { useAnalyticsQuery } from '@/lib/queries'

export function AnalyticsPage() {
  const analyticsQuery = useAnalyticsQuery()
  const analytics = analyticsQuery.data

  if (!analytics) return <div className="p-6 text-slate-400">Loading analytics…</div>

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="Analytics" title="Operational metrics" />
      <div className="grid gap-6 xl:grid-cols-2">
        <BarChart title="Incidents over time" points={analytics.incidents_over_time} />
        <BarChart title="Response time" points={analytics.response_time} barColor="bg-warning" />
        <BarChart title="Resource utilization" points={analytics.resource_utilization} barColor="bg-success" />
        <BarChart title="Severity distribution" points={analytics.severity_distribution} barColor="bg-alert" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
        <div className="text-sm font-semibold">Mission completion</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {analytics.mission_completion_rate.map((point) => (
            <div key={point.label} className="rounded-2xl bg-slate-950/70 p-4">
              <div className="text-sm text-slate-400">{point.label}</div>
              <div className="mt-2 text-3xl font-semibold">{point.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

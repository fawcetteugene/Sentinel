import { SectionHeader } from '@/components/SectionHeader'
import { BarChart } from '@/components/Charts'
import { StatCard } from '@/components/StatCard'
import { useAnalyticsQuery } from '@/lib/queries'

export function AnalyticsPage() {
  const analyticsQuery = useAnalyticsQuery()
  const analytics = analyticsQuery.data

  if (!analytics) return <div className="p-6 text-slate-500">Loading analytics…</div>

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Analytics" title="Operational metrics" description="Trends, timing, and response load." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Incidents" value={analytics.incidents_over_time.reduce((sum, point) => sum + point.value, 0)} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Response" value={analytics.response_time.length} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Utilization" value={analytics.resource_utilization.length} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Severity" value={analytics.severity_distribution.reduce((sum, point) => sum + point.value, 0)} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <BarChart title="Incidents" points={analytics.incidents_over_time} barColor="bg-emerald-500" />
        <BarChart title="Response time" points={analytics.response_time} barColor="bg-sky-500" />
        <BarChart title="Resource use" points={analytics.resource_utilization} barColor="bg-amber-500" />
        <BarChart title="Severity mix" points={analytics.severity_distribution} barColor="bg-rose-500" />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Completion" title="Mission progress" />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {analytics.mission_completion_rate.map((point) => (
            <Mini key={point.label} label={point.label} value={`${point.value}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}

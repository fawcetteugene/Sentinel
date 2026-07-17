import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys, useReportsQuery } from '@/lib/queries'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'
import { StatCard } from '@/components/StatCard'

export function ReportsPage() {
  const queryClient = useQueryClient()
  const reportsQuery = useReportsQuery()
  const reports = reportsQuery.data ?? []

  async function download(format: 'csv' | 'pdf') {
    const blob = await api.exportReports(format)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sentinel-reports.${format}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Reports" title="Briefs" description="Operational notes and exports." />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void download('csv')} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            CSV
          </button>
          <button onClick={() => void download('pdf')} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            PDF
          </button>
          <button onClick={() => void queryClient.invalidateQueries({ queryKey: queryKeys.reports })} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Reports" value={reports.length} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Incidents" value={reports.filter((item) => item.kind === 'incident').length} accent="bg-rose-50 text-rose-700" />
        <StatCard title="Operations" value={reports.filter((item) => item.kind !== 'incident').length} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Exports" value="2" accent="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.35em] text-slate-500">{report.kind}</div>
              <Badge label={report.kind.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-950">{report.title}</div>
            <div className="mt-2 text-sm text-slate-600">{report.summary}</div>
            <div className="mt-4 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

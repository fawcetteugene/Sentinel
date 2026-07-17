import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys, useReportsQuery } from '@/lib/queries'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/Badge'

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

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.reports })
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow="Reports"
          title="Situation reports and operational exports"
          description="Generate, review, and export incident and operational reports in CSV or PDF format."
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void download('csv')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            Export CSV
          </button>
          <button onClick={() => void download('pdf')} className="rounded-2xl bg-calm px-4 py-3 text-sm font-semibold text-slate-950 hover:brightness-110">
            Export PDF
          </button>
          <button onClick={() => void refresh()} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.35em] text-calm/80">{report.kind}</div>
              <Badge label={report.kind.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
            </div>
            <div className="mt-2 text-xl font-semibold">{report.title}</div>
            <p className="mt-3 text-sm text-slate-300">{report.summary}</p>
            <div className="mt-4 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { SectionHeader } from '@/components/SectionHeader'
import { useReportsQuery } from '@/lib/queries'

export function ReportsPage() {
  const reportsQuery = useReportsQuery()
  const reports = reportsQuery.data ?? []

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <SectionHeader eyebrow="Reports" title="Situation reports and incident PDFs" />
      <div className="grid gap-4 xl:grid-cols-2">
        {reports.map((report) => (
          <div key={report.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">{report.kind}</div>
            <div className="mt-2 text-xl font-semibold">{report.title}</div>
            <p className="mt-3 text-sm text-slate-300">{report.summary}</p>
            <div className="mt-4 text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

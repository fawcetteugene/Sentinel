import type { AnalyticsPoint } from '@/types'

function maxValue(points: AnalyticsPoint[]) {
  return Math.max(1, ...points.map((point) => point.value))
}

export function BarChart({
  title,
  points,
  barColor = 'bg-calm',
}: {
  title: string
  points: AnalyticsPoint[]
  barColor?: string
}) {
  const max = maxValue(points)
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-5 flex h-56 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                className={`w-full rounded-t-2xl ${barColor}`}
                style={{ height: `${(point.value / max) * 100}%`, opacity: 0.85 }}
              />
            </div>
            <div className="text-[11px] text-slate-500">{point.label}</div>
            <div className="text-xs font-semibold text-slate-900">{point.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

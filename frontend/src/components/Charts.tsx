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
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-5 flex h-56 items-end gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                className={`w-full rounded-t-2xl ${barColor}`}
                style={{ height: `${(point.value / max) * 100}%`, opacity: 0.85 }}
              />
            </div>
            <div className="text-[11px] text-slate-400">{point.label}</div>
            <div className="text-xs font-semibold">{point.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}


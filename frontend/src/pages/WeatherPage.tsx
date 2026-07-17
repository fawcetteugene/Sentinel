import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { Timeline } from '@/components/Timeline'
import { useCurrentWeatherQuery, useRoadClosuresQuery, useSystemHealthQuery, useTimelineEventsQuery, useWeatherTimelineQuery } from '@/lib/queries'
import { Badge } from '@/components/Badge'

export function WeatherPage() {
  const currentWeatherQuery = useCurrentWeatherQuery()
  const weatherTimelineQuery = useWeatherTimelineQuery()
  const roadClosuresQuery = useRoadClosuresQuery()
  const timelineEventsQuery = useTimelineEventsQuery()
  const systemHealthQuery = useSystemHealthQuery()

  const weather = currentWeatherQuery.data
  const timeline = weatherTimelineQuery.data ?? []
  const closures = roadClosuresQuery.data ?? []
  const events = timelineEventsQuery.data ?? []
  const health = systemHealthQuery.data

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Weather" title="Conditions" description="Weather, roads, and system health." />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Condition" value={weather?.condition ?? 'unknown'} accent="bg-emerald-50 text-emerald-700" />
        <StatCard title="Temp" value={weather ? `${weather.temperature_c.toFixed(1)}°C` : '—'} accent="bg-amber-50 text-amber-700" />
        <StatCard title="Rain" value={weather ? `${weather.rain_mm.toFixed(1)} mm` : '—'} accent="bg-sky-50 text-sky-700" />
        <StatCard title="Risk" value={weather ? `${weather.lightning_risk}%` : '—'} accent="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-500">Current</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">{weather?.summary ?? 'Waiting for snapshot'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {weather?.flood_warning ? <Badge label="FLOOD" tone="bg-rose-50 text-rose-700 ring-rose-200" /> : null}
                {weather?.heatwave_warning ? <Badge label="HEAT" tone="bg-amber-50 text-amber-700 ring-amber-200" /> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Mini label="Humidity" value={weather ? `${weather.humidity_percent}%` : '—'} />
              <Mini label="Wind" value={weather ? `${weather.wind_kph} kph` : '—'} />
              <Mini label="Visibility" value={weather ? `${weather.visibility_km.toFixed(1)} km` : '—'} />
              <Mini label="Tick" value={weather ? `#${weather.id}` : '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Trend" title="Weather timeline" />
            <div className="mt-4">
              <Timeline
                items={timeline.slice(0, 8).map((entry) => ({
                  label: `${entry.condition.toUpperCase()} · ${entry.temperature_c.toFixed(1)}°C`,
                  narrative: entry.summary,
                  timestamp: entry.created_at,
                }))}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Events" title="Operational stream" />
            <div className="mt-4 space-y-3">
              {events.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-slate-950">{event.title}</div>
                    <Badge label={event.severity.toUpperCase()} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{event.narrative}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Roads" title="Closures" />
            <div className="mt-4 space-y-3">
              {closures.length ? (
                closures.map((closure) => (
                  <div key={closure.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-slate-950">{closure.title}</div>
                      <Badge label={closure.is_active ? 'ACTIVE' : 'CLEARED'} tone={closure.is_active ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'} />
                    </div>
                    <div className="mt-2 text-sm text-slate-600">{closure.reason}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No closures.</div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Health" title="System" />
            {health ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Mini label="Server" value={health.server_status} />
                <Mini label="DB" value={health.database_status} />
                <Mini label="WS" value={health.websocket_status} />
                <Mini label="Sim" value={health.simulation_status} />
                <Mini label="Memory" value={`${health.memory_usage_mb} MB`} />
                <Mini label="CPU" value={`${health.cpu_usage_percent}%`} />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No health snapshot.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

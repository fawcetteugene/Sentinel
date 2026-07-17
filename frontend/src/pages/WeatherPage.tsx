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
      <SectionHeader
        eyebrow="Weather and roads"
        title="Conditions that affect communities"
        description="Weather changes automatically, road closures open and close, and the system health view keeps the simulation honest."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Condition" value={weather?.condition ?? 'unknown'} detail={weather?.summary ?? 'Waiting for the first weather snapshot.'} />
        <StatCard title="Temperature" value={weather ? `${weather.temperature_c.toFixed(1)}°C` : '—'} accent="bg-amber-500/15 text-amber-300" />
        <StatCard title="Rain" value={weather ? `${weather.rain_mm.toFixed(1)} mm` : '—'} accent="bg-sky-500/15 text-sky-300" />
        <StatCard title="Lightning Risk" value={weather ? `${weather.lightning_risk}%` : '—'} accent="bg-red-500/15 text-red-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Current Conditions</div>
                <h2 className="mt-2 text-2xl font-semibold">Operational Weather</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {weather?.flood_warning ? <Badge label="FLOOD WARNING" tone="bg-red-500/15 text-red-200 ring-red-500/30" /> : null}
                {weather?.heatwave_warning ? <Badge label="HEATWAVE" tone="bg-orange-500/15 text-orange-200 ring-orange-500/30" /> : null}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Metric label="Humidity" value={weather ? `${weather.humidity_percent}%` : '—'} />
              <Metric label="Wind" value={weather ? `${weather.wind_kph} kph` : '—'} />
              <Metric label="Visibility" value={weather ? `${weather.visibility_km.toFixed(1)} km` : '—'} />
              <Metric label="Tick" value={weather ? `#${weather.id}` : '—'} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Weather Timeline</div>
            <h2 className="mt-2 text-2xl font-semibold">Recent Atmospheric History</h2>
            <div className="mt-5">
              <Timeline
                items={timeline.slice(0, 8).map((entry) => ({
                  label: `${entry.condition.toUpperCase()} · ${entry.temperature_c.toFixed(1)}°C`,
                  narrative: entry.summary,
                  timestamp: entry.created_at,
                }))}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Timeline</div>
            <h2 className="mt-2 text-2xl font-semibold">Operational Event Stream</h2>
            <div className="mt-4 space-y-3">
              {events.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{event.title}</div>
                    <Badge label={event.severity.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{event.narrative}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Road Closures</div>
            <h2 className="mt-2 text-2xl font-semibold">Active Infrastructure Restrictions</h2>
            <div className="mt-4 space-y-3">
              {closures.length ? (
                closures.map((closure) => (
                  <div key={closure.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{closure.title}</div>
                      <Badge label={closure.is_active ? 'ACTIVE' : 'CLEARED'} tone={closure.is_active ? 'bg-red-500/15 text-red-200 ring-red-500/30' : 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'} />
                    </div>
                    <div className="mt-2 text-sm text-slate-400">{closure.reason}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                  No active closures at the moment.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">System Health</div>
            <h2 className="mt-2 text-2xl font-semibold">Command Center Status</h2>
            {health ? (
              <div className="mt-4 grid gap-3">
                <Metric label="Server" value={health.server_status} />
                <Metric label="Database" value={health.database_status} />
                <Metric label="WebSocket" value={health.websocket_status} />
                <Metric label="Simulation" value={health.simulation_status} />
                <Metric label="Memory" value={`${health.memory_usage_mb} MB`} />
                <Metric label="CPU" value={`${health.cpu_usage_percent}%`} />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                System health data is not available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  )
}

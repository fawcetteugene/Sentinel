import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowPathIcon, BoltIcon, PauseIcon, PlayIcon, ForwardIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import {
  queryKeys,
  useCurrentWeatherQuery,
  useDashboardQuery,
  useIncidentsQuery,
  useMissionControlQuery,
  useResourcesQuery,
  useRoadClosuresQuery,
  useSimulationWorldQuery,
  useSimulationStateQuery,
  useSystemHealthQuery,
  useTimelineEventsQuery,
} from '@/lib/queries'
import { createOperationsSocket } from '@/lib/ws'
import { Badge } from '@/components/Badge'
import { LiveEventList } from '@/components/LiveEventList'
import { MapPanel } from '@/components/MapPanel'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import type { OperationalEvent } from '@/types'

export function LiveDemoPage() {
  const queryClient = useQueryClient()
  const demoQuery = useSimulationStateQuery()
  const summaryQuery = useDashboardQuery()
  const missionQuery = useMissionControlQuery()
  const weatherQuery = useCurrentWeatherQuery()
  const worldQuery = useSimulationWorldQuery()
  const incidentsQuery = useIncidentsQuery()
  const resourcesQuery = useResourcesQuery()
  const closuresQuery = useRoadClosuresQuery()
  const healthQuery = useSystemHealthQuery()
  const timelineQuery = useTimelineEventsQuery()
  const [events, setEvents] = useState<OperationalEvent[]>([])

  useEffect(() => {
    const socket = createOperationsSocket((event) => {
      setEvents((current) => [event, ...current].slice(0, 30))
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.resources }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weather }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weatherTimeline }),
        queryClient.invalidateQueries({ queryKey: queryKeys.roadClosures }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timelineEvents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth }),
        queryClient.invalidateQueries({ queryKey: queryKeys.simulationState }),
        queryClient.invalidateQueries({ queryKey: queryKeys.simulationWorld }),
      ])
    })
    return () => socket.close()
  }, [queryClient])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
        queryClient.invalidateQueries({ queryKey: queryKeys.incidents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.resources }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weather }),
        queryClient.invalidateQueries({ queryKey: queryKeys.weatherTimeline }),
        queryClient.invalidateQueries({ queryKey: queryKeys.roadClosures }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timelineEvents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth }),
        queryClient.invalidateQueries({ queryKey: queryKeys.simulationState }),
        queryClient.invalidateQueries({ queryKey: queryKeys.simulationWorld }),
      ])
    }, 2000)
    return () => window.clearInterval(interval)
  }, [queryClient])

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
      queryClient.invalidateQueries({ queryKey: queryKeys.incidents }),
      queryClient.invalidateQueries({ queryKey: queryKeys.resources }),
      queryClient.invalidateQueries({ queryKey: queryKeys.weather }),
      queryClient.invalidateQueries({ queryKey: queryKeys.weatherTimeline }),
      queryClient.invalidateQueries({ queryKey: queryKeys.roadClosures }),
      queryClient.invalidateQueries({ queryKey: queryKeys.timelineEvents }),
      queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth }),
      queryClient.invalidateQueries({ queryKey: queryKeys.simulationState }),
      queryClient.invalidateQueries({ queryKey: queryKeys.simulationWorld }),
    ])
  }

  async function startScenario() {
    await api.simulationStart()
    await refreshAll()
  }

  async function pauseScenario() {
    await api.simulationStop()
    await refreshAll()
  }

  async function stepScenario() {
    await api.simulationStep()
    await refreshAll()
  }

  async function resetScenario() {
    await api.simulationReset()
    await refreshAll()
  }

  async function setScenario(name: string) {
    await api.simulationScenario(name)
    await refreshAll()
  }

  async function setSpeed(multiplier: number) {
    await api.simulationSpeed(multiplier)
    await refreshAll()
  }

  async function autoDispatch() {
    await api.autoDispatch(4)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.missionControl }),
      queryClient.invalidateQueries({ queryKey: queryKeys.simulationWorld }),
    ])
  }

  const summary = summaryQuery.data
  const mission = missionQuery.data
  const weather = weatherQuery.data
  const state = demoQuery.data
  const health = healthQuery.data
  const incidents = incidentsQuery.data ?? []
  const resources = resourcesQuery.data ?? []
  const closures = closuresQuery.data ?? []
  const timeline = timelineQuery.data ?? []
  const world = worldQuery.data
  const liveEvents = events.length ? events : timeline.slice(0, 12).map((entry) => ({ type: entry.category, message: entry.narrative, created_at: entry.created_at, payload: {} }))
  const metrics = world?.metrics ?? {}
  const missionQueue =
    world?.missions?.length
      ? world.missions
      : (mission?.recommended_actions ?? []).map((action) => ({
          id: `action-${action.incident_id}`,
          incident_id: action.incident_id,
          incident_title: action.incident_title,
          title: action.instructions,
          priority: action.priority,
          assigned_team: action.responder_name ?? 'Auto-assigned',
          vehicle: action.resource_name ?? null,
          status: 'planned',
          progress_percent: 0,
          eta_minutes: action.eta_minutes,
          activity: action.instructions,
          completion_time: null,
          explanation: action.explanation,
        }))

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge label={state?.is_running ? 'LIVE' : 'PAUSED'} tone={state?.is_running ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30' : 'bg-amber-500/15 text-amber-200 ring-amber-500/30'} />
            <Badge label={`TICK ${state?.tick ?? 0}`} tone="bg-white/10 text-slate-200 ring-white/10" />
            <Badge label={weather?.condition?.toUpperCase() ?? 'NO WEATHER'} tone="bg-sky-500/15 text-sky-200 ring-sky-500/30" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">Live Demo Mode</div>
            <h1 className="mt-2 text-4xl font-semibold">Sentinel AI Simulation Control Room</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              A single, organized live surface for incidents, missions, weather, road closures, resource pressure, and system health. Everything here is mock data that changes in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => void startScenario()} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25">
            <PlayIcon className="h-4 w-4" />
            Start
          </button>
          <button onClick={() => void pauseScenario()} className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/25">
            <PauseIcon className="h-4 w-4" />
            Pause
          </button>
          <button onClick={() => void stepScenario()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <ForwardIcon className="h-4 w-4" />
            Step
          </button>
          <button onClick={() => void resetScenario()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <ArrowPathIcon className="h-4 w-4" />
            Reset
          </button>
          <button onClick={() => void autoDispatch()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            <BoltIcon className="h-4 w-4" />
            Dispatch
          </button>
          <button onClick={() => void setSpeed(2)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            x2
          </button>
          <button onClick={() => void setSpeed(5)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            x5
          </button>
          <button onClick={() => void refreshAll()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10">
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Commander Briefing" subtitle={world?.briefing ?? mission?.summary ?? 'No live briefing yet'}>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Scenario" value={world?.scenario_name ?? state?.scenario_name ?? 'baseline'} />
              <Metric label="Tick" value={`${world?.tick ?? state?.tick ?? 0}`} />
              <Metric label="Speed" value={`${state?.tick_interval_seconds ?? 0}s`} />
            </div>
            <div className="space-y-2">
              {(world?.commands ?? mission?.operational_notes ?? []).slice(0, 4).map((command, index) => (
                <div key={`${command}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
                  {command}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['Flood Scenario', 'flood'],
                ['Wildfire', 'wildfire'],
                ['Mass Casualty', 'mass_casualty'],
                ['Storm', 'storm'],
                ['Chemical Spill', 'chemical_spill'],
              ].map(([label, scenario]) => (
                <button
                  key={scenario}
                  onClick={() => void setScenario(scenario)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="World Metrics" subtitle="Live state updated by the local simulation">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Active Incidents" value={String(metrics.active_incidents ?? incidents.length)} />
            <Metric label="Critical" value={String(metrics.critical_incidents ?? summary?.critical_incidents ?? 0)} />
            <Metric label="Responders" value={String(metrics.responders_total ?? summary?.available_responders ?? 0)} />
            <Metric label="Vehicles" value={String(metrics.vehicles_total ?? resources.length)} />
            <Metric label="Hospitals" value={String(metrics.hospital_occupancy ?? 0)} />
            <Metric label="Shelters" value={String(metrics.shelter_occupancy ?? 0)} />
            <Metric label="Fuel" value={`${metrics.fuel_level ?? 0}%`} />
            <Metric label="Medical" value={`${metrics.medical_supply_level ?? 0}%`} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Incidents" value={summary?.total_active_incidents ?? incidents.length} detail="Current incidents on the board" />
        <StatCard title="Critical" value={summary?.critical_incidents ?? 0} accent="bg-red-500/15 text-red-300" />
        <StatCard title="Responders" value={summary?.available_responders ?? mission?.available_responders ?? 0} accent="bg-emerald-500/15 text-emerald-300" />
        <StatCard title="Vehicles" value={mission?.available_vehicles ?? resources.length} accent="bg-amber-500/15 text-amber-300" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <MapPanel incidents={incidents} resources={resources} closures={closures} weather={weather ?? null} world={world ?? null} />

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Mission Control" subtitle={mission?.summary ?? 'Waiting for mission control data'}>
              <div className="space-y-3">
                {mission?.recommended_actions.slice(0, 4).map((action) => (
                  <div key={action.incident_id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{action.incident_title}</div>
                      <Badge label={action.priority} tone="bg-white/10 text-slate-200 ring-white/10" />
                    </div>
                    <div className="mt-2 text-sm text-slate-300">{action.instructions}</div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Weather" subtitle={weather?.summary ?? 'Waiting for weather data'}>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Condition" value={weather?.condition ?? 'unknown'} />
                <Metric label="Temp" value={weather ? `${weather.temperature_c.toFixed(1)}°C` : '—'} />
                <Metric label="Rain" value={weather ? `${weather.rain_mm.toFixed(1)} mm` : '—'} />
                <Metric label="Wind" value={weather ? `${weather.wind_kph} kph` : '—'} />
              </div>
            </Panel>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="System Health" subtitle="Backend, database, websocket, and simulation status">
            {health ? (
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Server" value={health.server_status} />
                <Metric label="DB" value={health.database_status} />
                <Metric label="WS" value={health.websocket_status} />
                <Metric label="Sim" value={health.simulation_status} />
                <Metric label="Memory" value={`${health.memory_usage_mb} MB`} />
                <Metric label="CPU" value={`${health.cpu_usage_percent}%`} />
              </div>
            ) : (
              <div className="text-sm text-slate-400">No health snapshot yet.</div>
            )}
          </Panel>

          <Panel title="Live Feed" subtitle="WebSocket and timeline activity">
            <div className="max-h-[360px] overflow-auto pr-1">
              <LiveEventList events={liveEvents} />
            </div>
          </Panel>

          <Panel title="Road Closures" subtitle="Active weather and access restrictions">
            <div className="space-y-3">
              {closures.slice(0, 4).map((closure) => (
                <div key={closure.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{closure.title}</div>
                    <Badge label={closure.is_active ? 'ACTIVE' : 'CLEARED'} tone={closure.is_active ? 'bg-red-500/15 text-red-200 ring-red-500/30' : 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'} />
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{closure.reason}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Mission Queue" subtitle="Auto-generated assignments from the simulation">
            <div className="space-y-3">
              {missionQueue.slice(0, 5).map((missionItem, index) => (
                <div key={`${missionItem.title}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{missionItem.title}</div>
                      <div className="text-sm text-slate-400">{missionItem.incident_title}</div>
                    </div>
                    <Badge label={missionItem.status.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Progress {missionItem.progress_percent}% · ETA {missionItem.eta_minutes ?? 'TBD'} min</div>
                  <div className="mt-2 text-sm text-slate-300">{missionItem.activity}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Current Incidents" subtitle="Top incidents sorted by live analysis">
          <div className="space-y-3">
            {incidents.slice(0, 8).map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{incident.title}</div>
                    <div className="text-sm text-slate-400">{incident.hazard_type}</div>
                  </div>
                  <Badge label={`${incident.severity.toUpperCase()} · ${incident.status.toUpperCase()}`} tone="bg-calm/15 text-calm ring-calm/30" />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Resources" subtitle="Vehicles and field assets in motion">
          <div className="space-y-3">
            {resources.slice(0, 8).map((resource) => (
              <div key={resource.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{resource.name}</div>
                    <div className="text-sm text-slate-400">{resource.kind}</div>
                  </div>
                  <Badge label={resource.status.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Operational Timeline" subtitle="Recent simulation history">
          <div className="max-h-[420px] overflow-auto pr-1">
            {timeline.slice(0, 12).map((event) => (
              <div key={event.id} className="mb-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{event.title}</div>
                  <Badge label={event.severity.toUpperCase()} tone="bg-white/10 text-slate-200 ring-white/10" />
                </div>
                <div className="mt-2 text-sm text-slate-400">{event.narrative}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Demo Notes" subtitle="How to present this surface">
          <div className="space-y-3 text-sm leading-7 text-slate-300">
            <p>The simulation runs on mock data and updates the dashboard, weather, closures, and timeline continuously.</p>
            <p>Use Start, Pause, and Step to control the pace. Dispatch generates missions so the board keeps moving.</p>
            <p>The page is organized into one live control room so a judge can understand the entire operating picture at a glance.</p>
            <p>
              If you want a lighter overview, go back to the <Link to="/" className="text-calm underline underline-offset-4">Dashboard</Link> or inspect the
              <Link to="/weather" className="ml-1 text-calm underline underline-offset-4">Weather Center</Link>.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-glow">
      <div className="text-xs uppercase tracking-[0.35em] text-calm/80">{title}</div>
      {subtitle ? <div className="mt-2 text-sm text-slate-400">{subtitle}</div> : null}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-3">
      <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}

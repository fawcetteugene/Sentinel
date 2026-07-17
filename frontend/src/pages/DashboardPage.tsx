import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BoltIcon,
  MapIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { createOperationsSocket } from '@/lib/ws'
import { useAuth } from '@/context/AuthContext'
import { useAnalyticsQuery, useCurrentWeatherQuery, useDashboardQuery, useResourcesQuery, queryKeys } from '@/lib/queries'
import type { OperationalEvent, Resource } from '@/types'
import { StatCard } from '@/components/StatCard'
import { SectionHeader } from '@/components/SectionHeader'
import { LiveEventList } from '@/components/LiveEventList'
import { MapPanel } from '@/components/MapPanel'
import { BarChart } from '@/components/Charts'

type DashboardMode = 'public' | 'responder' | 'leader' | 'county'

const modeCopy: Record<
  DashboardMode,
  {
    eyebrow: string
    title: string
    subtitle: string
    primary: { to: string; label: string; icon: typeof MegaphoneIcon }
    secondary: { to: string; label: string; icon: typeof MapIcon }
  }
> = {
  public: {
    eyebrow: 'Public view',
    title: 'Report fast. See what matters.',
    subtitle: 'Emergency reporting, safe routes, shelters, and alerts.',
    primary: { to: '/report', label: 'Report', icon: MegaphoneIcon },
    secondary: { to: '/map', label: 'Map', icon: MapIcon },
  },
  responder: {
    eyebrow: 'Responder view',
    title: 'Missions, incidents, and nearby help.',
    subtitle: 'Volunteer operations, assignments, and live resource movement.',
    primary: { to: '/assignments', label: 'Missions', icon: UserGroupIcon },
    secondary: { to: '/incidents', label: 'Incidents', icon: ShieldCheckIcon },
  },
  leader: {
    eyebrow: 'Leader view',
    title: 'Verify, coordinate, brief.',
    subtitle: 'Operational incidents, missions, and local escalation paths.',
    primary: { to: '/commander', label: 'Commander', icon: BoltIcon },
    secondary: { to: '/reports', label: 'Briefs', icon: ShieldCheckIcon },
  },
  county: {
    eyebrow: 'County view',
    title: 'Full oversight, live metrics, and audit.',
    subtitle: 'All incidents, operations, analytics, and administration.',
    primary: { to: '/admin', label: 'County', icon: ShieldCheckIcon },
    secondary: { to: '/analytics', label: 'Analytics', icon: BoltIcon },
  },
}

const roleOrder: Record<DashboardMode, Array<{ label: string; value: number; tone: string }>> = {
  public: [
    { label: 'Safe', value: 0, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Missing', value: 0, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Shelters', value: 0, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Weather', value: 0, tone: 'bg-amber-50 text-amber-700' },
  ],
  responder: [
    { label: 'Volunteers', value: 0, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Roads', value: 0, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Resources', value: 0, tone: 'bg-cyan-50 text-cyan-700' },
    { label: 'Weather', value: 0, tone: 'bg-amber-50 text-amber-700' },
  ],
  leader: [
    { label: 'Incidents', value: 0, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Volunteers', value: 0, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Risk villages', value: 0, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Shelters', value: 0, tone: 'bg-sky-50 text-sky-700' },
  ],
  county: [
    { label: 'Open', value: 0, tone: 'bg-rose-50 text-rose-700' },
    { label: 'Critical', value: 0, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Volunteers', value: 0, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Assets', value: 0, tone: 'bg-cyan-50 text-cyan-700' },
  ],
}

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const summaryQuery = useDashboardQuery()
  const analyticsQuery = useAnalyticsQuery()
  const resourcesQuery = useResourcesQuery()
  const weatherQuery = useCurrentWeatherQuery()
  const [resources, setResources] = useState<Resource[]>([])
  const [events, setEvents] = useState<OperationalEvent[]>([])

  const mode: DashboardMode = useMemo(() => {
    switch (user?.role) {
      case 'community_volunteer':
      case 'dispatcher':
      case 'field_responder':
        return 'responder'
      case 'community_leader':
      case 'incident_commander':
        return 'leader'
      case 'county_admin':
      case 'administrator':
        return 'county'
      default:
        return 'public'
    }
  }, [user?.role])

  useEffect(() => {
    const socket = createOperationsSocket((event) => {
      setEvents((current) => [event, ...current].slice(0, 18))
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      void queryClient.invalidateQueries({ queryKey: queryKeys.resources })
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics })
    })
    return () => socket.close()
  }, [queryClient])

  useEffect(() => {
    if (resourcesQuery.data) setResources(resourcesQuery.data)
  }, [resourcesQuery.data])

  if (summaryQuery.isLoading || !summaryQuery.data) {
    return <div className="p-10 text-slate-600">Loading community dashboard…</div>
  }

  const summary = summaryQuery.data
  const analytics = analyticsQuery.data
  const copy = modeCopy[mode]
  const PrimaryIcon = copy.primary.icon
  const SecondaryIcon = copy.secondary.icon

  const metrics = {
    public: [
      { label: 'Safe', value: summary.people_safe, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Missing', value: summary.people_missing, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Shelters', value: summary.shelters_open, tone: 'bg-sky-50 text-sky-700' },
      { label: 'Weather', value: summary.weather_alerts, tone: 'bg-amber-50 text-amber-700' },
    ],
    responder: [
      { label: 'Volunteers', value: summary.volunteers_active, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Roads', value: summary.roads_closed, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Resources', value: summary.community_resources_available, tone: 'bg-cyan-50 text-cyan-700' },
      { label: 'Weather', value: summary.weather_alerts, tone: 'bg-amber-50 text-amber-700' },
    ],
    leader: [
      { label: 'Incidents', value: summary.total_active_incidents, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Volunteers', value: summary.volunteers_active, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Risk villages', value: summary.high_risk_villages, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Shelters', value: summary.shelters_open, tone: 'bg-sky-50 text-sky-700' },
    ],
    county: [
      { label: 'Open', value: summary.total_active_incidents, tone: 'bg-rose-50 text-rose-700' },
      { label: 'Critical', value: summary.critical_incidents, tone: 'bg-amber-50 text-amber-700' },
      { label: 'Volunteers', value: summary.volunteers_active, tone: 'bg-emerald-50 text-emerald-700' },
      { label: 'Assets', value: summary.community_resources_available, tone: 'bg-cyan-50 text-cyan-700' },
    ],
  }[mode]

  const chartData = analytics
    ? [
        { title: 'Incidents', points: analytics.incidents_over_time, barColor: 'bg-emerald-500' },
        { title: 'Response time', points: analytics.response_time, barColor: 'bg-sky-500' },
        ...(mode === 'county' || mode === 'leader'
          ? [{ title: 'Severity', points: analytics.severity_distribution, barColor: 'bg-amber-500' }]
          : []),
      ]
    : []

  const shortcuts =
    mode === 'public'
      ? [
          { label: 'Report', to: '/report' },
          { label: 'Map', to: '/map' },
          { label: 'Shelters', to: '/resources' },
        ]
      : mode === 'responder'
        ? [
            { label: 'Assignments', to: '/assignments' },
            { label: 'Incidents', to: '/incidents' },
            { label: 'Map', to: '/map' },
          ]
        : mode === 'leader'
          ? [
              { label: 'Commander', to: '/commander' },
              { label: 'Briefs', to: '/reports' },
              { label: 'Incidents', to: '/incidents' },
            ]
          : [
              { label: 'Admin', to: '/admin' },
              { label: 'Analytics', to: '/analytics' },
              { label: 'Search', to: '/search' },
            ]

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">{copy.eyebrow}</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={copy.primary.to} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                <PrimaryIcon className="h-5 w-5" />
                {copy.primary.label}
              </Link>
              <Link to={copy.secondary.to} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                <SecondaryIcon className="h-5 w-5" />
                {copy.secondary.label}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <MiniTag label="Open" value={summary.total_active_incidents} />
            <MiniTag label="Weather" value={summary.weather_alerts} tone="sky" />
            <MiniTag label="Assets" value={summary.community_resources_available} tone="amber" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <StatCard key={item.label} title={item.label} value={item.value} accent={item.tone} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Live map" title="Incidents, routes, and resources" />
            <div className="mt-4">
              <MapPanel incidents={summary.live_incidents} resources={resources} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CompactPanel title="AI recommendations" items={summary.ai_recommendations} />
            <CompactPanel title="Recent alerts" items={summary.recent_alerts.slice(0, 5).map((item) => item.title)} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Charts" title="Trend view" />
            <div className="mt-4 space-y-4">
              {chartData.map((chart) => (
                <BarChart key={chart.title} title={chart.title} points={chart.points} barColor={chart.barColor} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Status" title="Current picture" />
            <div className="mt-4 space-y-3">
              <MiniSummary label="Risk villages" value={`${summary.high_risk_villages}`} />
              <MiniSummary label="Families displaced" value={`${summary.families_displaced}`} />
              <MiniSummary label="Roads closed" value={`${summary.roads_closed}`} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Shortcuts" title="Role actions" />
            <div className="mt-4 flex flex-wrap gap-3">
              {shortcuts.map((item) => (
                <Link key={item.to} to={item.to} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  {item.label}
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <SectionHeader eyebrow="Journal" title="Recent activity" />
        <div className="mt-4">
          <LiveEventList events={events} />
        </div>
      </div>
    </div>
  )
}

function MiniTag({ label, value, tone = 'emerald' }: { label: string; value: number; tone?: 'emerald' | 'sky' | 'amber' }) {
  const styles =
    tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
      : tone === 'sky'
        ? 'border-sky-100 bg-sky-50 text-sky-800'
        : 'border-amber-100 bg-amber-50 text-amber-800'
  return (
    <div className={`rounded-3xl border p-4 ${styles}`}>
      <div className="text-xs uppercase tracking-[0.3em] opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

function MiniSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function CompactPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.slice(0, 4).map((item) => (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {item}
            </motion.div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">No items.</div>
        )}
      </div>
    </div>
  )
}

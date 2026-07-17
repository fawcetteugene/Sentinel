import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BellAlertIcon,
  BoltIcon,
  MapIcon,
  MegaphoneIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { createOperationsSocket } from '@/lib/ws'
import { useAuth } from '@/context/AuthContext'
import { useCurrentWeatherQuery, useDashboardQuery, useResourcesQuery, queryKeys } from '@/lib/queries'
import type { OperationalEvent, Resource } from '@/types'
import { StatCard } from '@/components/StatCard'
import { SectionHeader } from '@/components/SectionHeader'
import { SeverityBadge } from '@/components/Badge'
import { LiveEventList } from '@/components/LiveEventList'
import { MapPanel } from '@/components/MapPanel'

type DashboardMode = 'public' | 'responder' | 'leader' | 'county'

const modeCopy: Record<DashboardMode, { eyebrow: string; title: string; description: string; primary: { to: string; label: string; icon: typeof MegaphoneIcon }; secondary: { to: string; label: string; icon: typeof MapIcon } }> = {
  public: {
    eyebrow: 'Public view',
    title: 'Fast help, public alerts, and safe routes',
    description: 'Use this view to report a problem, find nearby help, and follow alerts without extra noise.',
    primary: { to: '/report', label: 'Report emergency', icon: MegaphoneIcon },
    secondary: { to: '/map', label: 'Open map', icon: MapIcon },
  },
  responder: {
    eyebrow: 'Responder view',
    title: 'Volunteer missions and local response coordination',
    description: 'Focus on assignments, available resources, and the incidents that need people on the ground.',
    primary: { to: '/assignments', label: 'View missions', icon: UserGroupIcon },
    secondary: { to: '/incidents', label: 'Review incidents', icon: ShieldCheckIcon },
  },
  leader: {
    eyebrow: 'Leader view',
    title: 'Verify reports, guide volunteers, and send briefings',
    description: 'Track what is happening, confirm incidents, and direct the local response with simple actions.',
    primary: { to: '/commander', label: 'Open missions', icon: BoltIcon },
    secondary: { to: '/reports', label: 'Open briefs', icon: BellAlertIcon },
  },
  county: {
    eyebrow: 'County view',
    title: 'County overview with live community operations',
    description: 'See the highest-risk areas, operational health, and response coverage at a glance.',
    primary: { to: '/admin', label: 'Open county console', icon: ShieldCheckIcon },
    secondary: { to: '/analytics', label: 'View analytics', icon: BoltIcon },
  },
}

export function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const summaryQuery = useDashboardQuery()
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
      setEvents((current) => [event, ...current].slice(0, 30))
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      void queryClient.invalidateQueries({ queryKey: queryKeys.resources })
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
  const copy = modeCopy[mode]
  const PrimaryIcon = copy.primary.icon
  const SecondaryIcon = copy.secondary.icon

  const topStats =
    mode === 'public'
      ? [
          { title: 'People Safe', value: summary.people_safe, detail: 'Estimated people currently safe', accent: 'bg-emerald-50 text-emerald-700' },
          { title: 'People Missing', value: summary.people_missing, detail: 'Open missing-person reports', accent: 'bg-rose-50 text-rose-700' },
          { title: 'Shelters Open', value: summary.shelters_open, detail: 'Churches, schools, mosques, halls', accent: 'bg-sky-50 text-sky-700' },
          { title: 'Weather Alerts', value: summary.weather_alerts, detail: weatherQuery.data?.summary ?? 'Awaiting weather snapshot', accent: 'bg-amber-50 text-amber-700' },
        ]
      : mode === 'responder'
        ? [
            { title: 'Volunteers Active', value: summary.volunteers_active, detail: 'Community responders on duty', accent: 'bg-emerald-50 text-emerald-700' },
            { title: 'Roads Closed', value: summary.roads_closed, detail: 'Blocked or unsafe routes', accent: 'bg-rose-50 text-rose-700' },
            { title: 'Resources Available', value: summary.community_resources_available, detail: 'Boats, bodabodas, clinics, halls', accent: 'bg-cyan-50 text-cyan-700' },
            { title: 'Weather Alerts', value: summary.weather_alerts, detail: weatherQuery.data?.summary ?? 'Awaiting weather snapshot', accent: 'bg-amber-50 text-amber-700' },
          ]
        : mode === 'leader'
          ? [
              { title: 'Active Incidents', value: summary.total_active_incidents, detail: 'Reports currently being tracked', accent: 'bg-rose-50 text-rose-700' },
              { title: 'Volunteers Active', value: summary.volunteers_active, detail: 'Ready for mission dispatch', accent: 'bg-emerald-50 text-emerald-700' },
              { title: 'High Risk Villages', value: summary.high_risk_villages, detail: 'Villages needing attention', accent: 'bg-amber-50 text-amber-700' },
              { title: 'Shelters Open', value: summary.shelters_open, detail: 'Places ready to receive families', accent: 'bg-sky-50 text-sky-700' },
            ]
          : [
              { title: 'Open Incidents', value: summary.total_active_incidents, detail: 'Community-wide incident load', accent: 'bg-rose-50 text-rose-700' },
              { title: 'Critical Incidents', value: summary.critical_incidents, detail: 'Cases needing escalation', accent: 'bg-amber-50 text-amber-700' },
              { title: 'Volunteers Active', value: summary.volunteers_active, detail: 'Response coverage today', accent: 'bg-emerald-50 text-emerald-700' },
              { title: 'Community Assets', value: summary.community_resources_available, detail: 'Vehicles, shelters, clinics, and support', accent: 'bg-cyan-50 text-cyan-700' },
            ]

  const supportStats = [
    { title: 'Families Displaced', value: summary.families_displaced, detail: 'Need shelter or temporary support', accent: 'bg-orange-50 text-orange-700' },
    { title: 'Clean Water', value: summary.clean_water, detail: 'Water points and tanks available', accent: 'bg-sky-50 text-sky-700' },
    { title: 'Food Stocks', value: summary.food_stocks, detail: 'Community stores and kitchens', accent: 'bg-lime-50 text-lime-700' },
    { title: 'Medical Supplies', value: summary.medical_supplies, detail: 'Clinic and hospital support', accent: 'bg-violet-50 text-violet-700' },
  ]

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">{copy.eyebrow}</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{copy.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{copy.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to={copy.primary.to}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <PrimaryIcon className="h-5 w-5" />
                {copy.primary.label}
              </Link>
              <Link
                to={copy.secondary.to}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <SecondaryIcon className="h-5 w-5" />
                {copy.secondary.label}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-emerald-700">Live priority</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-950">{summary.total_active_incidents} open</div>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-sky-700">Current weather</div>
              <div className="mt-2 text-2xl font-semibold text-sky-950">{weatherQuery.data?.summary ?? 'Updating'}</div>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Help line</div>
              <div className="mt-2 text-2xl font-semibold text-amber-950">Emergency first</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} detail={stat.detail} accent={stat.accent} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {supportStats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} detail={stat.detail} accent={stat.accent} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader
              eyebrow="Live map"
              title="Incident and resource movement"
              description="This view keeps the live situation readable: incidents, moving resources, routes, and community shelters."
            />
            <div className="mt-4">
              <MapPanel incidents={summary.live_incidents} resources={resources} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoPanel
              eyebrow="AI recommendations"
              title="Why these actions are suggested"
              description="Each recommendation is explained in plain language so leaders and volunteers can act quickly."
              items={summary.ai_recommendations}
              accent="emerald"
            />
            <InfoPanel
              eyebrow="Recent alerts"
              title="Live feed"
              description="Public-facing alerts and internal notices are grouped together for quick review."
              items={summary.recent_alerts.map((alert) => `${alert.title} · ${alert.body}`)}
              accent="sky"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Operational journal" title="Recent activity" description="The live event feed shows the most recent simulation and system updates." />
            <div className="mt-4">
              <LiveEventList events={events} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Community AI" title="Current situation" description="A short summary of the current operating picture." />
            <div className="mt-4 space-y-3">
              <MiniSummary label="Current picture" value={`Tracking ${summary.total_active_incidents} active reports`} tone="emerald" />
              <MiniSummary label="High risk" value={`${summary.high_risk_villages} villages need attention`} tone="amber" />
              <MiniSummary label="Resource posture" value={`${summary.community_resources_available} community resources available`} tone="sky" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <SectionHeader eyebrow="Quick actions" title="Role shortcuts" description="Only the actions useful to your role should stay visible." />
            <div className="mt-4 flex flex-wrap gap-3">
              {mode === 'public' ? (
                <>
                  <Shortcut label="Report emergency" to="/report" />
                  <Shortcut label="Open map" to="/map" />
                  <Shortcut label="Shelters" to="/resources" />
                </>
              ) : mode === 'responder' ? (
                <>
                  <Shortcut label="Assignments" to="/assignments" />
                  <Shortcut label="Incidents" to="/incidents" />
                  <Shortcut label="Settings" to="/settings" />
                </>
              ) : mode === 'leader' ? (
                <>
                  <Shortcut label="Missions" to="/commander" />
                  <Shortcut label="Briefs" to="/reports" />
                  <Shortcut label="Incidents" to="/incidents" />
                </>
              ) : (
                <>
                  <Shortcut label="County console" to="/admin" />
                  <Shortcut label="Analytics" to="/analytics" />
                  <Shortcut label="Search" to="/search" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoPanel({
  eyebrow,
  title,
  description,
  items,
  accent,
}: {
  eyebrow: string
  title: string
  description: string
  items: string[]
  accent: 'emerald' | 'sky'
}) {
  const tone =
    accent === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
      : 'border-sky-100 bg-sky-50 text-sky-700'
  return (
    <div className={`rounded-[2rem] border p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${tone}`}>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <motion.div key={item} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/60 bg-white/85 p-4 text-sm text-slate-700 shadow-sm">
            {item}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function MiniSummary({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'emerald' | 'amber' | 'sky'
}) {
  const style =
    tone === 'emerald'
      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50 text-amber-800'
        : 'border-sky-100 bg-sky-50 text-sky-800'
  return (
    <div className={`rounded-3xl border p-4 ${style}`}>
      <div className="text-xs uppercase tracking-[0.25em] opacity-70">{label}</div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  )
}

function Shortcut({ label, to }: { label: string; to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
      {label}
      <ArrowRightIcon className="h-4 w-4" />
    </Link>
  )
}

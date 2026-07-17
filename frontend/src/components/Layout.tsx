import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  BellAlertIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CloudIcon,
  FireIcon,
  MapIcon,
  MagnifyingGlassIcon,
  RectangleGroupIcon,
  ShieldExclamationIcon,
  TruckIcon,
  UserGroupIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { clsx } from '@/components/ui'
import { defaultPathForRole } from '@/lib/access'

const nav = [
  { to: '/', label: 'Home', icon: RectangleGroupIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/settings', label: 'Settings', icon: Cog6ToothIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/report', label: 'Report', icon: MegaphoneIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/map', label: 'Map', icon: MapIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/resources', label: 'Community Help', icon: TruckIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/weather', label: 'Weather', icon: CloudIcon, roles: ['public_user', 'community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/incidents', label: 'Incidents', icon: ShieldExclamationIcon, roles: ['community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/assignments', label: 'Volunteers', icon: UserGroupIcon, roles: ['community_volunteer', 'community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'field_responder', 'administrator'] },
  { to: '/commander', label: 'Missions', icon: FireIcon, roles: ['community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'administrator'] },
  { to: '/reports', label: 'Briefs', icon: BellAlertIcon, roles: ['community_leader', 'county_admin', 'incident_commander', 'dispatcher', 'administrator'] },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon, roles: ['community_leader', 'county_admin', 'administrator'] },
  { to: '/search', label: 'Search', icon: MagnifyingGlassIcon, roles: ['community_leader', 'county_admin', 'administrator'] },
  { to: '/admin', label: 'County', icon: ShieldExclamationIcon, roles: ['county_admin', 'administrator'] },
]

const roleLabel: Record<string, string> = {
  public_user: 'Public user',
  community_volunteer: 'Community volunteer',
  community_leader: 'Community leader',
  county_admin: 'County admin',
  incident_commander: 'Community leader',
  dispatcher: 'Community volunteer',
  field_responder: 'Volunteer responder',
  administrator: 'County admin',
}

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navItems = nav.filter((item) => !user?.role || item.roles.includes(user.role))
  const currentLabel = navItems.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ?? 'Home'
  const landing = defaultPathForRole(user?.role)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc,#e8f3ec_56%,#f8fafc)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-72 border-r border-emerald-900/10 bg-white/85 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.35em] text-emerald-700/80">Community disaster coordination</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">Sentinel AI</div>
            <p className="mt-3 max-w-xs text-sm text-slate-600">
              {user?.role === 'public_user'
                ? 'Report emergencies, find shelter, and follow public alerts.'
                : user?.role === 'community_volunteer'
                  ? 'See missions, locations, and community response tasks.'
                  : user?.role === 'community_leader'
                    ? 'Review incidents, coordinate volunteers, and issue briefings.'
                    : 'County operations, community response, and live oversight.'}
            </p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                    active ? 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Signed in</div>
            <div className="mt-2 text-sm font-medium text-slate-950">{user?.full_name ?? 'Unknown user'}</div>
            <div className="text-xs text-slate-500">{roleLabel[user?.role ?? ''] ?? user?.role}</div>
            <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
              Landing view: {currentLabel} {landing !== '/' ? `· starts at ${landing}` : ''}
            </div>
            <button
              onClick={logout}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>
        <main className="flex-1 px-4 py-4 lg:px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-slate-200 bg-white/88 shadow-glow backdrop-blur"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

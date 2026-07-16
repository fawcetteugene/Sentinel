import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRightOnRectangleIcon,
  BellAlertIcon,
  ChartBarIcon,
  FireIcon,
  MapIcon,
  RectangleGroupIcon,
  ShieldExclamationIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { clsx } from '@/components/ui'

const nav = [
  { to: '/', label: 'Dashboard', icon: RectangleGroupIcon },
  { to: '/incidents', label: 'Incidents', icon: ShieldExclamationIcon },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/resources', label: 'Resources', icon: TruckIcon },
  { to: '/commander', label: 'AI Commander', icon: FireIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon },
  { to: '/assignments', label: 'Assignments', icon: UserGroupIcon },
  { to: '/reports', label: 'Reports', icon: BellAlertIcon },
]

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,#020617,#0f172a_55%,#020617)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="hidden w-72 border-r border-white/10 bg-slate-950/80 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.35em] text-calm/80">OpenAI Build Week</div>
            <div className="mt-2 text-3xl font-semibold">Sentinel AI</div>
            <p className="mt-3 max-w-xs text-sm text-slate-400">
              AI incident commander for emergency operations centers.
            </p>
          </div>
          <nav className="space-y-2">
            {nav.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                    active ? 'bg-calm/15 text-white ring-1 ring-calm/30' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in</div>
            <div className="mt-2 text-sm font-medium">{user?.full_name ?? 'Unknown user'}</div>
            <div className="text-xs text-slate-400">{user?.role}</div>
            <button
              onClick={logout}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/15"
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
            className="rounded-[2rem] border border-white/10 bg-slate-950/50 shadow-glow backdrop-blur"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}


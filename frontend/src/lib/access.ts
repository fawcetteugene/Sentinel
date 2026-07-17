import type { Role } from '@/types'

export type AppPath =
  | '/'
  | '/report'
  | '/settings'
  | '/map'
  | '/resources'
  | '/weather'
  | '/incidents'
  | '/assignments'
  | '/commander'
  | '/reports'
  | '/analytics'
  | '/search'
  | '/admin'
  | '/demo'

const allSignedInRoles: Role[] = [
  'public_user',
  'community_volunteer',
  'community_leader',
  'county_admin',
  'incident_commander',
  'dispatcher',
  'field_responder',
  'administrator',
]

const responderRoles: Role[] = [
  'community_volunteer',
  'community_leader',
  'county_admin',
  'incident_commander',
  'dispatcher',
  'field_responder',
  'administrator',
]

const leaderRoles: Role[] = [
  'community_leader',
  'county_admin',
  'incident_commander',
  'dispatcher',
  'administrator',
]

const adminRoles: Role[] = ['county_admin', 'administrator']

export const routeAccess: Record<AppPath, Role[]> = {
  '/': allSignedInRoles,
  '/report': allSignedInRoles,
  '/settings': allSignedInRoles,
  '/map': allSignedInRoles,
  '/resources': allSignedInRoles,
  '/weather': allSignedInRoles,
  '/incidents': responderRoles,
  '/assignments': responderRoles,
  '/commander': leaderRoles,
  '/reports': leaderRoles,
  '/analytics': leaderRoles,
  '/search': leaderRoles,
  '/admin': adminRoles,
  '/demo': adminRoles,
}

export function canAccessPath(role: Role | null | undefined, path: string) {
  if (!role) return false
  const key = normalizePath(path)
  const allowed = routeAccess[key]
  return allowed ? allowed.includes(role) : false
}

export function normalizePath(path: string): AppPath {
  const base = path.split('?')[0].replace(/\/+$/, '') || '/'
  switch (base) {
    case '/':
      return '/'
    case '/report':
    case '/settings':
    case '/map':
    case '/resources':
    case '/weather':
    case '/incidents':
    case '/assignments':
    case '/commander':
    case '/reports':
    case '/analytics':
    case '/search':
    case '/admin':
    case '/demo':
      return base
    default:
      return '/' as AppPath
  }
}

export function defaultPathForRole(role: Role | null | undefined): AppPath {
  if (!role) return '/report'
  if (adminRoles.includes(role)) return '/'
  if (leaderRoles.includes(role)) return '/'
  if (responderRoles.includes(role)) return '/'
  return '/'
}


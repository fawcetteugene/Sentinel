import { useQuery } from '@tanstack/react-query'
import { api } from './api'

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  incidents: ['incidents'] as const,
  resources: ['resources'] as const,
  analytics: ['analytics'] as const,
  commander: ['commander'] as const,
  assignments: ['assignments'] as const,
  reports: ['reports'] as const,
  notifications: ['notifications'] as const,
  adminOverview: ['adminOverview'] as const,
  adminUsers: ['adminUsers'] as const,
  adminAuditLogs: ['adminAuditLogs'] as const,
  missionControl: ['missionControl'] as const,
  simulationState: ['simulationState'] as const,
  weather: ['weather'] as const,
  weatherTimeline: ['weatherTimeline'] as const,
  roadClosures: ['roadClosures'] as const,
  timelineEvents: ['timelineEvents'] as const,
  systemHealth: ['systemHealth'] as const,
  simulationWorld: ['simulationWorld'] as const,
}

export function useDashboardQuery() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: api.dashboard })
}

export function useIncidentsQuery() {
  return useQuery({ queryKey: queryKeys.incidents, queryFn: api.incidents })
}

export function useResourcesQuery() {
  return useQuery({ queryKey: queryKeys.resources, queryFn: api.resources })
}

export function useAnalyticsQuery() {
  return useQuery({ queryKey: queryKeys.analytics, queryFn: api.analytics })
}

export function useCommanderQuery() {
  return useQuery({ queryKey: queryKeys.commander, queryFn: api.commanderBriefing })
}

export function useAssignmentsQuery() {
  return useQuery({ queryKey: queryKeys.assignments, queryFn: api.assignments })
}

export function useReportsQuery() {
  return useQuery({ queryKey: queryKeys.reports, queryFn: api.reports })
}

export function useNotificationsQuery() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: api.notifications })
}

export function useAdminOverviewQuery() {
  return useQuery({ queryKey: queryKeys.adminOverview, queryFn: api.adminOverview })
}

export function useAdminUsersQuery() {
  return useQuery({ queryKey: queryKeys.adminUsers, queryFn: api.adminUsers })
}

export function useAdminAuditLogsQuery() {
  return useQuery({ queryKey: queryKeys.adminAuditLogs, queryFn: api.adminAuditLogs })
}

export function useMissionControlQuery() {
  return useQuery({ queryKey: queryKeys.missionControl, queryFn: api.missionControl, refetchInterval: 5000 })
}

export function useSimulationStateQuery() {
  return useQuery({ queryKey: queryKeys.simulationState, queryFn: api.simulationState, refetchInterval: 2000 })
}

export function useCurrentWeatherQuery() {
  return useQuery({ queryKey: queryKeys.weather, queryFn: api.currentWeather, refetchInterval: 2000 })
}

export function useWeatherTimelineQuery() {
  return useQuery({ queryKey: queryKeys.weatherTimeline, queryFn: api.weatherTimeline, refetchInterval: 2500 })
}

export function useRoadClosuresQuery() {
  return useQuery({ queryKey: queryKeys.roadClosures, queryFn: api.roadClosures, refetchInterval: 2500 })
}

export function useTimelineEventsQuery() {
  return useQuery({ queryKey: queryKeys.timelineEvents, queryFn: api.timelineEvents, refetchInterval: 2000 })
}

export function useSystemHealthQuery() {
  return useQuery({ queryKey: queryKeys.systemHealth, queryFn: api.systemHealth, refetchInterval: 2000 })
}

export function useSimulationWorldQuery() {
  return useQuery({ queryKey: queryKeys.simulationWorld, queryFn: api.simulationWorld, refetchInterval: 2000 })
}

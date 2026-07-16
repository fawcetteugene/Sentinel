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


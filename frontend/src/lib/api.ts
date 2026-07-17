import type {
  AICommanderResponse,
  AdminOverview,
  AnalyticsSummary,
  Assignment,
  AuditLog,
  DashboardSummary,
  Incident,
  IncidentAnalysis,
  MissionControlSummary,
  Notification,
  Resource,
  RoadClosure,
  SearchResponse,
  SimulationState,
  SimulationWorldSnapshot,
  SystemHealthSnapshot,
  TimelineEvent,
  User,
  UserUpdatePayload,
  WeatherSnapshot,
  PublicIncidentReport,
} from '@/types'
import { clearToken, getToken } from './auth'

const API_BASE = '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  if (!response.ok) {
    if (response.status === 401) clearToken()
    throw new Error(await response.text())
  }
  return response.json() as Promise<T>
}

async function rawRequest(path: string, init: RequestInit = {}) {
  const token = getToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  if (!response.ok) {
    if (response.status === 401) clearToken()
    throw new Error(await response.text())
  }
  return response
}

export const api = {
  login: (identifier: string, secret: string) =>
    request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, secret }) }),
  me: () => request<User>('/auth/me'),
  updateMe: (payload: UserUpdatePayload) => request<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  dashboard: () => request<DashboardSummary>('/dashboard/summary'),
  analytics: () => request<AnalyticsSummary>('/dashboard/analytics'),
  commander: () => request<AICommanderResponse>('/dashboard/commander'),
  missionControl: () => request<MissionControlSummary>('/dashboard/mission-control'),
  incidents: () => request<Incident[]>('/incidents'),
  publicIncidentReport: (payload: PublicIncidentReport) =>
    request<Incident>('/incidents/public/report', { method: 'POST', body: JSON.stringify(payload) }),
  createIncident: (payload: Record<string, unknown>) =>
    request<Incident>('/incidents', { method: 'POST', body: JSON.stringify(payload) }),
  updateIncident: (id: number, payload: Record<string, unknown>) =>
    request<Incident>(`/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  analyzeIncident: (id: number) => request<IncidentAnalysis>(`/incidents/${id}/analyze`, { method: 'POST' }),
  replayIncident: (id: number) => request<{ timestamp: string; label: string; narrative: string; severity: string }[]>(`/incidents/${id}/replay`),
  resources: () => request<Resource[]>('/resources'),
  createResource: (payload: Record<string, unknown>) =>
    request<Resource>('/resources', { method: 'POST', body: JSON.stringify(payload) }),
  assignments: () => request<Assignment[]>('/assignments'),
  createAssignment: (payload: Record<string, unknown>) =>
    request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(payload) }),
  reports: () => request<{ id: number; title: string; summary: string; kind: string; created_at: string }[]>('/reports'),
  notifications: () => request<Notification[]>('/notifications'),
  commanderBriefing: () => request<AICommanderResponse>('/dashboard/commander'),
  adminOverview: () => request<AdminOverview>('/admin/overview'),
  adminUsers: () => request<User[]>('/admin/users'),
  adminAuditLogs: () => request<AuditLog[]>('/admin/audit-logs'),
  updateUser: (id: number, payload: Record<string, unknown>) =>
    request<User>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  autoDispatch: (limit = 3) => request<Assignment[]>(`/assignments/auto-dispatch?limit=${limit}`, { method: 'POST' }),
  search: (query: string, kind?: string | null) => request<SearchResponse>(`/search?query=${encodeURIComponent(query)}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`),
  simulationState: () => request<SimulationState>('/simulation/state'),
  simulationStart: () => request<SimulationState>('/simulation/start', { method: 'POST' }),
  simulationStop: () => request<SimulationState>('/simulation/stop', { method: 'POST' }),
  simulationStep: () =>
    request<{ state: SimulationState; weather: WeatherSnapshot | null; created_incident_ids: number[]; world: SimulationWorldSnapshot | null }>('/simulation/step', {
      method: 'POST',
    }),
  simulationReset: () => request<SimulationState>('/simulation/reset', { method: 'POST' }),
  simulationScenario: (scenarioName: string) => request<SimulationState>(`/simulation/scenario/${encodeURIComponent(scenarioName)}`, { method: 'POST' }),
  simulationSpeed: (multiplier: number) => request<SimulationState>(`/simulation/speed/${multiplier}`, { method: 'POST' }),
  currentWeather: () => request<WeatherSnapshot | null>('/simulation/weather/current'),
  weatherTimeline: () => request<WeatherSnapshot[]>('/simulation/weather/timeline'),
  roadClosures: () => request<RoadClosure[]>('/simulation/closures'),
  timelineEvents: () => request<TimelineEvent[]>('/simulation/timeline'),
  systemHealth: () => request<SystemHealthSnapshot>('/simulation/health'),
  simulationWorld: () => request<SimulationWorldSnapshot | null>('/simulation/world'),
  exportReports: async (format: 'csv' | 'pdf', kind?: string | null) => {
    const path = `/reports/export?format=${format}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`
    const response = await rawRequest(path)
    return response.blob()
  },
}

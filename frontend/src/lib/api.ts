import type {
  AICommanderResponse,
  AnalyticsSummary,
  Assignment,
  DashboardSummary,
  Incident,
  IncidentAnalysis,
  Notification,
  Resource,
  User,
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

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/auth/me'),
  dashboard: () => request<DashboardSummary>('/dashboard/summary'),
  analytics: () => request<AnalyticsSummary>('/dashboard/analytics'),
  commander: () => request<AICommanderResponse>('/dashboard/commander'),
  incidents: () => request<Incident[]>('/incidents'),
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
}


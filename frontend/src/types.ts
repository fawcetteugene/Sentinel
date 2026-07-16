export type Role =
  | 'incident_commander'
  | 'dispatcher'
  | 'field_responder'
  | 'administrator'

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical'
export type IncidentStatus = 'new' | 'triaged' | 'dispatched' | 'responding' | 'contained' | 'resolved' | 'closed'
export type HazardType = 'flood' | 'fire' | 'earthquake' | 'road_accident' | 'medical' | 'hazmat' | 'security' | 'other'
export type ResourceStatus = 'available' | 'busy' | 'offline' | 'maintenance'
export type ResourceKind =
  | 'fire_truck'
  | 'ambulance'
  | 'police_vehicle'
  | 'medical_team'
  | 'volunteer'
  | 'helicopter'
  | 'fuel'
  | 'medical_supplies'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  phone_number?: string | null
  badge_id?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_on_duty: boolean
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: number
  kind: string
  url: string
  filename?: string | null
  mime_type?: string | null
  created_at: string
}

export interface Incident {
  id: number
  title: string
  description: string
  latitude: number
  longitude: number
  severity: IncidentSeverity
  hazard_type: HazardType
  number_of_people: number
  status: IncidentStatus
  assigned_team?: string | null
  created_at: string
  updated_at: string
  created_by_id?: number | null
  analysis?: Record<string, unknown> | null
  severity_score?: number | null
  priority?: string | null
  estimated_response_time_minutes?: number | null
  risk_level?: string | null
  suggested_action_plan?: string[] | null
  recommended_resources?: string[] | null
  escalation_probability?: number | null
  ai_summary?: string | null
  attachments: Attachment[]
}

export interface Resource {
  id: number
  name: string
  kind: ResourceKind
  status: ResourceStatus
  quantity: number
  capacity?: number | null
  unit_name?: string | null
  latitude?: number | null
  longitude?: number | null
  assigned_to_incident_id?: number | null
  notes?: string | null
  eta_minutes?: number | null
  fuel_level?: number | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: number
  incident_id: number
  assignee_id: number
  mission: string
  location: string
  priority: string
  eta_minutes: number
  instructions: string
  status: string
  completed_at?: string | null
  created_at: string
}

export interface Notification {
  id: number
  title: string
  body: string
  severity: string
  read_at?: string | null
  action_url?: string | null
  created_at: string
}

export interface DashboardSummary {
  total_active_incidents: number
  critical_incidents: number
  available_responders: number
  hospitals: number
  shelters: number
  fire_stations: number
  police_units: number
  ambulances: number
  recent_alerts: Notification[]
  live_incidents: Incident[]
  ai_recommendations: string[]
}

export interface AnalyticsPoint {
  label: string
  value: number
}

export interface AnalyticsSummary {
  incidents_over_time: AnalyticsPoint[]
  response_time: AnalyticsPoint[]
  resource_utilization: AnalyticsPoint[]
  severity_distribution: AnalyticsPoint[]
  mission_completion_rate: AnalyticsPoint[]
}

export interface IncidentAnalysis {
  severity_score: number
  priority: string
  recommended_resources: string[]
  estimated_response_time_minutes: number
  risk_level: string
  suggested_action_plan: string[]
  escalation_probability: number
  explanation: string
}

export interface AICommanderResponse {
  summary: string
  priorities: string[]
  responder_allocation: string[]
  action_plan: string[]
  resource_shortages: string[]
  escalation_forecast: string
  evacuation_advice: string
  situation_report: string
  explanation: string[]
}

export interface OperationalEvent {
  type: 'incident' | 'resource' | 'assignment' | 'message' | 'notification'
  message: string
  payload: Record<string, unknown>
  created_at: string
}


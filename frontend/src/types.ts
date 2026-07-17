export type Role =
  | 'public_user'
  | 'community_volunteer'
  | 'community_leader'
  | 'county_admin'
  | 'incident_commander'
  | 'dispatcher'
  | 'field_responder'
  | 'administrator'

export type IncidentSeverity = 'low' | 'moderate' | 'high' | 'critical'
export type IncidentStatus = 'new' | 'triaged' | 'dispatched' | 'responding' | 'contained' | 'resolved' | 'closed'
export type HazardType =
  | 'flood'
  | 'river_overflow'
  | 'fire'
  | 'earthquake'
  | 'road_accident'
  | 'boat_accident'
  | 'medical'
  | 'hazmat'
  | 'security'
  | 'missing_child'
  | 'missing_elderly'
  | 'snake_bite'
  | 'landslide'
  | 'collapsed_bridge'
  | 'heavy_rain'
  | 'water_shortage'
  | 'disease_outbreak'
  | 'electric_pole_down'
  | 'tree_blocking_road'
  | 'livestock_disease'
  | 'other'
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
  | 'hospital'
  | 'shelter'
  | 'fire_station'
  | 'police_station'
  | 'boat'
  | 'rescue_boat'
  | 'water'
  | 'water_tank'
  | 'food'
  | 'food_store'
  | 'generator'
  | 'tent'
  | 'satellite_phone'
  | 'drone'
  | 'church'
  | 'mosque'
  | 'school'
  | 'community_hall'
  | 'bodaboda'
  | 'private_vehicle'
  | 'community_kitchen'
  | 'tractor'
  | 'clinic'

export type WeatherCondition = 'clear' | 'rain' | 'storm' | 'wind' | 'fog' | 'heatwave' | 'thunderstorm'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  phone_number?: string | null
  username?: string | null
  village?: string | null
  skills?: string[] | null
  badge_id?: string | null
  avatar_url?: string | null
  is_active: boolean
  is_on_duty: boolean
  created_at: string
  updated_at: string
}

export interface UserUpdatePayload {
  full_name?: string | null
  username?: string | null
  phone_number?: string | null
  village?: string | null
  skills?: string[] | null
  badge_id?: string | null
  avatar_url?: string | null
  is_active?: boolean | null
  is_on_duty?: boolean | null
}

export interface AuditLog {
  id: number
  actor_id?: number | null
  action: string
  entity_type: string
  entity_id?: number | null
  severity: string
  details?: Record<string, unknown> | null
  created_at: string
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
  people_safe: number
  people_missing: number
  families_displaced: number
  shelters_open: number
  roads_closed: number
  volunteers_active: number
  community_resources_available: number
  medical_supplies: number
  clean_water: number
  food_stocks: number
  weather_alerts: number
  high_risk_villages: number
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

export interface MissionAction {
  incident_id: number
  incident_title: string
  responder_id?: number | null
  responder_name?: string | null
  resource_name?: string | null
  priority: string
  eta_minutes: number
  instructions: string
  explanation: string
}

export interface PublicIncidentReport {
  what_happened: string
  where: string
  need_help_immediately: boolean
  share_gps: boolean
  latitude?: number | null
  longitude?: number | null
  incident_type: HazardType
  photo_urls: string[]
  voice_note_urls: string[]
  reporter_name?: string | null
  reporter_phone?: string | null
}

export interface MissionControlSummary {
  summary: string
  priorities: string[]
  available_responders: number
  available_vehicles: number
  critical_incidents: number
  weather_summary?: string | null
  recommended_actions: MissionAction[]
  operational_notes: string[]
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

export interface AdminOverview {
  total_users: number
  active_users: number
  inactive_users: number
  administrators: number
  commanders: number
  dispatchers: number
  responders: number
  open_incidents: number
  critical_incidents: number
  available_resources: number
  audit_events_24h: number
}

export interface OperationalEvent {
  type: 'incident' | 'resource' | 'assignment' | 'message' | 'notification' | 'weather' | 'system' | 'timeline' | 'world'
  message: string
  payload: Record<string, unknown>
  created_at: string
}

export interface SimulationState {
  id: number
  scenario_name: string
  seed: number
  tick: number
  is_running: boolean
  tick_interval_seconds: number
  last_tick_at?: string | null
  created_at: string
  updated_at: string
}

export interface WeatherSnapshot {
  id: number
  condition: WeatherCondition
  temperature_c: number
  humidity_percent: number
  wind_kph: number
  rain_mm: number
  lightning_risk: number
  flood_warning: boolean
  heatwave_warning: boolean
  visibility_km: number
  summary: string
  created_at: string
}

export interface RoadClosure {
  id: number
  title: string
  latitude: number
  longitude: number
  reason: string
  severity: string
  is_active: boolean
  created_at: string
}

export interface SystemHealthSnapshot {
  id: number
  server_status: string
  database_status: string
  websocket_status: string
  simulation_status: string
  memory_usage_mb: number
  cpu_usage_percent: number
  open_connections: number
  created_at: string
}

export interface TimelineEvent {
  id: number
  category: string
  title: string
  narrative: string
  severity: string
  payload?: Record<string, unknown> | null
  created_at: string
}

export interface WorldPoint {
  latitude: number
  longitude: number
}

export interface WorldLocation {
  id: string
  name: string
  kind: string
  category: string
  latitude: number
  longitude: number
  severity?: string | null
  status?: string | null
  note?: string | null
  path: WorldPoint[]
}

export interface WorldActor {
  id: string
  name: string
  kind: string
  status: string
  latitude: number
  longitude: number
  destination?: WorldPoint | null
  destination_name?: string | null
  speed_kph: number
  eta_minutes?: number | null
  fuel_level?: number | null
  health?: number | null
  crew?: number | null
  mission?: string | null
  vehicle?: string | null
  equipment: string[]
}

export interface WorldFacility {
  id: string
  name: string
  kind: string
  latitude: number
  longitude: number
  capacity?: number | null
  occupancy?: number | null
  available_beds?: number | null
  doctors_available?: number | null
  incoming_patients?: number | null
  food?: number | null
  water?: number | null
  medicine?: number | null
  power?: number | null
  security?: string | null
  alert_level?: string | null
}

export interface WorldZone {
  id: string
  name: string
  kind: string
  severity: string
  status: string
  latitude: number
  longitude: number
  radius_m: number
  growth_rate: number
  opacity: number
  points: WorldPoint[]
}

export interface WorldMission {
  id: string
  incident_id?: number | null
  incident_title: string
  title: string
  priority: string
  assigned_team: string
  vehicle?: string | null
  status: string
  progress_percent: number
  eta_minutes?: number | null
  activity: string
  completion_time?: string | null
  explanation: string
}

export interface SimulationWorldSnapshot {
  scenario_name: string
  tick: number
  is_running: boolean
  briefing: string
  commands: string[]
  metrics: Record<string, unknown>
  world_locations: WorldLocation[]
  responders: WorldActor[]
  vehicles: WorldActor[]
  facilities: WorldFacility[]
  zones: WorldZone[]
  missions: WorldMission[]
  timeline: TimelineEvent[]
  weather?: WeatherSnapshot | null
  created_at?: string | null
  updated_at?: string | null
}

export interface SearchResult {
  entity_type: string
  entity_id: number
  title: string
  subtitle: string
  severity?: string | null
  status?: string | null
  url?: string | null
  created_at?: string | null
}

export interface SearchResponse {
  query: string
  total: number
  results: SearchResult[]
}

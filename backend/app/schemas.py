"""Pydantic schemas for Sentinel AI API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import (
    HazardType,
    IncidentSeverity,
    IncidentStatus,
    MessageKind,
    ReportKind,
    ResourceKind,
    ResourceStatus,
    WeatherCondition,
)
from app.core.security import Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Role
    username: str | None = None
    phone_number: str | None = None
    village: str | None = None
    skills: list[str] | None = None
    badge_id: str | None = None
    avatar_url: str | None = None
    is_active: bool = True
    is_on_duty: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    full_name: str | None = None
    username: str | None = None
    phone_number: str | None = None
    village: str | None = None
    skills: list[str] | None = None
    badge_id: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None
    is_on_duty: bool | None = None


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    identifier: str | None = None
    secret: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    phone_number: str | None = None
    pin: str | None = None
    username: str | None = None


class PublicIncidentReportCreate(BaseModel):
    what_happened: str
    where: str
    need_help_immediately: bool = False
    share_gps: bool = False
    latitude: float | None = None
    longitude: float | None = None
    incident_type: HazardType = HazardType.OTHER
    photo_urls: list[str] = Field(default_factory=list)
    voice_note_urls: list[str] = Field(default_factory=list)
    reporter_name: str | None = None
    reporter_phone: str | None = None


class LocationRead(BaseModel):
    id: int
    label: str
    latitude: float
    longitude: float
    address: str | None = None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AttachmentRead(BaseModel):
    id: int
    kind: str
    url: str
    filename: str | None = None
    mime_type: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentAnalysis(BaseModel):
    severity_score: int
    priority: str
    recommended_resources: list[str]
    estimated_response_time_minutes: int
    risk_level: str
    suggested_action_plan: list[str]
    escalation_probability: float
    explanation: str


class IncidentBase(BaseModel):
    title: str
    description: str
    latitude: float
    longitude: float
    severity: IncidentSeverity
    hazard_type: HazardType
    number_of_people: int = 0
    status: IncidentStatus = IncidentStatus.NEW
    assigned_team: str | None = None


class IncidentCreate(IncidentBase):
    image_urls: list[str] = Field(default_factory=list)
    voice_note_urls: list[str] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: IncidentSeverity | None = None
    hazard_type: HazardType | None = None
    number_of_people: int | None = None
    status: IncidentStatus | None = None
    assigned_team: str | None = None


class IncidentRead(IncidentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by_id: int | None = None
    analysis: dict[str, Any] | None = None
    severity_score: int | None = None
    priority: str | None = None
    estimated_response_time_minutes: int | None = None
    risk_level: str | None = None
    suggested_action_plan: list[str] | None = None
    recommended_resources: list[str] | None = None
    escalation_probability: float | None = None
    ai_summary: str | None = None
    attachments: list[AttachmentRead] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ResourceBase(BaseModel):
    name: str
    kind: ResourceKind
    status: ResourceStatus = ResourceStatus.AVAILABLE
    quantity: int = 1
    capacity: int | None = None
    unit_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None
    eta_minutes: int | None = None
    fuel_level: int | None = None


class ResourceCreate(ResourceBase):
    pass


class ResourceRead(ResourceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assigned_to_incident_id: int | None = None

    model_config = {"from_attributes": True}


class AssignmentBase(BaseModel):
    incident_id: int
    assignee_id: int
    mission: str
    location: str
    priority: str
    eta_minutes: int
    instructions: str


class AssignmentCreate(AssignmentBase):
    pass


class AssignmentRead(AssignmentBase):
    id: int
    status: str
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReportBase(BaseModel):
    incident_id: int | None = None
    kind: ReportKind
    title: str
    summary: str
    content: str
    pdf_url: str | None = None


class ReportCreate(ReportBase):
    pass


class ReportRead(ReportBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    incident_id: int | None = None
    recipient_id: int | None = None
    kind: MessageKind = MessageKind.LOG
    body: str
    metadata: dict[str, Any] | None = None


class MessageRead(MessageCreate):
    id: int
    sender_id: int | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationRead(BaseModel):
    id: int
    title: str
    body: str
    severity: str
    read_at: datetime | None = None
    action_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: int
    actor_id: int | None = None
    action: str
    entity_type: str
    entity_id: int | None = None
    severity: str
    details: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminOverview(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    administrators: int
    commanders: int
    dispatchers: int
    responders: int
    open_incidents: int
    critical_incidents: int
    available_resources: int
    audit_events_24h: int


class DashboardSummary(BaseModel):
    people_safe: int = 0
    people_missing: int = 0
    families_displaced: int = 0
    shelters_open: int = 0
    roads_closed: int = 0
    volunteers_active: int = 0
    community_resources_available: int = 0
    medical_supplies: int = 0
    clean_water: int = 0
    food_stocks: int = 0
    weather_alerts: int = 0
    high_risk_villages: int = 0
    total_active_incidents: int = 0
    critical_incidents: int = 0
    available_responders: int = 0
    hospitals: int = 0
    shelters: int = 0
    fire_stations: int = 0
    police_units: int = 0
    ambulances: int = 0
    recent_alerts: list[NotificationRead] = Field(default_factory=list)
    live_incidents: list[IncidentRead] = Field(default_factory=list)
    ai_recommendations: list[str] = Field(default_factory=list)


class AnalyticsPoint(BaseModel):
    label: str
    value: float


class AnalyticsSummary(BaseModel):
    incidents_over_time: list[AnalyticsPoint]
    response_time: list[AnalyticsPoint]
    resource_utilization: list[AnalyticsPoint]
    severity_distribution: list[AnalyticsPoint]
    mission_completion_rate: list[AnalyticsPoint]


class MissionAction(BaseModel):
    incident_id: int
    incident_title: str
    responder_id: int | None = None
    responder_name: str | None = None
    resource_name: str | None = None
    priority: str
    eta_minutes: int
    instructions: str
    explanation: str


class MissionControlSummary(BaseModel):
    summary: str
    priorities: list[str]
    available_responders: int
    available_vehicles: int
    critical_incidents: int
    weather_summary: str | None = None
    recommended_actions: list[MissionAction] = Field(default_factory=list)
    operational_notes: list[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    entity_type: str
    entity_id: int
    title: str
    subtitle: str
    severity: str | None = None
    status: str | None = None
    url: str | None = None
    created_at: datetime | None = None


class SearchResponse(BaseModel):
    query: str
    total: int
    results: list[SearchResult]


class OperationalEvent(BaseModel):
    type: Literal["incident", "resource", "assignment", "message", "notification", "weather", "system", "timeline", "world"]
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class AICommanderResponse(BaseModel):
    summary: str
    priorities: list[str]
    responder_allocation: list[str]
    action_plan: list[str]
    resource_shortages: list[str]
    escalation_forecast: str
    evacuation_advice: str
    situation_report: str
    explanation: list[str]


class IncidentReplayPoint(BaseModel):
    timestamp: datetime
    label: str
    narrative: str
    severity: IncidentSeverity


class SimulationStateRead(BaseModel):
    id: int
    scenario_name: str
    seed: int
    tick: int
    is_running: bool
    tick_interval_seconds: int
    last_tick_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WeatherSnapshotRead(BaseModel):
    id: int
    condition: WeatherCondition
    temperature_c: float
    humidity_percent: int
    wind_kph: int
    rain_mm: float
    lightning_risk: int
    flood_warning: bool
    heatwave_warning: bool
    visibility_km: float
    summary: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RoadClosureRead(BaseModel):
    id: int
    title: str
    latitude: float
    longitude: float
    reason: str
    severity: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SystemHealthRead(BaseModel):
    id: int
    server_status: str
    database_status: str
    websocket_status: str
    simulation_status: str
    memory_usage_mb: int
    cpu_usage_percent: int
    open_connections: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WorldPoint(BaseModel):
    latitude: float
    longitude: float


class WorldLocationRead(BaseModel):
    id: str
    name: str
    kind: str
    category: str
    latitude: float
    longitude: float
    severity: str | None = None
    status: str | None = None
    note: str | None = None
    path: list[WorldPoint] = Field(default_factory=list)


class WorldActorRead(BaseModel):
    id: str
    name: str
    kind: str
    status: str
    latitude: float
    longitude: float
    destination: WorldPoint | None = None
    destination_name: str | None = None
    speed_kph: float
    eta_minutes: int | None = None
    fuel_level: int | None = None
    health: int | None = None
    crew: int | None = None
    mission: str | None = None
    vehicle: str | None = None
    equipment: list[str] = Field(default_factory=list)


class WorldFacilityRead(BaseModel):
    id: str
    name: str
    kind: str
    latitude: float
    longitude: float
    capacity: int | None = None
    occupancy: int | None = None
    available_beds: int | None = None
    doctors_available: int | None = None
    incoming_patients: int | None = None
    food: int | None = None
    water: int | None = None
    medicine: int | None = None
    power: int | None = None
    security: str | None = None
    alert_level: str | None = None


class WorldZoneRead(BaseModel):
    id: str
    name: str
    kind: str
    severity: str
    status: str
    latitude: float
    longitude: float
    radius_m: int
    growth_rate: float
    opacity: float
    points: list[WorldPoint] = Field(default_factory=list)


class WorldMissionRead(BaseModel):
    id: str
    incident_id: int | None = None
    incident_title: str
    title: str
    priority: str
    assigned_team: str
    vehicle: str | None = None
    status: str
    progress_percent: int
    eta_minutes: int | None = None
    activity: str
    completion_time: str | None = None
    explanation: str


class SimulationWorldRead(BaseModel):
    scenario_name: str
    tick: int
    is_running: bool
    briefing: str
    commands: list[str] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)
    world_locations: list[WorldLocationRead] = Field(default_factory=list)
    responders: list[WorldActorRead] = Field(default_factory=list)
    vehicles: list[WorldActorRead] = Field(default_factory=list)
    facilities: list[WorldFacilityRead] = Field(default_factory=list)
    zones: list[WorldZoneRead] = Field(default_factory=list)
    missions: list[WorldMissionRead] = Field(default_factory=list)
    timeline: list[TimelineEventRead] = Field(default_factory=list)
    weather: WeatherSnapshotRead | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class TimelineEventRead(BaseModel):
    id: int
    category: str
    title: str
    narrative: str
    severity: str
    payload: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

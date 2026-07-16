"""Pydantic schemas for Sentinel AI API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import HazardType, IncidentSeverity, IncidentStatus, MessageKind, ReportKind, ResourceKind, ResourceStatus
from app.core.security import Role


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Role
    phone_number: str | None = None
    badge_id: str | None = None
    avatar_url: str | None = None
    is_active: bool = True
    is_on_duty: bool = True


class UserCreate(UserBase):
    password: str = Field(min_length=8)


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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


class DashboardSummary(BaseModel):
    total_active_incidents: int
    critical_incidents: int
    available_responders: int
    hospitals: int
    shelters: int
    fire_stations: int
    police_units: int
    ambulances: int
    recent_alerts: list[NotificationRead]
    live_incidents: list[IncidentRead]
    ai_recommendations: list[str]


class AnalyticsPoint(BaseModel):
    label: str
    value: float


class AnalyticsSummary(BaseModel):
    incidents_over_time: list[AnalyticsPoint]
    response_time: list[AnalyticsPoint]
    resource_utilization: list[AnalyticsPoint]
    severity_distribution: list[AnalyticsPoint]
    mission_completion_rate: list[AnalyticsPoint]


class OperationalEvent(BaseModel):
    type: Literal["incident", "resource", "assignment", "message", "notification"]
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

"""Enum types used across the domain model."""

from enum import StrEnum


class IncidentSeverity(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(StrEnum):
    NEW = "new"
    TRIAGED = "triaged"
    DISPATCHED = "dispatched"
    RESPONDING = "responding"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"


class HazardType(StrEnum):
    FLOOD = "flood"
    FIRE = "fire"
    EARTHQUAKE = "earthquake"
    ROAD_ACCIDENT = "road_accident"
    MEDICAL = "medical"
    HAZMAT = "hazmat"
    SECURITY = "security"
    OTHER = "other"


class ResourceStatus(StrEnum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class ResourceKind(StrEnum):
    FIRE_TRUCK = "fire_truck"
    AMBULANCE = "ambulance"
    POLICE_VEHICLE = "police_vehicle"
    MEDICAL_TEAM = "medical_team"
    VOLUNTEER = "volunteer"
    HELICOPTER = "helicopter"
    FUEL = "fuel"
    MEDICAL_SUPPLIES = "medical_supplies"


class MessageKind(StrEnum):
    SYSTEM = "system"
    ALERT = "alert"
    DIRECT = "direct"
    LOG = "log"


class ReportKind(StrEnum):
    INCIDENT = "incident_report"
    DAILY = "daily_situation"
    EMERGENCY = "emergency_summary"
    RESOURCE = "resource_usage"


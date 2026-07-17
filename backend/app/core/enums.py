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
    RIVER_OVERFLOW = "river_overflow"
    FIRE = "fire"
    EARTHQUAKE = "earthquake"
    ROAD_ACCIDENT = "road_accident"
    BOAT_ACCIDENT = "boat_accident"
    MEDICAL = "medical"
    HAZMAT = "hazmat"
    SECURITY = "security"
    MISSING_CHILD = "missing_child"
    MISSING_ELDERLY = "missing_elderly"
    SNAKE_BITE = "snake_bite"
    LANDSLIDE = "landslide"
    COLLAPSED_BRIDGE = "collapsed_bridge"
    HEAVY_RAIN = "heavy_rain"
    WATER_SHORTAGE = "water_shortage"
    DISEASE_OUTBREAK = "disease_outbreak"
    ELECTRIC_POLE_DOWN = "electric_pole_down"
    TREE_BLOCKING_ROAD = "tree_blocking_road"
    LIVESTOCK_DISEASE = "livestock_disease"
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
    HOSPITAL = "hospital"
    SHELTER = "shelter"
    FIRE_STATION = "fire_station"
    POLICE_STATION = "police_station"
    BOAT = "boat"
    RESCUE_BOAT = "rescue_boat"
    WATER = "water"
    WATER_TANK = "water_tank"
    FOOD = "food"
    FOOD_STORE = "food_store"
    GENERATOR = "generator"
    TENT = "tent"
    SATELLITE_PHONE = "satellite_phone"
    DRONE = "drone"
    CHURCH = "church"
    MOSQUE = "mosque"
    SCHOOL = "school"
    COMMUNITY_HALL = "community_hall"
    BODABODA = "bodaboda"
    PRIVATE_VEHICLE = "private_vehicle"
    COMMUNITY_KITCHEN = "community_kitchen"
    TRACTOR = "tractor"
    CLINIC = "clinic"


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


class WeatherCondition(StrEnum):
    CLEAR = "clear"
    RAIN = "rain"
    STORM = "storm"
    WIND = "wind"
    FOG = "fog"
    HEATWAVE = "heatwave"
    THUNDERSTORM = "thunderstorm"

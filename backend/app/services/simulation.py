"""Deterministic simulation engine for weather, closures, and operational drift."""

from __future__ import annotations

import math
import random
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.enums import HazardType, IncidentSeverity, IncidentStatus, ResourceKind, ResourceStatus, WeatherCondition
from app.core.security import Role
from app.models import (
    AuditLog,
    Incident,
    Location,
    Notification,
    Resource,
    RoadClosure,
    SimulationState,
    SimulationWorldSnapshot,
    SystemHealthSnapshot,
    TimelineEvent,
    User,
    WeatherSnapshot,
)
from app.realtime.manager import broadcaster
from app.schemas import IncidentAnalysis
from app.services.ai import AIContext, AIIncidentCommander


class SimulationService:
    """Offline simulation engine that mutates local demo data over time."""

    def __init__(self, db: Session):
        self.db = db
        self.ai = AIIncidentCommander()

    def ensure_state(self) -> SimulationState:
        state = self.db.scalar(select(SimulationState).order_by(SimulationState.id.asc()))
        if state:
            return state
        state = SimulationState()
        self.db.add(state)
        self.db.commit()
        self.db.refresh(state)
        return state

    def current_state(self) -> SimulationState:
        return self.ensure_state()

    def current_weather(self) -> WeatherSnapshot | None:
        stmt = select(WeatherSnapshot).order_by(desc(WeatherSnapshot.created_at)).limit(1)
        return self.db.scalar(stmt)

    def weather_timeline(self, limit: int = 24) -> list[WeatherSnapshot]:
        stmt = select(WeatherSnapshot).order_by(desc(WeatherSnapshot.created_at)).limit(limit)
        return list(self.db.scalars(stmt))

    def timeline(self, limit: int = 60) -> list[TimelineEvent]:
        stmt = select(TimelineEvent).order_by(desc(TimelineEvent.created_at)).limit(limit)
        return list(self.db.scalars(stmt))

    def road_closures(self) -> list[RoadClosure]:
        stmt = select(RoadClosure).order_by(desc(RoadClosure.is_active), desc(RoadClosure.created_at))
        return list(self.db.scalars(stmt))

    def system_health(self) -> SystemHealthSnapshot:
        state = self.ensure_state()
        open_connections = len(broadcaster.connections)
        memory_usage = 512 + (state.tick % 12) * 18 + open_connections * 3
        cpu_usage = 18 + (state.tick * 7) % 48
        simulation_status = "running" if state.is_running else "paused"
        snapshot = SystemHealthSnapshot(
            server_status="online",
            database_status="online",
            websocket_status="online" if open_connections > 0 else "idle",
            simulation_status=simulation_status,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=cpu_usage,
            open_connections=open_connections,
        )
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def step(self) -> dict[str, Any]:
        state = self.ensure_state()
        seed_value = state.seed + state.tick
        rng = random.Random(seed_value)

        state.tick += 1
        state.last_tick_at = datetime.now(timezone.utc)

        weather = self._generate_weather(rng, state.tick, state.scenario_name)
        self.db.add(weather)
        self.db.flush()

        created_incidents: list[int] = []
        if self._should_create_incident(rng, state.tick, weather, state.scenario_name):
            incident = self._generate_incident(rng, weather, state.tick, state.scenario_name)
            self.db.add(incident)
            self.db.flush()
            location = Location(
                label=incident.title,
                latitude=incident.latitude,
                longitude=incident.longitude,
                source="simulation",
                incident_id=incident.id,
            )
            self.db.add(location)
            self._record_event(
                category="incident",
                title=f"Incident generated: {incident.title}",
                narrative=f"A new {incident.hazard_type.value} incident was generated during simulation tick {state.tick}.",
                severity=incident.severity.value,
                payload={"incident_id": incident.id},
            )
            created_incidents.append(incident.id)
            self._apply_ai_analysis(incident, weather)
            self.db.flush()
            notification = Notification(
                user_id=self._default_notification_user_id(),
                title=f"New incident: {incident.title}",
                body=f"Simulation generated a {incident.severity.value} {incident.hazard_type.value} incident.",
                severity="critical" if incident.severity == IncidentSeverity.CRITICAL else "warning",
                action_url=f"/incidents/{incident.id}",
            )
            self.db.add(notification)
            broadcaster.publish("incident", f"New simulated incident: {incident.title}", {"incident_id": incident.id})

        self._advance_incident_lifecycle(rng, weather, state.tick)
        self._update_resources(rng, weather)
        self._update_closures(rng, weather, state.tick)
        self._record_timeline_from_weather(weather, state.tick)
        self._record_health_snapshot(state)
        world = self._compose_world_snapshot(state, weather, rng)
        self.db.add(self._world_snapshot_model(state, world))

        self.db.commit()
        self.db.refresh(state)

        broadcaster.publish(
            "weather",
            f"Weather updated: {weather.condition.value}",
            {"weather_snapshot_id": weather.id, "condition": weather.condition.value},
        )
        broadcaster.publish("system", "Simulation tick advanced", {"tick": state.tick})
        broadcaster.publish("world", "World snapshot refreshed", {"tick": state.tick, "scenario": state.scenario_name})

        return {
            "state": self.state_dict(state),
            "weather": self.weather_dict(weather),
            "created_incident_ids": created_incidents,
            "world": world,
        }

    def start(self) -> SimulationState:
        state = self.ensure_state()
        state.is_running = True
        self._record_event("system", "Simulation started", "The offline simulation loop is now running.", "info")
        self.db.commit()
        self.db.refresh(state)
        return state

    def stop(self) -> SimulationState:
        state = self.ensure_state()
        state.is_running = False
        self._record_event("system", "Simulation paused", "The offline simulation loop is paused.", "warning")
        self.db.commit()
        self.db.refresh(state)
        return state

    def weather_dict(self, weather: WeatherSnapshot | None) -> dict[str, Any] | None:
        if weather is None:
            return None
        return {
            "id": weather.id,
            "condition": weather.condition.value,
            "temperature_c": weather.temperature_c,
            "humidity_percent": weather.humidity_percent,
            "wind_kph": weather.wind_kph,
            "rain_mm": weather.rain_mm,
            "lightning_risk": weather.lightning_risk,
            "flood_warning": weather.flood_warning,
            "heatwave_warning": weather.heatwave_warning,
            "visibility_km": weather.visibility_km,
            "summary": weather.summary,
            "created_at": weather.created_at,
        }

    def state_dict(self, state: SimulationState) -> dict[str, Any]:
        return {
            "id": state.id,
            "scenario_name": state.scenario_name,
            "seed": state.seed,
            "tick": state.tick,
            "is_running": state.is_running,
            "tick_interval_seconds": state.tick_interval_seconds,
            "last_tick_at": state.last_tick_at,
            "created_at": state.created_at,
            "updated_at": state.updated_at,
        }

    def health_dict(self, snapshot: SystemHealthSnapshot) -> dict[str, Any]:
        return {
            "id": snapshot.id,
            "server_status": snapshot.server_status,
            "database_status": snapshot.database_status,
            "websocket_status": snapshot.websocket_status,
            "simulation_status": snapshot.simulation_status,
            "memory_usage_mb": snapshot.memory_usage_mb,
            "cpu_usage_percent": snapshot.cpu_usage_percent,
            "open_connections": snapshot.open_connections,
            "created_at": snapshot.created_at,
        }

    def timeline_dict(self, event: TimelineEvent) -> dict[str, Any]:
        return {
            "id": event.id,
            "category": event.category,
            "title": event.title,
            "narrative": event.narrative,
            "severity": event.severity,
            "payload": event.payload,
            "created_at": event.created_at,
        }

    def closure_dict(self, closure: RoadClosure) -> dict[str, Any]:
        return {
            "id": closure.id,
            "title": closure.title,
            "latitude": closure.latitude,
            "longitude": closure.longitude,
            "reason": closure.reason,
            "severity": closure.severity,
            "is_active": closure.is_active,
            "created_at": closure.created_at,
        }

    def list_closures(self) -> list[dict[str, Any]]:
        return [self.closure_dict(item) for item in self.road_closures()]

    def current_world(self) -> SimulationWorldSnapshot | None:
        stmt = select(SimulationWorldSnapshot).order_by(desc(SimulationWorldSnapshot.created_at)).limit(1)
        return self.db.scalar(stmt)

    def world_dict(self, snapshot: SimulationWorldSnapshot | None) -> dict[str, Any] | None:
        if snapshot is None:
            return None
        payload = deepcopy(snapshot.payload)
        payload.update(
            {
                "scenario_name": snapshot.scenario_name,
                "tick": snapshot.tick,
                "is_running": snapshot.is_running,
                "briefing": snapshot.briefing,
                "created_at": snapshot.created_at,
                "updated_at": snapshot.updated_at,
            }
        )
        return payload

    def reset(self, scenario_name: str | None = None) -> SimulationState:
        state = self.ensure_state()
        state.scenario_name = scenario_name or "baseline"
        state.tick = 0
        state.is_running = False
        state.last_tick_at = datetime.now(timezone.utc)
        weather = self.current_weather()
        if weather is None:
            weather = self._generate_weather(random.Random(state.seed), 0, state.scenario_name)
            self.db.add(weather)
            self.db.flush()
        world = self._compose_world_snapshot(state, weather, random.Random(state.seed))
        self.db.add(self._world_snapshot_model(state, world))
        self._record_event("system", "Simulation reset", f"The simulation was reset to {state.scenario_name}.", "info", {"scenario_name": state.scenario_name})
        self.db.commit()
        self.db.refresh(state)
        return state

    def set_speed(self, multiplier: int) -> SimulationState:
        state = self.ensure_state()
        interval = {5: 1, 2: 2, 1: 3}.get(multiplier, max(1, min(3, multiplier)))
        state.tick_interval_seconds = interval
        self._record_event("system", "Simulation speed changed", f"Simulation speed set to interval {interval} second(s).", "info", {"tick_interval_seconds": interval})
        self.db.commit()
        self.db.refresh(state)
        return state

    def set_scenario(self, scenario_name: str) -> SimulationState:
        state = self.ensure_state()
        state.scenario_name = scenario_name
        state.tick = 0
        state.is_running = True
        state.last_tick_at = datetime.now(timezone.utc)
        weather = self.current_weather()
        if weather is None:
            weather = self._generate_weather(random.Random(state.seed), 0, state.scenario_name)
            self.db.add(weather)
            self.db.flush()
        world = self._compose_world_snapshot(state, weather, random.Random(state.seed))
        self.db.add(self._world_snapshot_model(state, world))
        self._record_event("system", "Scenario changed", f"The simulation scenario is now {scenario_name}.", "warning", {"scenario_name": scenario_name})
        self.db.commit()
        self.db.refresh(state)
        return state

    def _generate_weather(self, rng: random.Random, tick: int, scenario_name: str = "baseline") -> WeatherSnapshot:
        conditions = [
            WeatherCondition.CLEAR,
            WeatherCondition.RAIN,
            WeatherCondition.STORM,
            WeatherCondition.WIND,
            WeatherCondition.FOG,
            WeatherCondition.HEATWAVE,
            WeatherCondition.THUNDERSTORM,
        ]
        scenario_bias = {
            "flood": [WeatherCondition.RAIN, WeatherCondition.STORM, WeatherCondition.THUNDERSTORM, WeatherCondition.RAIN],
            "wildfire": [WeatherCondition.CLEAR, WeatherCondition.WIND, WeatherCondition.HEATWAVE, WeatherCondition.CLEAR],
            "mass_casualty": [WeatherCondition.CLEAR, WeatherCondition.FOG, WeatherCondition.RAIN, WeatherCondition.WIND],
            "storm": [WeatherCondition.STORM, WeatherCondition.THUNDERSTORM, WeatherCondition.RAIN, WeatherCondition.WIND],
            "chemical_spill": [WeatherCondition.FOG, WeatherCondition.WIND, WeatherCondition.CLEAR, WeatherCondition.STORM],
        }.get(scenario_name, conditions)
        condition = scenario_bias[tick % len(scenario_bias)] if tick % 3 == 0 else rng.choice(scenario_bias)
        baseline_temp = {
            WeatherCondition.CLEAR: 27.0,
            WeatherCondition.RAIN: 23.0,
            WeatherCondition.STORM: 21.0,
            WeatherCondition.WIND: 24.5,
            WeatherCondition.FOG: 19.0,
            WeatherCondition.HEATWAVE: 34.5,
            WeatherCondition.THUNDERSTORM: 22.0,
        }[condition]
        temperature = round(baseline_temp + rng.uniform(-2.2, 2.8), 1)
        humidity = min(100, max(32, int(54 + rng.uniform(-18, 28))))
        wind_kph = int(max(5, min(80, 12 + rng.uniform(0, 30) + (8 if condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} else 0))))
        rain_mm = round(max(0.0, rng.uniform(0, 16) + (12 if condition in {WeatherCondition.RAIN, WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} else 0)), 1)
        lightning_risk = min(100, int((rain_mm * 2.3) + (25 if condition == WeatherCondition.THUNDERSTORM else 0) + rng.uniform(0, 12)))
        flood_warning = rain_mm >= 18 or (condition in {WeatherCondition.RAIN, WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} and humidity >= 78)
        heatwave_warning = temperature >= 33.0
        visibility = round(max(0.7, 18 - (rain_mm / 4) - (wind_kph / 28) - (8 if condition == WeatherCondition.FOG else 0)), 1)
        summary = self._weather_summary(condition, temperature, humidity, wind_kph, rain_mm, flood_warning, heatwave_warning)
        return WeatherSnapshot(
            condition=condition,
            temperature_c=temperature,
            humidity_percent=humidity,
            wind_kph=wind_kph,
            rain_mm=rain_mm,
            lightning_risk=lightning_risk,
            flood_warning=flood_warning,
            heatwave_warning=heatwave_warning,
            visibility_km=visibility,
            summary=summary,
        )

    @staticmethod
    def _weather_summary(
        condition: WeatherCondition,
        temperature: float,
        humidity: int,
        wind_kph: int,
        rain_mm: float,
        flood_warning: bool,
        heatwave_warning: bool,
    ) -> str:
        parts = [
            f"{condition.value.replace('_', ' ').title()} conditions",
            f"{temperature:.1f}C",
            f"humidity {humidity}%",
            f"wind {wind_kph} kph",
            f"rain {rain_mm:.1f} mm",
        ]
        if flood_warning:
            parts.append("flood risk elevated")
        if heatwave_warning:
            parts.append("heatwave warning active")
        return ", ".join(parts)

    @staticmethod
    def _should_create_incident(rng: random.Random, tick: int, weather: WeatherSnapshot, scenario_name: str = "baseline") -> bool:
        if scenario_name in {"flood", "storm", "community_flood", "health_alert", "river_overflow"}:
            return tick % 2 == 0 or rng.random() > 0.18
        if weather.flood_warning or weather.heatwave_warning:
            return tick % 2 == 0 or rng.random() > 0.35
        return tick % 3 == 0 or rng.random() > 0.72

    def _generate_incident(self, rng: random.Random, weather: WeatherSnapshot, tick: int, scenario_name: str = "baseline") -> Incident:
        templates = [
            ("Flooding near village bridge", HazardType.FLOOD),
            ("Road accident on the market road", HazardType.ROAD_ACCIDENT),
            ("Snake bite at homestead", HazardType.SNAKE_BITE),
            ("Missing child at market", HazardType.MISSING_CHILD),
            ("Landslide on the hill road", HazardType.LANDSLIDE),
            ("Heavy rain isolating homes", HazardType.HEAVY_RAIN),
            ("Water shortage at the settlement", HazardType.WATER_SHORTAGE),
            ("Disease outbreak at the market", HazardType.DISEASE_OUTBREAK),
        ]
        scenario_templates = {
            "community_flood": [
                ("River overflow near river crossing", HazardType.RIVER_OVERFLOW),
                ("Flooded footpath by the school", HazardType.FLOOD),
                ("Evacuation at low-lying homes", HazardType.FLOOD),
            ],
            "health_alert": [
                ("Disease outbreak at the clinic queue", HazardType.DISEASE_OUTBREAK),
                ("Snake bite at a farm", HazardType.SNAKE_BITE),
                ("Medical emergency at the market", HazardType.MEDICAL),
            ],
            "river_overflow": [
                ("Bridge access blocked by rising water", HazardType.COLLAPSED_BRIDGE),
                ("Rescue boat needed near river crossing", HazardType.BOAT_ACCIDENT),
                ("Family stranded across the river", HazardType.RIVER_OVERFLOW),
            ],
        }.get(scenario_name, templates)
        title, hazard = scenario_templates[tick % len(scenario_templates)] if tick % 2 == 0 else rng.choice(scenario_templates)
        severity = self._severity_for_weather(rng, weather, hazard)
        people = int(max(4, rng.uniform(5, 180) + (30 if severity == IncidentSeverity.CRITICAL else 0)))
        incident = Incident(
            title=title,
            description=self._incident_description(title, weather, severity),
            latitude=round(-0.08 + rng.uniform(-0.12, 0.12), 6),
            longitude=round(37.58 + rng.uniform(-0.12, 0.12), 6),
            severity=severity,
            hazard_type=hazard,
            number_of_people=people,
            status=IncidentStatus.NEW,
            assigned_team=None,
            created_by_id=self._default_notification_user_id(),
        )
        return incident

    @staticmethod
    def _severity_for_weather(rng: random.Random, weather: WeatherSnapshot, hazard: HazardType) -> IncidentSeverity:
        if weather.flood_warning and hazard == HazardType.FLOOD:
            return IncidentSeverity.CRITICAL
        if weather.heatwave_warning and hazard == HazardType.MEDICAL:
            return IncidentSeverity.HIGH
        roll = rng.random()
        if roll > 0.8:
            return IncidentSeverity.CRITICAL
        if roll > 0.55:
            return IncidentSeverity.HIGH
        if roll > 0.25:
            return IncidentSeverity.MODERATE
        return IncidentSeverity.LOW

    @staticmethod
    def _incident_description(title: str, weather: WeatherSnapshot, severity: IncidentSeverity) -> str:
        return (
            f"{title} detected during {weather.condition.value.replace('_', ' ')} weather. "
            f"The report is being coordinated with nearby community leaders and volunteers. Severity: {severity.value}."
        )

    def _apply_ai_analysis(self, incident: Incident, weather: WeatherSnapshot) -> None:
        analysis = self.ai.analyze_incident(
            AIContext(
                title=incident.title,
                description=incident.description,
                severity=incident.severity,
                hazard_type=incident.hazard_type,
                number_of_people=incident.number_of_people,
                latitude=incident.latitude,
                longitude=incident.longitude,
            )
        )
        incident.analysis = analysis.model_dump()
        incident.severity_score = analysis.severity_score
        incident.priority = analysis.priority
        incident.estimated_response_time_minutes = analysis.estimated_response_time_minutes
        incident.risk_level = analysis.risk_level
        incident.suggested_action_plan = analysis.suggested_action_plan
        incident.recommended_resources = analysis.recommended_resources
        incident.escalation_probability = analysis.escalation_probability
        incident.ai_summary = f"{analysis.explanation} Weather context: {weather.summary}."

    def _update_resources(self, rng: random.Random, weather: WeatherSnapshot) -> None:
        resources = list(self.db.scalars(select(Resource).order_by(Resource.id.asc())).all())
        for index, resource in enumerate(resources):
            if resource.kind in {
                ResourceKind.AMBULANCE,
                ResourceKind.FIRE_TRUCK,
                ResourceKind.POLICE_VEHICLE,
                ResourceKind.HELICOPTER,
                ResourceKind.BOAT,
                ResourceKind.RESCUE_BOAT,
                ResourceKind.DRONE,
                ResourceKind.BODABODA,
                ResourceKind.PRIVATE_VEHICLE,
                ResourceKind.TRACTOR,
            }:
                if resource.fuel_level is not None:
                    burn = 1 + (1 if weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} else 0)
                    resource.fuel_level = max(0, resource.fuel_level - burn - (index % 2))
                    if resource.fuel_level < 12:
                        resource.status = ResourceStatus.MAINTENANCE
                        resource.eta_minutes = None
                    elif resource.fuel_level < 25 and resource.status == ResourceStatus.AVAILABLE:
                        resource.status = ResourceStatus.BUSY
                if resource.status == ResourceStatus.AVAILABLE and rng.random() > 0.84:
                    resource.status = ResourceStatus.BUSY
                elif resource.status == ResourceStatus.BUSY and rng.random() > 0.76:
                    resource.status = ResourceStatus.AVAILABLE
            elif resource.kind in {ResourceKind.MEDICAL_SUPPLIES, ResourceKind.WATER, ResourceKind.WATER_TANK, ResourceKind.FOOD, ResourceKind.FOOD_STORE, ResourceKind.COMMUNITY_KITCHEN}:
                usage = 1 + (2 if weather.flood_warning or weather.heatwave_warning else 0)
                resource.quantity = max(0, resource.quantity - usage)
                if resource.quantity < 25:
                    resource.status = ResourceStatus.BUSY
            elif resource.kind in {ResourceKind.HOSPITAL, ResourceKind.SHELTER, ResourceKind.CLINIC, ResourceKind.SCHOOL, ResourceKind.CHURCH, ResourceKind.MOSQUE, ResourceKind.COMMUNITY_HALL}:
                if weather.flood_warning or weather.heatwave_warning:
                    resource.status = ResourceStatus.BUSY if rng.random() > 0.4 else ResourceStatus.AVAILABLE
                if resource.capacity is not None:
                    resource.capacity = max(0, resource.capacity - (1 if rng.random() > 0.85 else 0))
            elif resource.kind in {ResourceKind.FIRE_STATION, ResourceKind.POLICE_STATION}:
                if rng.random() > 0.9:
                    resource.status = ResourceStatus.BUSY
                elif resource.status == ResourceStatus.BUSY and rng.random() > 0.72:
                    resource.status = ResourceStatus.AVAILABLE

    def _update_closures(self, rng: random.Random, weather: WeatherSnapshot, tick: int) -> None:
        active_closures = list(self.db.scalars(select(RoadClosure).where(RoadClosure.is_active.is_(True))).all())
        if weather.flood_warning or weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM}:
            if len(active_closures) < 3 and (tick % 2 == 0 or rng.random() > 0.55):
                closure = RoadClosure(
                    title=f"Closure near {tick:03d} corridor",
                    latitude=round(-1.29 + rng.uniform(-0.05, 0.05), 6),
                    longitude=round(36.80 + rng.uniform(-0.05, 0.05), 6),
                    reason="Weather-related access restriction due to flooding or storm debris.",
                    severity="critical" if weather.flood_warning else "warning",
                    is_active=True,
                )
                self.db.add(closure)
                self._record_event(
                    "timeline",
                    "Road closure opened",
                    f"A road closure was added due to {weather.condition.value} weather.",
                    "warning",
                    {"road_closure": closure.title},
                )
        elif active_closures and rng.random() > 0.6:
            closure = active_closures[0]
            closure.is_active = False
            self._record_event(
                "timeline",
                "Road closure lifted",
                f"{closure.title} was lifted after conditions improved.",
                "info",
                {"road_closure_id": closure.id},
            )

    def _record_timeline_from_weather(self, weather: WeatherSnapshot, tick: int) -> None:
        self._record_event(
            "weather",
            f"Weather tick {tick}",
            weather.summary,
            "warning" if weather.flood_warning or weather.heatwave_warning else "info",
            {"weather_snapshot_id": weather.id, "condition": weather.condition.value},
        )

    def _record_health_snapshot(self, state: SimulationState) -> None:
        snapshot = self.system_health()
        self._record_event(
            "system",
            "System health snapshot",
            f"CPU {snapshot.cpu_usage_percent}%, memory {snapshot.memory_usage_mb} MB, websocket {snapshot.websocket_status}.",
            "info",
            {
                "server_status": snapshot.server_status,
                "database_status": snapshot.database_status,
                "websocket_status": snapshot.websocket_status,
                "simulation_status": snapshot.simulation_status,
                "memory_usage_mb": snapshot.memory_usage_mb,
                "cpu_usage_percent": snapshot.cpu_usage_percent,
                "open_connections": snapshot.open_connections,
                "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
            },
        )

    def _record_event(self, category: str, title: str, narrative: str, severity: str, payload: dict[str, Any]) -> None:
        self.db.add(
            TimelineEvent(
                category=category,
                title=title,
                narrative=narrative,
                severity=severity,
                payload=payload,
            )
        )

    def _default_notification_user_id(self) -> int:
        user = self.db.scalar(select(User).where(User.role.in_([Role.COUNTY_ADMIN, Role.ADMINISTRATOR])).order_by(User.id.asc()))
        if user:
            return user.id
        user = self.db.scalar(select(User).order_by(User.id.asc()))
        if user:
            return user.id
        raise RuntimeError("No users available for simulation")

    def _compose_world_snapshot(self, state: SimulationState, weather: WeatherSnapshot, rng: random.Random) -> dict[str, Any]:
        previous = self.current_world()
        previous_payload = deepcopy(previous.payload) if previous else {}

        incidents = list(
            self.db.scalars(
                select(Incident)
                .where(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED]))
                .order_by(desc(Incident.severity_score.is_(None)), desc(Incident.severity_score), Incident.created_at.asc())
            ).all()
        )
        resources = list(self.db.scalars(select(Resource).order_by(Resource.id.asc())).all())
        responders = list(
            self.db.scalars(
                select(User).where(
                    User.role.in_(
                        [
                            Role.FIELD_RESPONDER,
                            Role.DISPATCHER,
                            Role.COMMUNITY_VOLUNTEER,
                            Role.COMMUNITY_LEADER,
                        ]
                    )
                ).order_by(User.id.asc())
            ).all()
        )

        static_locations = self._static_world_locations()
        missions = self._build_missions(incidents, resources, weather, state, previous_payload, rng)
        mission_lookup = {mission["id"]: mission for mission in missions}
        responder_assignments = self._mission_assignments(responders, missions)
        vehicles = self._build_vehicle_snapshots(resources, incidents, missions, previous_payload, weather, state, rng)
        responder_snapshots = self._build_responder_snapshots(
            responders,
            responder_assignments,
            vehicles,
            missions,
            incidents,
            previous_payload,
            weather,
            state,
            rng,
        )
        facilities = self._build_facilities(resources, incidents, previous_payload, weather, state, rng)
        zones = self._build_zones(incidents, weather, previous_payload, state, rng)
        briefing_response = self.ai.command_briefing(
            [self._incident_snapshot_for_briefing(item) for item in incidents],
            [self._resource_snapshot_for_briefing(item) for item in resources],
        )
        briefing = self._compose_briefing(briefing_response, weather, incidents, facilities, missions, state)
        metrics = self._world_metrics(incidents, responder_snapshots, vehicles, facilities, weather, missions, state)
        commands = self._command_list(briefing_response, incidents, weather, missions)
        weather_payload = self.weather_dict(weather)
        if weather_payload and isinstance(weather_payload.get("created_at"), datetime):
            weather_payload["created_at"] = weather_payload["created_at"].isoformat()
        timeline_payload = [self._timeline_json(item) for item in self.timeline(24)]

        return {
            "briefing": briefing,
            "commands": commands,
            "metrics": metrics,
            "world_locations": static_locations,
            "responders": responder_snapshots,
            "vehicles": vehicles,
            "facilities": facilities,
            "zones": zones,
            "missions": missions,
            "timeline": timeline_payload,
            "weather": weather_payload,
        }

    def _world_snapshot_model(self, state: SimulationState, payload: dict[str, Any]) -> SimulationWorldSnapshot:
        return SimulationWorldSnapshot(
            scenario_name=state.scenario_name,
            tick=state.tick,
            is_running=state.is_running,
            briefing=str(payload.get("briefing", "")),
            payload=payload,
        )

    @staticmethod
    def _base_coordinate() -> tuple[float, float]:
        return -0.038, 37.650

    def _static_world_locations(self) -> list[dict[str, Any]]:
        lat, lon = self._base_coordinate()
        points = [
            {
                "id": "market-central",
                "name": "Matuu Market",
                "kind": "market",
                "category": "community_core",
                "latitude": round(lat, 6),
                "longitude": round(lon, 6),
                "note": "Primary gathering point and information hub.",
                "path": [],
            },
            {
                "id": "school-central",
                "name": "Matuu Primary School",
                "kind": "school",
                "category": "shelter",
                "latitude": round(lat + 0.012, 6),
                "longitude": round(lon - 0.012, 6),
                "note": "Temporary shelter and assembly point.",
                "path": [],
            },
            {
                "id": "church-central",
                "name": "St. Peter Church",
                "kind": "church",
                "category": "shelter",
                "latitude": round(lat - 0.01, 6),
                "longitude": round(lon + 0.015, 6),
                "note": "Displaced families are receiving food and bedding here.",
                "path": [],
            },
            {
                "id": "mosque-central",
                "name": "Al-Huda Mosque",
                "kind": "mosque",
                "category": "shelter",
                "latitude": round(lat + 0.016, 6),
                "longitude": round(lon + 0.01, 6),
                "note": "Community shelter with water distribution point.",
                "path": [],
            },
            {
                "id": "river-mwatu",
                "name": "Mwatu River",
                "kind": "river",
                "category": "waterway",
                "latitude": round(lat - 0.014, 6),
                "longitude": round(lon - 0.006, 6),
                "note": "Flood waters spread along the river banks.",
                "path": [
                    {"latitude": round(lat + 0.05, 6), "longitude": round(lon - 0.05, 6)},
                    {"latitude": round(lat + 0.02, 6), "longitude": round(lon - 0.02, 6)},
                    {"latitude": round(lat - 0.01, 6), "longitude": round(lon - 0.01, 6)},
                    {"latitude": round(lat - 0.04, 6), "longitude": round(lon + 0.005, 6)},
                ],
            },
            {
                "id": "road-market",
                "name": "Market Road",
                "kind": "road",
                "category": "transport",
                "latitude": round(lat - 0.004, 6),
                "longitude": round(lon + 0.014, 6),
                "note": "Primary access route for volunteers and food deliveries.",
                "path": [
                    {"latitude": round(lat + 0.04, 6), "longitude": round(lon + 0.03, 6)},
                    {"latitude": round(lat + 0.018, 6), "longitude": round(lon + 0.02, 6)},
                    {"latitude": round(lat - 0.005, 6), "longitude": round(lon + 0.01, 6)},
                    {"latitude": round(lat - 0.028, 6), "longitude": round(lon - 0.002, 6)},
                ],
            },
            {
                "id": "road-river",
                "name": "River Crossing Road",
                "kind": "road",
                "category": "transport",
                "latitude": round(lat - 0.018, 6),
                "longitude": round(lon + 0.01, 6),
                "note": "Route to the bridge and riverside settlements.",
                "path": [
                    {"latitude": round(lat + 0.01, 6), "longitude": round(lon - 0.04, 6)},
                    {"latitude": round(lat - 0.002, 6), "longitude": round(lon - 0.02, 6)},
                    {"latitude": round(lat - 0.019, 6), "longitude": round(lon + 0.008, 6)},
                    {"latitude": round(lat - 0.034, 6), "longitude": round(lon + 0.03, 6)},
                ],
            },
            {
                "id": "chief-office",
                "name": "Chief's Office",
                "kind": "command_center",
                "category": "operations",
                "latitude": round(lat + 0.003, 6),
                "longitude": round(lon - 0.003, 6),
                "note": "Community coordination and announcements.",
                "path": [],
            },
            {
                "id": "clinic-central",
                "name": "Matuu Clinic",
                "kind": "hospital",
                "category": "health",
                "latitude": round(lat - 0.02, 6),
                "longitude": round(lon - 0.015, 6),
                "note": "Clinic receiving injured people and managing triage.",
                "path": [],
            },
            {
                "id": "water-point",
                "name": "Ward Water Point",
                "kind": "water_tank",
                "category": "utilities",
                "latitude": round(lat + 0.027, 6),
                "longitude": round(lon + 0.02, 6),
                "note": "Water distribution point for displaced families.",
                "path": [],
            },
            {
                "id": "bridge-muranga",
                "name": "Mwamba Bridge",
                "kind": "bridge",
                "category": "infrastructure",
                "latitude": round(lat + 0.009, 6),
                "longitude": round(lon - 0.012, 6),
                "note": "Flood-sensitive crossing used by traders and school children.",
                "path": [],
            },
            {
                "id": "market-riverside",
                "name": "Riverside Market",
                "kind": "market",
                "category": "commerce",
                "latitude": round(lat - 0.022, 6),
                "longitude": round(lon + 0.032, 6),
                "note": "Crowded during market days and monitored for evacuation.",
                "path": [],
            },
            {
                "id": "shelter-secondary",
                "name": "Community Hall Shelter",
                "kind": "community_hall",
                "category": "shelter",
                "latitude": round(lat - 0.03, 6),
                "longitude": round(lon - 0.02, 6),
                "note": "Overflow shelter for displaced families.",
                "path": [],
            },
            {
                "id": "farm-route",
                "name": "Farm Access Route",
                "kind": "road",
                "category": "transport",
                "latitude": round(lat - 0.027, 6),
                "longitude": round(lon + 0.014, 6),
                "note": "Used by tractors, pickups, and food deliveries.",
                "path": [],
            },
            {
                "id": "village-edge",
                "name": "Village Edge",
                "kind": "city",
                "category": "community_edge",
                "latitude": round(lat - 0.035, 6),
                "longitude": round(lon - 0.03, 6),
                "note": "Lowest-lying homes near the river.",
                "path": [],
            },
        ]
        return points

    def _incident_snapshot_for_briefing(self, incident: Incident) -> dict[str, Any]:
        return {
            "title": incident.title,
            "severity": incident.severity.value,
            "status": incident.status.value,
            "severity_score": incident.severity_score or 0,
            "number_of_people": incident.number_of_people,
            "hazard_type": incident.hazard_type.value,
            "priority": incident.priority or "pending",
            "created_at": incident.created_at.isoformat() if incident.created_at else None,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
        }

    def _resource_snapshot_for_briefing(self, resource: Resource) -> dict[str, Any]:
        return {
            "kind": resource.kind.value,
            "status": resource.status.value,
            "fuel_level": resource.fuel_level,
            "quantity": resource.quantity,
            "capacity": resource.capacity,
        }

    def _build_missions(
        self,
        incidents: list[Incident],
        resources: list[Resource],
        weather: WeatherSnapshot,
        state: SimulationState,
        previous_payload: dict[str, Any],
        rng: random.Random,
    ) -> list[dict[str, Any]]:
        previous_missions = {item.get("id"): item for item in previous_payload.get("missions", []) if isinstance(item, dict)}
        vehicle_lookup = self._vehicle_pool(resources)
        missions: list[dict[str, Any]] = []
        for index, incident in enumerate(incidents):
            mission_id = f"mission-{incident.id}"
            previous = previous_missions.get(mission_id, {})
            vehicle = self._mission_vehicle(incident, vehicle_lookup, index)
            activity = self._mission_activity(incident, weather)
            previous_progress = int(previous.get("progress_percent") or 0)
            step_gain = 10 + (8 if incident.severity == IncidentSeverity.CRITICAL else 0) + (4 if weather.flood_warning else 0)
            if incident.status in {IncidentStatus.NEW, IncidentStatus.TRIAGED}:
                status = "dispatched"
            elif incident.status in {IncidentStatus.DISPATCHED, IncidentStatus.RESPONDING}:
                status = "active"
            elif incident.status == IncidentStatus.CONTAINED:
                status = "monitoring"
            else:
                status = "completed"
            progress = min(100, max(previous_progress, previous_progress + step_gain if status != "completed" else 100))
            eta_minutes = max(2, (incident.estimated_response_time_minutes or 18) - (progress // 14))
            completion_time = previous.get("completion_time")
            if status == "completed" and completion_time is None:
                completion_time = datetime.now(timezone.utc).isoformat()
            missions.append(
                {
                    "id": mission_id,
                    "incident_id": incident.id,
                    "incident_title": incident.title,
                    "title": activity["title"],
                    "priority": incident.priority or self.ai.analyze_incident(
                        AIContext(
                            title=incident.title,
                            description=incident.description,
                            severity=incident.severity,
                            hazard_type=incident.hazard_type,
                            number_of_people=incident.number_of_people,
                            latitude=incident.latitude,
                            longitude=incident.longitude,
                        )
                    ).priority,
                    "assigned_team": incident.assigned_team or activity["team"],
                    "vehicle": vehicle["name"] if vehicle else None,
                    "status": status,
                    "progress_percent": progress,
                    "eta_minutes": eta_minutes,
                    "activity": activity["activity"],
                    "completion_time": completion_time,
                    "explanation": activity["explanation"],
                }
            )
        return missions

    def _mission_assignments(self, responders: list[User], missions: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        assignments: dict[int, dict[str, Any]] = {}
        if not missions:
            return assignments
        for index, responder in enumerate(responders):
            mission = missions[index % len(missions)]
            if index % 3 != 0:
                assignments[responder.id] = mission
        return assignments

    def _vehicle_pool(self, resources: list[Resource]) -> list[dict[str, Any]]:
        pool: list[dict[str, Any]] = []
        for resource in resources:
            if resource.kind not in {
                ResourceKind.AMBULANCE,
                ResourceKind.FIRE_TRUCK,
                ResourceKind.POLICE_VEHICLE,
                ResourceKind.HELICOPTER,
                ResourceKind.BOAT,
                ResourceKind.RESCUE_BOAT,
                ResourceKind.DRONE,
                ResourceKind.BODABODA,
                ResourceKind.PRIVATE_VEHICLE,
                ResourceKind.TRACTOR,
            }:
                continue
            pool.append(
                {
                    "id": resource.id,
                    "name": resource.name,
                    "kind": resource.kind.value,
                    "latitude": resource.latitude,
                    "longitude": resource.longitude,
                    "status": resource.status.value,
                    "fuel_level": resource.fuel_level or 0,
                    "crew": min(8, max(2, resource.quantity + 1)),
                    "capacity": resource.capacity or 4,
                    "base_latitude": resource.latitude,
                    "base_longitude": resource.longitude,
                }
            )
        pool.extend(self._virtual_support_vehicles())
        return pool

    def _virtual_support_vehicles(self) -> list[dict[str, Any]]:
        lat, lon = self._base_coordinate()
        support: list[dict[str, Any]] = []
        for index in range(6):
            support.append(
                {
                    "id": 9000 + index,
                    "name": f"Supply Truck {index + 1:02d}",
                    "kind": "supply_truck",
                    "latitude": round(lat + 0.01 + index * 0.002, 6),
                    "longitude": round(lon - 0.02 + index * 0.0015, 6),
                    "status": "available",
                    "fuel_level": 88,
                    "crew": 2,
                    "capacity": 6,
                    "base_latitude": round(lat + 0.01 + index * 0.002, 6),
                    "base_longitude": round(lon - 0.02 + index * 0.0015, 6),
                }
            )
        for index in range(4):
            support.append(
                {
                    "id": 9100 + index,
                    "name": f"Command Vehicle {index + 1:02d}",
                    "kind": "command_vehicle",
                    "latitude": round(lat - 0.01 - index * 0.002, 6),
                    "longitude": round(lon + 0.02 - index * 0.001, 6),
                    "status": "available",
                    "fuel_level": 94,
                    "crew": 4,
                    "capacity": 6,
                    "base_latitude": round(lat - 0.01 - index * 0.002, 6),
                    "base_longitude": round(lon + 0.02 - index * 0.001, 6),
                }
            )
        return support

    def _mission_vehicle(self, incident: Incident, vehicle_pool: list[dict[str, Any]], index: int) -> dict[str, Any] | None:
        preferred = {
            HazardType.FLOOD: {"boat", "rescue_boat", "helicopter", "ambulance"},
            HazardType.RIVER_OVERFLOW: {"boat", "rescue_boat", "helicopter"},
            HazardType.FIRE: {"fire_truck", "helicopter"},
            HazardType.ROAD_ACCIDENT: {"ambulance", "police_vehicle"},
            HazardType.BOAT_ACCIDENT: {"boat", "rescue_boat", "ambulance"},
            HazardType.MEDICAL: {"ambulance", "helicopter"},
            HazardType.SNAKE_BITE: {"ambulance", "bodaboda", "private_vehicle"},
            HazardType.LANDSLIDE: {"tractor", "police_vehicle", "private_vehicle"},
            HazardType.COLLAPSED_BRIDGE: {"tractor", "police_vehicle", "drone"},
            HazardType.HEAVY_RAIN: {"shelter", "community_hall", "school"},
            HazardType.WATER_SHORTAGE: {"private_vehicle", "tractor", "bodaboda"},
            HazardType.DISEASE_OUTBREAK: {"ambulance", "clinic", "medical_team"},
            HazardType.ELECTRIC_POLE_DOWN: {"generator", "private_vehicle", "police_vehicle"},
            HazardType.TREE_BLOCKING_ROAD: {"tractor", "private_vehicle", "bodaboda"},
            HazardType.MISSING_CHILD: {"bodaboda", "drone", "private_vehicle"},
            HazardType.MISSING_ELDERLY: {"bodaboda", "private_vehicle", "drone"},
            HazardType.LIVESTOCK_DISEASE: {"tractor", "private_vehicle", "clinic"},
            HazardType.HAZMAT: {"fire_truck", "drone", "police_vehicle"},
            HazardType.SECURITY: {"police_vehicle", "drone", "private_vehicle"},
            HazardType.OTHER: {"ambulance", "private_vehicle", "community_hall"},
        }[incident.hazard_type]
        candidates = [item for item in vehicle_pool if item["kind"] in preferred and item["status"] != ResourceStatus.MAINTENANCE.value]
        if not candidates:
            candidates = vehicle_pool
        if not candidates:
            return None
        return candidates[index % len(candidates)]

    @staticmethod
    def _mission_activity(incident: Incident, weather: WeatherSnapshot) -> dict[str, str]:
        if incident.hazard_type == HazardType.FLOOD:
            return {
                "title": "Move families to safety",
                "team": "Flood Response",
                "activity": "Deploy rescue boats and volunteer riders to move families to school and church shelters.",
                "explanation": "Flood missions prioritize evacuation, rescue boats, and nearby shelters.",
            }
        if incident.hazard_type == HazardType.RIVER_OVERFLOW:
            return {
                "title": "Protect river crossing",
                "team": "River Rescue",
                "activity": "Secure the bridge, warn traders, and move people away from the water line.",
                "explanation": "River overflow missions focus on the crossing, nearby homes, and access routes.",
            }
        if incident.hazard_type == HazardType.FIRE:
            return {
                "title": "Contain fire",
                "team": "Fire Response",
                "activity": "Keep people away, use water points, and protect nearby homes and shops.",
                "explanation": "Fire missions prioritize quick containment and safe evacuation.",
            }
        if incident.hazard_type == HazardType.MEDICAL:
            return {
                "title": "Transport patient",
                "team": "Clinic Response",
                "activity": "Stabilize the patient and move them to the nearest clinic or health centre.",
                "explanation": "Medical missions use the nearest available clinic and volunteer transport.",
            }
        if incident.hazard_type == HazardType.DISEASE_OUTBREAK:
            return {
                "title": "Open health post",
                "team": "Health Response",
                "activity": "Set up triage, isolate cases, and share a public health message.",
                "explanation": "Disease outbreaks need simple messaging, triage, and local health workers.",
            }
        if incident.hazard_type == HazardType.HAZMAT:
            return {
                "title": "Contain spill",
                "team": "Hazmat Task Force",
                "activity": "Establish exclusion zones, contain the plume, and protect responders from exposure.",
                "explanation": "Hazmat incidents require controlled movement, decontamination, and perimeter control.",
            }
        if incident.hazard_type == HazardType.LANDSLIDE:
            return {
                "title": "Clear road and search",
                "team": "Road Response",
                "activity": "Clear debris, search for trapped people, and reopen the route.",
                "explanation": "Landslide missions focus on access, trapped people, and safe routes.",
            }
        if incident.hazard_type == HazardType.SECURITY:
            return {
                "title": "Maintain order",
                "team": "Safety Response",
                "activity": "Keep people calm, protect the scene, and escort support teams.",
                "explanation": "Safety events require visible, calm coordination and simple updates.",
            }
        return {
            "title": "Stabilize scene",
            "team": "Community Response",
            "activity": "Assess the scene, support the nearest helper, and keep access routes open.",
            "explanation": "General incidents are routed to the nearest capable community unit.",
        }

    def _build_responder_snapshots(
        self,
        responders: list[User],
        responder_assignments: dict[int, dict[str, Any]],
        vehicles: list[dict[str, Any]],
        missions: list[dict[str, Any]],
        incidents: list[Incident],
        previous_payload: dict[str, Any],
        weather: WeatherSnapshot,
        state: SimulationState,
        rng: random.Random,
    ) -> list[dict[str, Any]]:
        previous = {item.get("id"): item for item in previous_payload.get("responders", []) if isinstance(item, dict)}
        mission_by_id = {item["id"]: item for item in missions}
        incident_by_id = {item.id: item for item in incidents}
        lat, lon = self._base_coordinate()
        result: list[dict[str, Any]] = []
        for index, responder in enumerate(responders):
            prev = previous.get(str(responder.id), {})
            mission = responder_assignments.get(responder.id)
            mission_id = mission["id"] if mission else None
            incident = incident_by_id.get(mission.get("incident_id")) if mission else None
            base_lat = round(lat + ((index % 8) - 4) * 0.004 + ((index // 8) % 5) * 0.002, 6)
            base_lon = round(lon + ((index % 7) - 3) * 0.004 + ((index // 7) % 5) * 0.002, 6)
            current_lat = float(prev.get("latitude", base_lat))
            current_lon = float(prev.get("longitude", base_lon))
            if responder.is_on_duty and mission and incident:
                target_lat = incident.latitude
                target_lon = incident.longitude
                speed = 32 if mission["title"] == "Transport injured" else 26
                if weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM}:
                    speed *= 0.85
                current_lat, current_lon = self._move_towards(current_lat, current_lon, target_lat, target_lon, speed, state.tick_interval_seconds)
                destination_name = incident.title
                status = self._responder_status_for_mission(mission["status"], responder.role.value)
                health = max(58, int(prev.get("health", 98)) - (2 if status in {"rescuing", "treating_victims"} else 1))
                fuel_level = prev.get("fuel_level")
                vehicle_name = mission.get("vehicle")
            else:
                drift = math.sin((state.tick + index) / 4) * 0.0015
                current_lat = round(current_lat + drift, 6)
                current_lon = round(current_lon + math.cos((state.tick + index) / 5) * 0.0012, 6)
                destination_name = prev.get("destination_name")
                status = "off duty" if not responder.is_on_duty else "waiting"
                health = int(prev.get("health", 99))
                fuel_level = prev.get("fuel_level")
                vehicle_name = prev.get("vehicle")
            result.append(
                {
                    "id": str(responder.id),
                    "name": responder.full_name,
                    "kind": responder.role.value,
                    "status": status,
                    "latitude": round(current_lat, 6),
                    "longitude": round(current_lon, 6),
                    "destination": {"latitude": incident.latitude, "longitude": incident.longitude} if incident else prev.get("destination"),
                    "destination_name": destination_name,
                    "speed_kph": 26.0 if status != "off duty" else 0.0,
                    "eta_minutes": self._eta_minutes(current_lat, current_lon, incident.latitude, incident.longitude, 26.0) if incident else None,
                    "fuel_level": fuel_level if isinstance(fuel_level, int) else None,
                    "health": health,
                    "crew": 1,
                    "mission": mission["title"] if mission else prev.get("mission"),
                    "equipment": self._responder_equipment(responder.role.value),
                    "vehicle": vehicle_name,
                }
            )
        return result

    @staticmethod
    def _responder_status_for_mission(mission_status: str, role: str) -> str:
        if mission_status == "completed":
            return "returning"
        if role in {Role.FIELD_RESPONDER.value, Role.COMMUNITY_VOLUNTEER.value, Role.DISPATCHER.value} and mission_status == "active":
            return "rescuing"
        if mission_status == "monitoring":
            return "waiting"
        return "driving"

    @staticmethod
    def _responder_equipment(role: str) -> list[str]:
        mapping = {
            Role.FIELD_RESPONDER.value: ["radio", "first-aid kit", "helmet"],
            Role.COMMUNITY_VOLUNTEER.value: ["phone", "reflective vest", "first-aid kit"],
            Role.DISPATCHER.value: ["phone", "route maps", "battery pack"],
            Role.COMMUNITY_LEADER.value: ["phone", "megaphone", "community register"],
            Role.INCIDENT_COMMANDER.value: ["command tablet", "radio", "operations board"],
            Role.ADMINISTRATOR.value: ["monitoring laptop"],
            Role.COUNTY_ADMIN.value: ["laptop", "phone", "briefing notes"],
        }
        return mapping.get(role, ["radio"])

    def _build_vehicle_snapshots(
        self,
        resources: list[Resource],
        incidents: list[Incident],
        missions: list[dict[str, Any]],
        previous_payload: dict[str, Any],
        weather: WeatherSnapshot,
        state: SimulationState,
        rng: random.Random,
    ) -> list[dict[str, Any]]:
        previous = {str(item.get("id")): item for item in previous_payload.get("vehicles", []) if isinstance(item, dict)}
        mission_by_vehicle = {mission.get("vehicle"): mission for mission in missions if mission.get("vehicle")}
        incident_by_id = {incident.id: incident for incident in incidents}
        result: list[dict[str, Any]] = []
        for index, resource in enumerate(resources):
            if resource.kind not in {
                ResourceKind.AMBULANCE,
                ResourceKind.FIRE_TRUCK,
                ResourceKind.POLICE_VEHICLE,
                ResourceKind.HELICOPTER,
                ResourceKind.BOAT,
                ResourceKind.RESCUE_BOAT,
                ResourceKind.DRONE,
                ResourceKind.BODABODA,
                ResourceKind.PRIVATE_VEHICLE,
                ResourceKind.TRACTOR,
            }:
                continue
            prev = previous.get(str(resource.id), {})
            mission = mission_by_vehicle.get(resource.name)
            if mission and mission.get("incident_id") in incident_by_id:
                incident = incident_by_id[mission["incident_id"]]
                target_lat = incident.latitude
                target_lon = incident.longitude
                speed = self._vehicle_speed(resource.kind.value, weather)
                current_lat = float(prev.get("latitude", resource.latitude or target_lat))
                current_lon = float(prev.get("longitude", resource.longitude or target_lon))
                current_lat, current_lon = self._move_towards(current_lat, current_lon, target_lat, target_lon, speed, state.tick_interval_seconds)
                status = "flying" if resource.kind == ResourceKind.HELICOPTER else "driving"
                if resource.kind in {ResourceKind.BOAT, ResourceKind.RESCUE_BOAT, ResourceKind.DRONE, ResourceKind.BODABODA, ResourceKind.PRIVATE_VEHICLE, ResourceKind.TRACTOR}:
                    status = "moving"
                if weather.flood_warning and resource.kind in {ResourceKind.AMBULANCE, ResourceKind.FIRE_TRUCK, ResourceKind.POLICE_VEHICLE}:
                    status = "rerouting"
                distance = self._distance_km(current_lat, current_lon, target_lat, target_lon)
                eta_minutes = max(1, int(distance / max(speed, 12) * 60))
                fuel_level = max(0, int((prev.get("fuel_level", resource.fuel_level or 80))) - self._fuel_burn(resource.kind.value, weather))
                if fuel_level < 10:
                    status = "refueling"
                crew = int(prev.get("crew", min(8, max(2, resource.quantity + 1))))
            else:
                current_lat = float(prev.get("latitude", resource.latitude or self._base_coordinate()[0]))
                current_lon = float(prev.get("longitude", resource.longitude or self._base_coordinate()[1]))
                current_lat = round(current_lat + math.sin((state.tick + index) / 6) * 0.0007, 6)
                current_lon = round(current_lon + math.cos((state.tick + index) / 7) * 0.0007, 6)
                status = resource.status.value
                eta_minutes = prev.get("eta_minutes") if isinstance(prev.get("eta_minutes"), int) else None
                fuel_level = max(0, int((prev.get("fuel_level", resource.fuel_level or 80))) - self._fuel_burn(resource.kind.value, weather) // 2)
                crew = int(prev.get("crew", min(8, max(2, resource.quantity + 1))))
            destination = None
            destination_name = None
            if mission and mission.get("incident_id") in incident_by_id:
                incident = incident_by_id[mission["incident_id"]]
                destination = {"latitude": incident.latitude, "longitude": incident.longitude}
                destination_name = incident.title
            result.append(
                {
                    "id": str(resource.id),
                    "name": resource.name,
                    "kind": resource.kind.value,
                    "status": status,
                    "latitude": round(current_lat, 6),
                    "longitude": round(current_lon, 6),
                    "destination": destination,
                    "destination_name": destination_name,
                    "speed_kph": self._vehicle_speed(resource.kind.value, weather),
                    "eta_minutes": eta_minutes,
                    "fuel_level": fuel_level,
                    "health": 100 if status != "maintenance" else 78,
                    "crew": crew,
                    "mission": mission["title"] if mission else prev.get("mission"),
                    "equipment": self._vehicle_equipment(resource.kind.value),
                }
            )
        return result

    @staticmethod
    def _vehicle_speed(kind: str, weather: WeatherSnapshot) -> float:
        base = {
            "ambulance": 72.0,
            "fire_truck": 64.0,
            "police_vehicle": 76.0,
            "helicopter": 145.0,
            "boat": 36.0,
            "rescue_boat": 34.0,
            "drone": 92.0,
            "bodaboda": 58.0,
            "private_vehicle": 52.0,
            "tractor": 26.0,
        }.get(kind, 50.0)
        if weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} and kind == "helicopter":
            return base * 0.65
        if weather.flood_warning and kind in {"ambulance", "fire_truck", "police_vehicle", "private_vehicle", "tractor"}:
            return base * 0.78
        if weather.condition == WeatherCondition.WIND and kind == "helicopter":
            return base * 0.85
        return base

    @staticmethod
    def _vehicle_equipment(kind: str) -> list[str]:
        mapping = {
            "ambulance": ["stretcher", "oxygen", "medical bags"],
            "fire_truck": ["hoses", "water tank", "breathing apparatus"],
            "police_vehicle": ["radio", "lights", "incident cordon kit"],
            "helicopter": ["winch", "stretchers", "navigation kit"],
            "boat": ["life vests", "throw lines", "search lights"],
            "rescue_boat": ["life jackets", "ropes", "search lights"],
            "drone": ["camera", "thermal sensor", "live uplink"],
            "bodaboda": ["helmet", "first-aid kit", "phone mount"],
            "private_vehicle": ["blankets", "water", "phone charger"],
            "tractor": ["tow rope", "chain", "flashlight"],
        }
        return mapping.get(kind, ["radio"])

    def _build_facilities(
        self,
        resources: list[Resource],
        incidents: list[Incident],
        previous_payload: dict[str, Any],
        weather: WeatherSnapshot,
        state: SimulationState,
        rng: random.Random,
    ) -> list[dict[str, Any]]:
        previous = {str(item.get("id")): item for item in previous_payload.get("facilities", []) if isinstance(item, dict)}
        active_people = sum(incident.number_of_people for incident in incidents)
        flood_pressure = 1.2 if weather.flood_warning else 1.0
        result: list[dict[str, Any]] = []
        for resource in resources:
            if resource.kind == ResourceKind.HOSPITAL:
                prev = previous.get(str(resource.id), {})
                capacity = resource.capacity or 200
                occupancy = min(capacity, int(prev.get("occupancy", capacity * 0.58)) + int(active_people * 0.015 * flood_pressure))
                available_beds = max(0, capacity - occupancy)
                doctors_available = max(0, int(capacity * 0.13) - int(occupancy * 0.03))
                incoming_patients = min(occupancy, max(0, int(active_people * 0.012)))
                alert_level = "critical" if occupancy >= capacity * 0.9 else "warning" if occupancy >= capacity * 0.75 else "normal"
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": "hospital",
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": capacity,
                        "occupancy": occupancy,
                        "available_beds": available_beds,
                        "doctors_available": doctors_available,
                        "incoming_patients": incoming_patients,
                        "food": None,
                        "water": None,
                        "medicine": max(0, 300 - int(occupancy * 1.7)),
                        "power": 100 if resource.status == ResourceStatus.AVAILABLE else 88,
                        "security": "stable" if resource.status == ResourceStatus.AVAILABLE else "tightened",
                        "alert_level": alert_level,
                    }
                )
            elif resource.kind == ResourceKind.SHELTER:
                prev = previous.get(str(resource.id), {})
                capacity = resource.capacity or 150
                occupancy = min(capacity, int(prev.get("occupancy", capacity * 0.35)) + int(active_people * 0.01))
                food = max(0, int(prev.get("food", 180)) - rng.randint(1, 8))
                water = max(0, int(prev.get("water", 220)) - rng.randint(1, 10))
                medicine = max(0, int(prev.get("medicine", 120)) - rng.randint(0, 4))
                power = max(0, int(prev.get("power", 100)) - rng.randint(0, 2))
                alert_level = "critical" if occupancy >= capacity * 0.9 else "warning" if occupancy >= capacity * 0.78 else "normal"
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": "shelter",
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": capacity,
                        "occupancy": occupancy,
                        "available_beds": max(0, capacity - occupancy),
                        "doctors_available": None,
                        "incoming_patients": int(active_people * 0.008),
                        "food": food,
                        "water": water,
                        "medicine": medicine,
                        "power": power,
                        "security": "tightened" if occupancy >= capacity * 0.8 else "stable",
                        "alert_level": alert_level,
                    }
                )
            elif resource.kind == ResourceKind.CLINIC:
                prev = previous.get(str(resource.id), {})
                capacity = resource.capacity or 60
                occupancy = min(capacity, int(prev.get("occupancy", capacity * 0.4)) + int(active_people * 0.008))
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": "clinic",
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": capacity,
                        "occupancy": occupancy,
                        "available_beds": max(0, capacity - occupancy),
                        "doctors_available": max(0, int(capacity * 0.12) - int(occupancy * 0.02)),
                        "incoming_patients": min(occupancy, max(0, int(active_people * 0.01))),
                        "food": None,
                        "water": None,
                        "medicine": max(0, 140 - int(occupancy * 1.5)),
                        "power": 100 if resource.status == ResourceStatus.AVAILABLE else 85,
                        "security": "stable",
                        "alert_level": "warning" if occupancy >= capacity * 0.75 else "normal",
                    }
                )
            elif resource.kind in {ResourceKind.SCHOOL, ResourceKind.CHURCH, ResourceKind.MOSQUE, ResourceKind.COMMUNITY_HALL}:
                prev = previous.get(str(resource.id), {})
                capacity = resource.capacity or 200
                occupancy = min(capacity, int(prev.get("occupancy", capacity * 0.25)) + int(active_people * 0.012))
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": resource.kind.value,
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": capacity,
                        "occupancy": occupancy,
                        "available_beds": max(0, capacity - occupancy),
                        "doctors_available": None,
                        "incoming_patients": int(active_people * 0.005),
                        "food": max(0, int(prev.get("food", 150)) - rng.randint(1, 4)),
                        "water": max(0, int(prev.get("water", 180)) - rng.randint(1, 6)),
                        "medicine": max(0, int(prev.get("medicine", 40)) - rng.randint(0, 3)),
                        "power": 100 if resource.status == ResourceStatus.AVAILABLE else 88,
                        "security": "stable",
                        "alert_level": "warning" if occupancy >= capacity * 0.8 else "normal",
                    }
                )
            elif resource.kind in {ResourceKind.WATER_TANK, ResourceKind.FOOD_STORE, ResourceKind.COMMUNITY_KITCHEN, ResourceKind.GENERATOR}:
                prev = previous.get(str(resource.id), {})
                quantity = max(0, int(prev.get("quantity", resource.quantity)))
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": resource.kind.value,
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": resource.capacity,
                        "occupancy": None,
                        "available_beds": None,
                        "doctors_available": None,
                        "incoming_patients": None,
                        "food": quantity if resource.kind == ResourceKind.FOOD_STORE else None,
                        "water": quantity if resource.kind == ResourceKind.WATER_TANK else None,
                        "medicine": None,
                        "power": quantity if resource.kind == ResourceKind.GENERATOR else None,
                        "security": "stable",
                        "alert_level": "warning" if quantity < 25 else "normal",
                    }
                )
            elif resource.kind in {ResourceKind.FIRE_STATION, ResourceKind.POLICE_STATION}:
                prev = previous.get(str(resource.id), {})
                capacity = resource.capacity or 60
                occupancy = min(capacity, int(prev.get("occupancy", capacity * 0.2)) + rng.randint(0, 5))
                result.append(
                    {
                        "id": str(resource.id),
                        "name": resource.name,
                        "kind": resource.kind.value,
                        "latitude": resource.latitude or self._base_coordinate()[0],
                        "longitude": resource.longitude or self._base_coordinate()[1],
                        "capacity": capacity,
                        "occupancy": occupancy,
                        "available_beds": None,
                        "doctors_available": None,
                        "incoming_patients": None,
                        "food": None,
                        "water": None,
                        "medicine": None,
                        "power": 100,
                        "security": "operational",
                        "alert_level": "warning" if occupancy >= capacity * 0.8 else "normal",
                    }
                )
        return result

    def _build_zones(
        self,
        incidents: list[Incident],
        weather: WeatherSnapshot,
        previous_payload: dict[str, Any],
        state: SimulationState,
        rng: random.Random,
    ) -> list[dict[str, Any]]:
        previous = {item.get("id"): item for item in previous_payload.get("zones", []) if isinstance(item, dict)}
        result: list[dict[str, Any]] = []
        for incident in incidents[:12]:
            zone_id = f"zone-{incident.id}"
            prev = previous.get(zone_id, {})
            severity_scale = {
                IncidentSeverity.LOW: 0.8,
                IncidentSeverity.MODERATE: 1.0,
                IncidentSeverity.HIGH: 1.3,
                IncidentSeverity.CRITICAL: 1.65,
            }[incident.severity]
            hazard_scale = {
                HazardType.FLOOD: 1.5,
                HazardType.RIVER_OVERFLOW: 1.55,
                HazardType.FIRE: 1.45,
                HazardType.EARTHQUAKE: 1.3,
                HazardType.ROAD_ACCIDENT: 0.8,
                HazardType.BOAT_ACCIDENT: 1.1,
                HazardType.MEDICAL: 0.7,
                HazardType.HAZMAT: 1.35,
                HazardType.SECURITY: 0.6,
                HazardType.MISSING_CHILD: 0.65,
                HazardType.MISSING_ELDERLY: 0.65,
                HazardType.SNAKE_BITE: 0.7,
                HazardType.LANDSLIDE: 1.2,
                HazardType.COLLAPSED_BRIDGE: 1.25,
                HazardType.HEAVY_RAIN: 1.0,
                HazardType.WATER_SHORTAGE: 0.8,
                HazardType.DISEASE_OUTBREAK: 1.15,
                HazardType.ELECTRIC_POLE_DOWN: 0.7,
                HazardType.TREE_BLOCKING_ROAD: 0.65,
                HazardType.LIVESTOCK_DISEASE: 0.75,
                HazardType.OTHER: 0.75,
            }[incident.hazard_type]
            radius = int((2500 + incident.number_of_people * 12) * severity_scale * hazard_scale)
            if weather.flood_warning and incident.hazard_type == HazardType.FLOOD:
                radius = int(radius * 1.25)
            if weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} and incident.hazard_type == HazardType.FIRE:
                radius = int(radius * 1.1)
            growth_rate = round(1.2 + (incident.number_of_people / 140) + (0.5 if weather.flood_warning else 0.0), 2)
            opacity = min(0.48, 0.08 + severity_scale * 0.08)
            points = self._zone_points(incident.latitude, incident.longitude, radius, irregular=incident.hazard_type in {HazardType.FIRE, HazardType.HAZMAT, HazardType.EARTHQUAKE})
            status = "critical" if incident.severity == IncidentSeverity.CRITICAL else "growing" if incident.status in {IncidentStatus.NEW, IncidentStatus.TRIAGED} else "contained" if incident.status == IncidentStatus.CONTAINED else "recovering"
            result.append(
                {
                    "id": zone_id,
                    "name": incident.title,
                    "kind": incident.hazard_type.value,
                    "severity": incident.severity.value,
                    "status": status,
                    "latitude": incident.latitude,
                    "longitude": incident.longitude,
                    "radius_m": radius,
                    "growth_rate": growth_rate,
                    "opacity": opacity,
                    "points": points,
                }
            )
        if weather.flood_warning:
            lat, lon = self._base_coordinate()
            drift_lat = round(lat + math.sin(state.tick / 3) * 0.012, 6)
            drift_lon = round(lon + math.cos(state.tick / 4) * 0.008, 6)
            result.append(
                {
                    "id": "weather-flood",
                    "name": "Flood Warning Front",
                    "kind": "weather",
                    "severity": "high",
                    "status": "growing",
                    "latitude": drift_lat,
                    "longitude": drift_lon,
                    "radius_m": 3200,
                    "growth_rate": 1.8,
                    "opacity": 0.22,
                    "points": self._zone_points(drift_lat, drift_lon, 3200, irregular=False),
                }
            )
        return result

    @staticmethod
    def _zone_points(latitude: float, longitude: float, radius_m: int, irregular: bool) -> list[dict[str, float]]:
        points: list[dict[str, float]] = []
        radius_deg = radius_m / 111_000
        count = 10 if not irregular else 8
        for index in range(count):
            angle = (math.pi * 2 * index) / count
            variance = 1.0 + (math.sin(index * 1.7) * 0.12 if irregular else 0)
            points.append(
                {
                    "latitude": round(latitude + math.sin(angle) * radius_deg * variance, 6),
                    "longitude": round(longitude + math.cos(angle) * radius_deg * variance, 6),
                }
            )
        return points

    def _compose_briefing(
        self,
        response: Any,
        weather: WeatherSnapshot,
        incidents: list[Incident],
        facilities: list[dict[str, Any]],
        missions: list[dict[str, Any]],
        state: SimulationState,
    ) -> str:
        critical = sum(1 for incident in incidents if incident.severity == IncidentSeverity.CRITICAL)
        hospital_alerts = sum(1 for item in facilities if item.get("kind") == "hospital" and item.get("alert_level") == "critical")
        shelter_alerts = sum(1 for item in facilities if item.get("kind") == "shelter" and item.get("alert_level") == "critical")
        mission_titles = ", ".join(item["title"] for item in missions[:3]) if missions else "no active mission tasks"
        weather_note = weather.summary
        return (
            f"{response.summary} {weather_note}. "
            f"{critical} critical incidents remain active. "
            f"{hospital_alerts} hospitals and {shelter_alerts} shelters are under pressure. "
            f"Primary missions: {mission_titles}."
        )

    def _world_metrics(
        self,
        incidents: list[Incident],
        responders: list[dict[str, Any]],
        vehicles: list[dict[str, Any]],
        facilities: list[dict[str, Any]],
        weather: WeatherSnapshot,
        missions: list[dict[str, Any]],
        state: SimulationState,
    ) -> dict[str, Any]:
        responders_available = sum(1 for item in responders if item.get("status") not in {"off duty", "off_duty"})
        vehicles_busy = sum(1 for item in vehicles if item.get("status") not in {"available", "waiting"})
        hospital_capacity = sum(item.get("capacity", 0) or 0 for item in facilities if item.get("kind") == "hospital")
        hospital_occupancy = sum(item.get("occupancy", 0) or 0 for item in facilities if item.get("kind") == "hospital")
        shelter_capacity = sum(item.get("capacity", 0) or 0 for item in facilities if item.get("kind") == "shelter")
        shelter_occupancy = sum(item.get("occupancy", 0) or 0 for item in facilities if item.get("kind") == "shelter")
        fuel_level = int(sum(item.get("fuel_level", 0) or 0 for item in vehicles) / max(1, len(vehicles)))
        medical_supply = max(0, 1000 - shelter_occupancy - hospital_occupancy // 2 - state.tick * 5)
        return {
            "active_incidents": len(incidents),
            "critical_incidents": sum(1 for item in incidents if item.severity == IncidentSeverity.CRITICAL),
            "responders_total": len(responders),
            "responders_available": responders_available,
            "vehicles_total": len(vehicles),
            "vehicles_busy": vehicles_busy,
            "hospital_capacity": hospital_capacity,
            "hospital_occupancy": hospital_occupancy,
            "shelter_capacity": shelter_capacity,
            "shelter_occupancy": shelter_occupancy,
            "fuel_level": fuel_level,
            "medical_supply_level": medical_supply,
            "weather": weather.summary,
            "mission_count": len(missions),
            "scenario": state.scenario_name,
            "tick_interval_seconds": state.tick_interval_seconds,
        }

    @staticmethod
    def _command_list(response: Any, incidents: list[Incident], weather: WeatherSnapshot, missions: list[dict[str, Any]]) -> list[str]:
        commands = list(response.action_plan[:3])
        if weather.flood_warning:
            commands.append("Stage boats and elevate shelter routing before the next rainfall pulse.")
        if weather.heatwave_warning:
            commands.append("Pre-position medical teams and hydration supplies for heat stress risk.")
        if any(item.hazard_type == HazardType.FIRE for item in incidents):
            commands.append("Maintain fire containment lines and keep aerial assets ready for spot fires.")
        if missions:
            commands.append(f"Track {len(missions)} live missions on the map and verify ETA drift each cycle.")
        return commands[:6]

    @staticmethod
    def _timeline_json(event: TimelineEvent) -> dict[str, Any]:
        payload = deepcopy(event.payload) if event.payload else None
        return {
            "id": event.id,
            "category": event.category,
            "title": event.title,
            "narrative": event.narrative,
            "severity": event.severity,
            "payload": payload,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }

    def _move_towards(
        self,
        start_lat: float,
        start_lon: float,
        dest_lat: float,
        dest_lon: float,
        speed_kph: float,
        seconds: int,
    ) -> tuple[float, float]:
        distance = self._distance_km(start_lat, start_lon, dest_lat, dest_lon)
        if distance <= 0.01:
            return round(dest_lat, 6), round(dest_lon, 6)
        travel = speed_kph * max(1, seconds) / 3600
        ratio = min(1.0, travel / distance)
        return round(start_lat + (dest_lat - start_lat) * ratio, 6), round(start_lon + (dest_lon - start_lon) * ratio, 6)

    @staticmethod
    def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return math.hypot(lat2 - lat1, lon2 - lon1) * 111

    def _eta_minutes(self, current_lat: float, current_lon: float, dest_lat: float, dest_lon: float, speed_kph: float) -> int:
        distance = self._distance_km(current_lat, current_lon, dest_lat, dest_lon)
        return max(1, int((distance / max(speed_kph, 1.0)) * 60))

    @staticmethod
    def _fuel_burn(kind: str, weather: WeatherSnapshot) -> int:
        burn = {
            "ambulance": 4,
            "fire_truck": 5,
            "police_vehicle": 4,
            "helicopter": 9,
            "boat": 4,
            "drone": 2,
            "supply_truck": 3,
            "command_vehicle": 3,
        }.get(kind, 3)
        if weather.condition in {WeatherCondition.STORM, WeatherCondition.THUNDERSTORM}:
            burn += 1
        return burn

    def _advance_incident_lifecycle(self, rng: random.Random, weather: WeatherSnapshot, tick: int) -> None:
        incidents = list(self.db.scalars(select(Incident).order_by(Incident.created_at.asc())).all())
        for incident in incidents[:40]:
            previous_status = incident.status
            if previous_status in {IncidentStatus.RESOLVED, IncidentStatus.CLOSED}:
                continue
            transition_roll = rng.random()
            if incident.status == IncidentStatus.NEW and transition_roll > 0.45:
                incident.status = IncidentStatus.TRIAGED
            elif incident.status == IncidentStatus.TRIAGED and transition_roll > 0.55:
                incident.status = IncidentStatus.DISPATCHED
            elif incident.status == IncidentStatus.DISPATCHED and transition_roll > 0.45:
                incident.status = IncidentStatus.RESPONDING
            elif incident.status == IncidentStatus.RESPONDING and transition_roll > 0.6:
                incident.status = IncidentStatus.CONTAINED
            elif incident.status == IncidentStatus.CONTAINED and transition_roll > 0.65:
                incident.status = IncidentStatus.RESOLVED
            elif incident.status == IncidentStatus.RESOLVED and transition_roll > 0.75:
                incident.status = IncidentStatus.CLOSED

            if weather.flood_warning and incident.hazard_type == HazardType.FLOOD and incident.status in {
                IncidentStatus.NEW,
                IncidentStatus.TRIAGED,
                IncidentStatus.DISPATCHED,
                IncidentStatus.RESPONDING,
            }:
                incident.number_of_people = min(incident.number_of_people + rng.randint(1, 12), 500)
            if incident.hazard_type == HazardType.FIRE and weather.condition in {WeatherCondition.WIND, WeatherCondition.STORM, WeatherCondition.THUNDERSTORM}:
                incident.number_of_people = min(incident.number_of_people + rng.randint(0, 8), 500)
            if previous_status != incident.status:
                self._append_replay_event(
                    incident,
                    f"Status changed from {previous_status.value} to {incident.status.value}",
                    f"{incident.title} moved to {incident.status.value} during simulation tick {tick}.",
                )
                self._record_event(
                    "timeline",
                    f"Incident {incident.status.value}",
                    f"{incident.title} is now {incident.status.value}.",
                    "warning" if incident.status in {IncidentStatus.DISPATCHED, IncidentStatus.RESPONDING} else "info",
                    {"incident_id": incident.id, "status": incident.status.value},
                )
            self._update_incident_impact(incident, weather, rng)

    @staticmethod
    def _append_replay_event(incident: Incident, label: str, narrative: str) -> None:
        events = list(incident.replay_events or [])
        events.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "label": label,
                "narrative": narrative,
                "severity": incident.severity.value,
            }
        )
        incident.replay_events = events[-12:]

    def _update_incident_impact(self, incident: Incident, weather: WeatherSnapshot, rng: random.Random) -> None:
        spread = {
            HazardType.FLOOD: 1.18 if weather.flood_warning else 1.04,
            HazardType.FIRE: 1.16 if weather.condition in {WeatherCondition.WIND, WeatherCondition.STORM, WeatherCondition.THUNDERSTORM} else 1.05,
            HazardType.HAZMAT: 1.1,
            HazardType.EARTHQUAKE: 1.04,
            HazardType.MEDICAL: 1.01,
            HazardType.ROAD_ACCIDENT: 1.0,
            HazardType.SECURITY: 0.98,
            HazardType.OTHER: 1.0,
        }[incident.hazard_type]
        affected_population = int((incident.number_of_people or 0) * spread)
        casualties = min(affected_population // 14, 60 if incident.severity == IncidentSeverity.CRITICAL else 22)
        damage_estimate = affected_population * (320 if incident.hazard_type in {HazardType.FIRE, HazardType.FLOOD, HazardType.EARTHQUAKE, HazardType.HAZMAT} else 180)
        smoke_radius = 0
        flood_radius = 0
        if incident.hazard_type == HazardType.FIRE:
            smoke_radius = int(1200 + casualties * 12 + rng.randint(0, 260))
        if incident.hazard_type == HazardType.FLOOD:
            flood_radius = int(1500 + affected_population * 9 + rng.randint(0, 220))
        impact = {
            "affected_population": affected_population,
            "casualties_estimated": casualties,
            "damage_estimate_usd": damage_estimate,
            "smoke_radius_m": smoke_radius,
            "flood_radius_m": flood_radius,
            "spread_factor": round(spread, 2),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        analysis = dict(incident.analysis or {})
        analysis["impact"] = impact
        analysis["lifecycle"] = incident.status.value
        incident.analysis = analysis
        if incident.status in {IncidentStatus.RESPONDING, IncidentStatus.CONTAINED}:
            incident.severity_score = min(100, (incident.severity_score or 65) + 1)
        if incident.status in {IncidentStatus.RESOLVED, IncidentStatus.CLOSED}:
            incident.severity_score = max(25, (incident.severity_score or 45) - 2)

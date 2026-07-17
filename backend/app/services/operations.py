"""Operational service layer for incidents, resources, and live updates."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from math import hypot
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import IncidentSeverity, IncidentStatus, MessageKind, ReportKind, ResourceKind, ResourceStatus
from app.core.security import Role
from app.models import Assignment, AuditLog, Incident, IncidentAttachment, Location, Message, Notification, Report, Resource, RoadClosure, TimelineEvent, User
from app.repositories.assignments import AssignmentRepository
from app.repositories.incidents import IncidentRepository
from app.repositories.notifications import NotificationRepository
from app.repositories.resources import ResourceRepository
from app.repositories.users import UserRepository
from app.schemas import (
    AICommanderResponse,
    AnalyticsPoint,
    AnalyticsSummary,
    AssignmentCreate,
    DashboardSummary,
    IncidentAnalysis,
    IncidentCreate,
    IncidentRead,
    IncidentUpdate,
    MessageCreate,
    NotificationRead,
    MissionAction,
    MissionControlSummary,
    ReportCreate,
    ResourceCreate,
    SearchResponse,
    SearchResult,
)
from app.services.ai import AIContext, AIIncidentCommander
from app.services.simulation import SimulationService
from app.realtime.manager import broadcaster


class OperationsService:
    def __init__(self, db: Session):
        self.db = db
        self.ai = AIIncidentCommander()
        self.incidents = IncidentRepository(db)
        self.resources = ResourceRepository(db)
        self.notifications = NotificationRepository(db)
        self.assignments = AssignmentRepository(db)
        self.users = UserRepository(db)

    def dashboard(self) -> DashboardSummary:
        incidents = self.incidents.list()
        resources = self.resources.list()
        recent_notifications = [NotificationRead.model_validate(item) for item in self.notifications.list_recent(8)]
        available_responders = len(self.users.list_active_responders())
        live_incidents = [IncidentRead.model_validate(item) for item in incidents[:8]]
        ai_recommendations = self._dashboard_recommendations(incidents, resources)
        weather = SimulationService(self.db).current_weather()
        active_closures = len(SimulationService(self.db).road_closures())
        community_resources = self._community_resource_count(resources)
        shelters_open = self._community_resource_count(resources, {"shelter", "school", "church", "mosque", "community_hall"})
        food_stores = self._community_resource_count(resources, {"food", "community_kitchen", "food_store"})
        water_stocks = self._community_resource_count(resources, {"water", "water_tank"})
        medical_supplies = self._community_resource_count(resources, {"medical_supplies", "clinic", "hospital"})
        weather_alerts = 1 if weather and (weather.flood_warning or weather.heatwave_warning) else 0
        people_missing = sum(
            1
            for incident in incidents
            if incident.hazard_type.value in {"missing_child", "missing_elderly"}
        )
        families_displaced = sum(
            incident.number_of_people for incident in incidents if incident.hazard_type.value in {"flood", "landslide", "boat_accident"}
        )
        return DashboardSummary(
            people_safe=max(0, sum(incident.number_of_people for incident in incidents) - people_missing - families_displaced),
            people_missing=people_missing,
            families_displaced=families_displaced,
            shelters_open=shelters_open,
            roads_closed=active_closures,
            volunteers_active=available_responders,
            community_resources_available=community_resources,
            medical_supplies=medical_supplies,
            clean_water=water_stocks,
            food_stocks=food_stores,
            weather_alerts=weather_alerts,
            high_risk_villages=min(7, self.incidents.critical_count() + weather_alerts + active_closures),
            total_active_incidents=self.incidents.active_count(),
            critical_incidents=self.incidents.critical_count(),
            available_responders=available_responders,
            hospitals=self._community_resource_count(resources, {"hospital", "clinic"}),
            shelters=shelters_open,
            fire_stations=self._community_resource_count(resources, {"fire_station"}),
            police_units=self._community_resource_count(resources, {"police_station"}),
            ambulances=self._community_resource_count(resources, {"ambulance", "rescue_boat"}),
            recent_alerts=recent_notifications,
            live_incidents=live_incidents,
            ai_recommendations=ai_recommendations,
        )

    def analytics(self) -> AnalyticsSummary:
        incidents = self.incidents.list()
        by_day: dict[str, int] = {}
        for incident in incidents:
            day = incident.created_at.date().isoformat()
            by_day[day] = by_day.get(day, 0) + 1
        incident_points = [AnalyticsPoint(label=day, value=count) for day, count in sorted(by_day.items())[-7:]]
        response_points = [
            AnalyticsPoint(label=incident.title[:20], value=float(incident.estimated_response_time_minutes or 0))
            for incident in incidents[:6]
        ]
        utilization = [
            AnalyticsPoint(label=resource.name, value=100 if resource.status == ResourceStatus.BUSY else 62 if resource.status == ResourceStatus.AVAILABLE else 20)
            for resource in self.resources.list()[:6]
        ]
        severity_distribution = [
            AnalyticsPoint(label=severity.value, value=sum(1 for incident in incidents if incident.severity == severity))
            for severity in IncidentSeverity
        ]
        mission_completion_rate = [
            AnalyticsPoint(label="completed", value=sum(1 for assignment in self.assignments.list() if assignment.status == "completed")),
            AnalyticsPoint(label="active", value=sum(1 for assignment in self.assignments.list() if assignment.status != "completed")),
        ]
        return AnalyticsSummary(
            incidents_over_time=incident_points,
            response_time=response_points,
            resource_utilization=utilization,
            severity_distribution=severity_distribution,
            mission_completion_rate=mission_completion_rate,
        )

    def list_incidents(self) -> list[IncidentRead]:
        return [IncidentRead.model_validate(item) for item in self.incidents.list()]

    def create_incident(self, payload: IncidentCreate, current_user: User | None = None) -> IncidentRead:
        reporter_role = current_user.role.value if current_user else "public_user"
        trust_score = self._reporter_trust_score(current_user)
        incident = Incident(
            title=payload.title,
            description=payload.description,
            latitude=payload.latitude,
            longitude=payload.longitude,
            severity=payload.severity,
            hazard_type=payload.hazard_type,
            number_of_people=payload.number_of_people,
            status=payload.status,
            assigned_team=payload.assigned_team,
            created_by_id=current_user.id if current_user else None,
        )
        analysis = self.ai.analyze_incident(
            AIContext(
                title=payload.title,
                description=payload.description,
                severity=payload.severity,
                hazard_type=payload.hazard_type,
                number_of_people=payload.number_of_people,
                latitude=payload.latitude,
                longitude=payload.longitude,
            )
        )
        self._apply_analysis(incident, analysis)
        incident.analysis = {
            **(incident.analysis or {}),
            "reporter_role": reporter_role,
            "trust_score": trust_score,
            "verification_status": "pending",
            "confirmed_reports": 0,
            "lifecycle": [
                {"status": "reported", "timestamp": datetime.now(timezone.utc).isoformat(), "by": reporter_role},
            ],
        }
        self.db.add(incident)
        self.db.flush()
        location = Location(
            label=payload.title,
            latitude=payload.latitude,
            longitude=payload.longitude,
            source="incident",
            incident_id=incident.id,
        )
        self.db.add(location)
        for url in payload.image_urls:
            self.db.add(IncidentAttachment(incident_id=incident.id, kind="image", url=url, filename=url.rsplit("/", 1)[-1]))
        for url in payload.voice_note_urls:
            self.db.add(
                IncidentAttachment(incident_id=incident.id, kind="voice", url=url, filename=url.rsplit("/", 1)[-1])
            )
        self.db.add(
            Notification(
                user_id=current_user.id if current_user else 1,
                title=f"New incident: {payload.title}",
                body=f"{payload.hazard_type.value} incident triaged as {analysis.priority}",
                severity="critical" if analysis.severity_score >= 90 else "warning",
                action_url=f"/incidents/{incident.id}",
            )
        )
        self.db.commit()
        self.db.refresh(incident)
        broadcaster.publish("incident", f"Incident created: {incident.title}", {"incident_id": incident.id})
        return IncidentRead.model_validate(incident)

    def update_incident(self, incident_id: int, payload: IncidentUpdate) -> IncidentRead:
        incident = self.incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(incident, field, value)
        if payload.status is not None:
            self._update_lifecycle(incident, payload.status.value, source="status_update")
        self.db.commit()
        self.db.refresh(incident)
        broadcaster.publish("incident", f"Incident updated: {incident.title}", {"incident_id": incident.id})
        return IncidentRead.model_validate(incident)

    def analyze_incident(self, incident_id: int) -> IncidentAnalysis:
        incident = self.incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")
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
        self._apply_analysis(incident, analysis)
        self.db.commit()
        broadcaster.publish("incident", f"Incident analyzed: {incident.title}", {"incident_id": incident.id})
        return analysis

    def create_resource(self, payload: ResourceCreate) -> dict[str, Any]:
        resource = Resource(**payload.model_dump())
        self.db.add(resource)
        self.db.flush()
        self._audit(
            action="resource.create",
            entity_type="resource",
            entity_id=resource.id,
            severity="info",
            actor_id=None,
            details=payload.model_dump(),
        )
        self.db.commit()
        self.db.refresh(resource)
        broadcaster.publish("resource", f"Resource updated: {resource.name}", {"resource_id": resource.id})
        return self._resource_dict(resource)

    def list_resources(self) -> list[dict[str, Any]]:
        return [self._resource_dict(resource) for resource in self.resources.list()]

    def create_assignment(self, payload: AssignmentCreate) -> dict[str, Any]:
        assignment = Assignment(**payload.model_dump())
        self.db.add(assignment)
        self.db.flush()
        incident = self.incidents.get(payload.incident_id)
        if incident:
            incident.status = IncidentStatus.DISPATCHED
        self._audit(
            action="assignment.create",
            entity_type="assignment",
            entity_id=assignment.id,
            severity="info",
            actor_id=None,
            details=payload.model_dump(),
        )
        self.db.commit()
        self.db.refresh(assignment)
        broadcaster.publish("assignment", f"Task assigned to responder {payload.assignee_id}", {"assignment_id": assignment.id})
        return self._assignment_dict(assignment)

    def list_assignments(self) -> list[dict[str, Any]]:
        return [self._assignment_dict(item) for item in self.assignments.list()]

    def create_report(self, payload: ReportCreate, generated_by_id: int | None = None) -> dict[str, Any]:
        report = Report(**payload.model_dump(), generated_by_id=generated_by_id)
        self.db.add(report)
        self.db.flush()
        self._audit(
            action="report.create",
            entity_type="report",
            entity_id=report.id,
            severity="info",
            actor_id=generated_by_id,
            details=payload.model_dump(),
        )
        self.db.commit()
        self.db.refresh(report)
        broadcaster.publish("notification", f"Report generated: {report.title}", {"report_id": report.id})
        return self._report_dict(report)

    def list_reports(self) -> list[dict[str, Any]]:
        reports = self.db.scalars(select(Report).order_by(Report.created_at.desc())).all()
        return [self._report_dict(report) for report in reports]

    def create_message(self, sender: User, payload: MessageCreate) -> dict[str, Any]:
        message = Message(
            incident_id=payload.incident_id,
            sender_id=sender.id,
            recipient_id=payload.recipient_id,
            kind=payload.kind,
            body=payload.body,
            extra_metadata=payload.metadata,
        )
        self.db.add(message)
        self.db.flush()
        self._audit(
            action="message.create",
            entity_type="message",
            entity_id=message.id,
            severity="info",
            actor_id=sender.id,
            details=payload.model_dump(),
        )
        self.db.commit()
        self.db.refresh(message)
        broadcaster.publish("message", payload.body, {"message_id": message.id, "incident_id": message.incident_id})
        return self._message_dict(message)

    def notifications_for_user(self, user_id: int) -> list[NotificationRead]:
        stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
        return [NotificationRead.model_validate(item) for item in self.db.scalars(stmt).all()]

    def mark_notification_read(self, notification_id: int) -> None:
        notification = self.db.get(Notification, notification_id)
        if notification:
            notification.read_at = datetime.now(timezone.utc)
            self._audit(
                action="notification.read",
                entity_type="notification",
                entity_id=notification.id,
                severity="info",
                actor_id=None,
                details={"title": notification.title},
            )
            self.db.commit()

    def commander_briefing(self) -> AICommanderResponse:
        incidents = [
            {
                "id": item.id,
                "title": item.title,
                "severity": item.severity.value,
                "hazard_type": item.hazard_type.value,
                "status": item.status.value,
                "number_of_people": item.number_of_people,
            }
            for item in self.incidents.list()
        ]
        resources = self.list_resources()
        return self.ai.command_briefing(incidents, resources)

    def mission_control(self) -> MissionControlSummary:
        incidents = self.incidents.list()
        resources = self.resources.list()
        active_responders = self.users.list_active_responders()
        simulation = SimulationService(self.db)
        weather = simulation.current_weather()

        priorities = self._mission_priorities(incidents)
        allocations = self._mission_recommendations(incidents, resources, active_responders)
        notes = [
            "Plans are generated from current incident severity, resource posture, and responder availability.",
            "Assignments favor the nearest available qualified responder and the first usable vehicle class.",
            "Weather and road closures should be reviewed before executing evacuation routes.",
        ]
        if weather:
            notes.append(weather.summary)

        return MissionControlSummary(
            summary=f"{len(incidents)} community incidents are under active review with {len(active_responders)} volunteers and first responders available.",
            priorities=priorities,
            available_responders=len(active_responders),
            available_vehicles=sum(1 for resource in resources if resource.kind in {ResourceKind.AMBULANCE, ResourceKind.FIRE_TRUCK, ResourceKind.POLICE_VEHICLE, ResourceKind.HELICOPTER, ResourceKind.BOAT, ResourceKind.DRONE} and resource.status == ResourceStatus.AVAILABLE),
            critical_incidents=sum(1 for incident in incidents if incident.severity == IncidentSeverity.CRITICAL),
            weather_summary=weather.summary if weather else None,
            recommended_actions=allocations,
            operational_notes=notes,
        )

    def auto_dispatch(self, limit: int = 3) -> list[dict[str, Any]]:
        mission = self.mission_control()
        dispatched: list[dict[str, Any]] = []
        for action in mission.recommended_actions[:limit]:
            payload = AssignmentCreate(
                incident_id=action.incident_id,
                assignee_id=action.responder_id or self._fallback_responder_id(),
                mission=f"Respond to {action.incident_title}",
                location=action.incident_title,
                priority=action.priority,
                eta_minutes=action.eta_minutes,
                instructions=action.instructions,
            )
            dispatched.append(self.create_assignment(payload))
        return dispatched

    def replay_incident(self, incident_id: int) -> list[dict[str, Any]]:
        incident = self.incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")
        base = incident.created_at
        steps = [
            {"timestamp": base.isoformat(), "label": "Report received", "narrative": f"{incident.title} was reported.", "severity": incident.severity.value},
            {
                "timestamp": (base + timedelta(minutes=4)).isoformat(),
                "label": "AI triage",
                "narrative": incident.ai_summary or "AI triaged the incident.",
                "severity": incident.severity.value,
            },
            {
                "timestamp": (base + timedelta(minutes=10)).isoformat(),
                "label": "Missions assigned",
                "narrative": f"{len(incident.assignments)} mission(s) linked to this incident.",
                "severity": incident.severity.value,
            },
            {
                "timestamp": (base + timedelta(minutes=18)).isoformat(),
                "label": "Resources dispatched",
                "narrative": "Responder assets were allocated and route tracking began.",
                "severity": incident.severity.value,
            },
        ]
        if incident.replay_events:
            for event in incident.replay_events:
                steps.append(
                    {
                        "timestamp": event["timestamp"],
                        "label": event["label"],
                        "narrative": event["narrative"],
                        "severity": event["severity"],
                    }
                )
        steps.sort(key=lambda item: item["timestamp"])
        return steps

    def search(self, query: str, kind: str | None = None, limit: int = 50) -> SearchResponse:
        term = query.strip().lower()
        if not term:
            return SearchResponse(query=query, total=0, results=[])

        results: list[SearchResult] = []

        def include(entity_type: str, entity_id: int, title: str, subtitle: str, *, severity: str | None = None, status: str | None = None, url: str | None = None, created_at: datetime | None = None) -> None:
            if kind and kind != entity_type:
                return
            results.append(
                SearchResult(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    title=title,
                    subtitle=subtitle,
                    severity=severity,
                    status=status,
                    url=url,
                    created_at=created_at,
                )
            )

        for incident in self.incidents.list():
            blob = " ".join(
                [
                    incident.title,
                    incident.description,
                    incident.hazard_type.value,
                    incident.severity.value,
                    incident.status.value,
                    incident.assigned_team or "",
                ]
            ).lower()
            if term in blob:
                include(
                    "incident",
                    incident.id,
                    incident.title,
                    incident.hazard_type.value.replace("_", " ").title(),
                    severity=incident.severity.value,
                    status=incident.status.value,
                    url=f"/incidents/{incident.id}",
                    created_at=incident.created_at,
                )

        for resource in self.resources.list():
            blob = " ".join([resource.name, resource.kind.value, resource.status.value, resource.unit_name or "", resource.notes or ""]).lower()
            if term in blob:
                include(
                    "resource",
                    resource.id,
                    resource.name,
                    f"{resource.kind.value.replace('_', ' ').title()} · {resource.status.value}",
                    severity=resource.status.value,
                    status=resource.status.value,
                    url="/resources",
                    created_at=resource.created_at,
                )

        for user in self.db.scalars(select(User)).all():
            blob = " ".join([user.full_name, user.email, user.badge_id or "", user.role.value]).lower()
            if term in blob:
                include(
                    "user",
                    user.id,
                    user.full_name,
                    f"{user.role.value.replace('_', ' ').title()} · {user.email}",
                    severity="info",
                    status="active" if user.is_active else "inactive",
                    url="/admin",
                    created_at=user.created_at,
                )

        for assignment in self.assignments.list():
            blob = " ".join([assignment.mission, assignment.location, assignment.instructions, assignment.priority, assignment.status]).lower()
            if term in blob:
                include(
                    "assignment",
                    assignment.id,
                    assignment.mission,
                    assignment.location,
                    severity=assignment.priority,
                    status=assignment.status,
                    url="/assignments",
                    created_at=assignment.created_at,
                )

        for report in self.db.scalars(select(Report).order_by(Report.created_at.desc())).all():
            blob = " ".join([report.title, report.summary, report.content, report.kind.value]).lower()
            if term in blob:
                include(
                    "report",
                    report.id,
                    report.title,
                    report.kind.value.replace("_", " ").title(),
                    severity=report.kind.value,
                    url="/reports",
                    created_at=report.created_at,
                )

        for notification in self.db.scalars(select(Notification).order_by(Notification.created_at.desc())).all():
            blob = " ".join([notification.title, notification.body, notification.severity]).lower()
            if term in blob:
                include(
                    "notification",
                    notification.id,
                    notification.title,
                    notification.body,
                    severity=notification.severity,
                    status="read" if notification.read_at else "unread",
                    url="/notifications",
                    created_at=notification.created_at,
                )

        for closure in self.db.scalars(select(RoadClosure).order_by(RoadClosure.created_at.desc())).all():
            blob = " ".join([closure.title, closure.reason, closure.severity]).lower()
            if term in blob:
                include(
                    "closure",
                    closure.id,
                    closure.title,
                    closure.reason,
                    severity=closure.severity,
                    status="active" if closure.is_active else "cleared",
                    url="/weather",
                    created_at=closure.created_at,
                )

        world_snapshot = SimulationService(self.db).current_world()
        if world_snapshot:
            blob = " ".join([world_snapshot.scenario_name, world_snapshot.briefing, str(world_snapshot.payload)]).lower()
            if term in blob:
                include(
                    "simulation_world",
                    world_snapshot.id,
                    f"{world_snapshot.scenario_name.replace('_', ' ').title()} snapshot",
                    world_snapshot.briefing,
                    severity="info",
                    status="live",
                    url="/demo",
                    created_at=world_snapshot.created_at,
                )

        for event in self.db.scalars(select(TimelineEvent).order_by(TimelineEvent.created_at.desc())).all():
            blob = " ".join([event.category, event.title, event.narrative, event.severity, str(event.payload or {})]).lower()
            if term in blob:
                include(
                    "timeline",
                    event.id,
                    event.title,
                    event.narrative,
                    severity=event.severity,
                    status=event.category,
                    url="/demo",
                    created_at=event.created_at,
                )

        results.sort(key=lambda item: (item.severity != "critical", item.created_at or datetime.min.replace(tzinfo=timezone.utc)), reverse=False)
        return SearchResponse(query=query, total=len(results), results=results[:limit])

    def export_reports_csv(self, kind: str | None = None) -> str:
        reports = self._reports_for_kind(kind)
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=["id", "kind", "title", "summary", "incident_id", "created_at"])
        writer.writeheader()
        for report in reports:
            writer.writerow(
                {
                    "id": report.id,
                    "kind": report.kind.value,
                    "title": report.title,
                    "summary": report.summary,
                    "incident_id": report.incident_id or "",
                    "created_at": report.created_at.isoformat(),
                }
            )
        return buffer.getvalue()

    def export_reports_pdf(self, kind: str | None = None) -> bytes:
        reports = self._reports_for_kind(kind)
        lines = [
            "Sentinel AI Reports Export",
            f"Generated: {datetime.now(timezone.utc).isoformat()}",
            "",
        ]
        for report in reports:
            lines.extend(
                [
                    f"{report.title}",
                    f"Kind: {report.kind.value}",
                    f"Summary: {report.summary}",
                    f"Created: {report.created_at.isoformat()}",
                    "",
                ]
            )
        return self._minimal_pdf(lines)

    def admin_overview(self) -> dict[str, int]:
        users = list(self.db.scalars(select(User)).all())
        return {
            "total_users": len(users),
            "active_users": sum(1 for user in users if user.is_active),
            "inactive_users": sum(1 for user in users if not user.is_active),
            "administrators": sum(1 for user in users if user.role in {Role.ADMINISTRATOR, Role.COUNTY_ADMIN}),
            "commanders": sum(1 for user in users if user.role in {Role.INCIDENT_COMMANDER, Role.COMMUNITY_LEADER}),
            "dispatchers": sum(1 for user in users if user.role in {Role.DISPATCHER, Role.COMMUNITY_VOLUNTEER}),
            "responders": sum(1 for user in users if user.role in {Role.FIELD_RESPONDER, Role.COMMUNITY_VOLUNTEER}),
            "open_incidents": self.incidents.active_count(),
            "critical_incidents": self.incidents.critical_count(),
            "available_resources": sum(1 for resource in self.resources.list() if resource.status == ResourceStatus.AVAILABLE),
            "audit_events_24h": self.db.scalar(
                select(func.count()).select_from(AuditLog).where(
                    AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
                )
            )
            or 0,
        }

    def list_audit_logs(self, limit: int = 100) -> list[AuditLog]:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
        return list(self.db.scalars(stmt).all())

    def update_user(self, user_id: int, payload: dict[str, Any]) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise ValueError("User not found")
        allowed = {"full_name", "phone_number", "badge_id", "avatar_url", "is_active", "is_on_duty", "role", "username", "village", "skills"}
        for key, value in payload.items():
            if key in allowed:
                setattr(user, key, value)
        self._audit(
            action="user.update",
            entity_type="user",
            entity_id=user.id,
            severity="warning" if payload.get("is_active") is False else "info",
            actor_id=None,
            details=payload,
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def _reports_for_kind(self, kind: str | None) -> list[Report]:
        reports = list(self.db.scalars(select(Report).order_by(Report.created_at.desc())).all())
        if kind:
            reports = [report for report in reports if report.kind.value == kind]
        return reports

    @staticmethod
    def _minimal_pdf(lines: list[str]) -> bytes:
        def escape(value: str) -> str:
            return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

        content_lines = ["BT", "/F1 12 Tf", "72 760 Td"]
        first = True
        for line in lines:
            safe = escape(line)
            if first:
                content_lines.append(f"({safe}) Tj")
                first = False
            else:
                content_lines.append("T*")
                content_lines.append(f"({safe}) Tj")
        content_lines.append("ET")
        content = "\n".join(content_lines).encode("latin-1")
        objects = []
        objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
        objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
        objects.append(
            (
                f"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> "
                f"/Contents 5 0 R >> endobj\n"
            ).encode("latin-1")
        )
        objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
        objects.append(f"5 0 obj << /Length {len(content)} >> stream\n".encode("latin-1") + content + b"\nendstream endobj\n")
        pdf = bytearray(b"%PDF-1.4\n")
        offsets = [0]
        for obj in objects:
            offsets.append(len(pdf))
            pdf.extend(obj)
        xref_pos = len(pdf)
        pdf.extend(f"xref\n0 {len(objects)+1}\n".encode("latin-1"))
        pdf.extend(b"0000000000 65535 f \n")
        for offset in offsets[1:]:
            pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
        pdf.extend(
            (
                "trailer << /Size {size} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".format(
                    size=len(objects) + 1, xref=xref_pos
                )
            ).encode("latin-1")
        )
        return bytes(pdf)

    def _mission_priorities(self, incidents: list[Incident]) -> list[str]:
        ordered = sorted(incidents, key=lambda item: (-(item.severity_score or 0), item.status == IncidentStatus.RESOLVED, -(item.number_of_people or 0)))
        return [f"{item.title} ({item.priority or 'Pending triage'})" for item in ordered[:5]] or ["No active incidents"]

    def _mission_recommendations(
        self,
        incidents: list[Incident],
        resources: list[Resource],
        responders: list[User],
    ) -> list[MissionAction]:
        available_responders = [user for user in responders if user.is_active and user.is_on_duty]
        available_resources = [resource for resource in resources if resource.status == ResourceStatus.AVAILABLE]
        used_responder_ids: set[int] = set()
        used_resource_ids: set[int] = set()
        actions: list[MissionAction] = []

        for incident in sorted(incidents, key=lambda item: (-(item.severity_score or 0), -(item.number_of_people or 0)))[:6]:
            responder = next((user for user in available_responders if user.id not in used_responder_ids), None)
            resource = self._resource_for_incident(incident, available_resources, used_resource_ids)
            if responder:
                used_responder_ids.add(responder.id)
            if resource:
                used_resource_ids.add(resource.id)
            instructions = self._mission_instructions(incident, responder, resource)
            actions.append(
                MissionAction(
                    incident_id=incident.id,
                    incident_title=incident.title,
                    responder_id=responder.id if responder else None,
                    responder_name=responder.full_name if responder else None,
                    resource_name=resource.name if resource else None,
                    priority=incident.priority or "P3 - Important",
                    eta_minutes=max(5, incident.estimated_response_time_minutes or 15),
                    instructions=instructions,
                    explanation=self._mission_explanation(incident, responder, resource),
                )
            )
        return actions

    def _resource_for_incident(
        self,
        incident: Incident,
        resources: list[Resource],
        used_resource_ids: set[int],
    ) -> Resource | None:
        desired = self._resource_types_for_hazard(incident.hazard_type)
        candidates = [resource for resource in resources if resource.id not in used_resource_ids and resource.kind.value in desired]
        if not candidates:
            candidates = [resource for resource in resources if resource.id not in used_resource_ids]
        if not candidates:
            return None
        return min(candidates, key=lambda resource: self._distance(resource.latitude, resource.longitude, incident.latitude, incident.longitude))

    @staticmethod
    def _resource_types_for_hazard(hazard: Any) -> set[str]:
        mapping = {
            "flood": {"ambulance", "boat", "helicopter", "shelter", "school", "church", "mosque"},
            "river_overflow": {"boat", "helicopter", "water_tank", "community_hall"},
            "fire": {"fire_truck", "ambulance", "water", "generator", "community_hall"},
            "road_accident": {"ambulance", "police_vehicle", "drone", "bodaboda"},
            "boat_accident": {"boat", "rescue_boat", "ambulance", "clinic"},
            "medical": {"ambulance", "medical_team", "hospital", "clinic"},
            "snake_bite": {"ambulance", "clinic", "medical_team"},
            "landslide": {"ambulance", "tractor", "community_hall", "school"},
            "collapsed_bridge": {"tractor", "police_vehicle", "bodaboda", "drone"},
            "heavy_rain": {"shelter", "school", "church", "mosque", "water_tank"},
            "water_shortage": {"water_tank", "generator", "community_kitchen", "food_store"},
            "disease_outbreak": {"medical_team", "hospital", "clinic", "community_hall"},
            "electric_pole_down": {"generator", "community_hall", "police_vehicle"},
            "tree_blocking_road": {"tractor", "private_vehicle", "bodaboda"},
            "livestock_disease": {"clinic", "tractor", "community_hall"},
            "missing_child": {"volunteer", "bodaboda", "drone", "community_leader"},
            "missing_elderly": {"volunteer", "bodaboda", "community_leader", "drone"},
            "other": {"ambulance", "drone", "volunteer", "community_hall"},
        }
        return mapping.get(getattr(hazard, "value", str(hazard)), {"ambulance", "drone"})

    @staticmethod
    def _distance(lat1: float | None, lon1: float | None, lat2: float, lon2: float) -> float:
        if lat1 is None or lon1 is None:
            return float("inf")
        return hypot(lat1 - lat2, lon1 - lon2)

    @staticmethod
    def _mission_instructions(incident: Incident, responder: User | None, resource: Resource | None) -> str:
        responder_text = responder.full_name if responder else "nearest available responder"
        resource_text = resource.name if resource else "available support asset"
        return (
            f"Deploy {responder_text} with {resource_text} to {incident.title} at "
            f"{incident.latitude:.4f}, {incident.longitude:.4f}. Keep the message simple, share the location, and confirm the family or village is safe."
        )

    @staticmethod
    def _mission_explanation(incident: Incident, responder: User | None, resource: Resource | None) -> str:
        parts = [
            f"{incident.title} is a {incident.severity.value} incident with priority {incident.priority or 'pending triage'}.",
            f"A {responder.role.value if responder else 'community'} responder was selected for proximity and availability.",
        ]
        if resource:
            parts.append(f"{resource.name} is the closest matching resource and is currently available.")
        return " ".join(parts)

    def _fallback_responder_id(self) -> int:
        responder = self.db.scalar(
            select(User)
            .where(
                User.role.in_([Role.FIELD_RESPONDER, Role.DISPATCHER, Role.COMMUNITY_VOLUNTEER]),
                User.is_active.is_(True),
            )
            .order_by(User.id.asc())
        )
        if responder:
            return responder.id
        fallback = self.db.scalar(select(User).where(User.is_active.is_(True)).order_by(User.id.asc()))
        if fallback:
            return fallback.id
        raise ValueError("No available responder to assign")

    @staticmethod
    def _apply_analysis(incident: Incident, analysis: IncidentAnalysis) -> None:
        incident.analysis = analysis.model_dump()
        incident.severity_score = analysis.severity_score
        incident.priority = analysis.priority
        incident.estimated_response_time_minutes = analysis.estimated_response_time_minutes
        incident.risk_level = analysis.risk_level
        incident.suggested_action_plan = analysis.suggested_action_plan
        incident.recommended_resources = analysis.recommended_resources
        incident.escalation_probability = analysis.escalation_probability
        incident.ai_summary = analysis.explanation

    @staticmethod
    def _reporter_trust_score(current_user: User | None) -> int:
        if current_user is None:
            return 52
        mapping = {
            Role.COMMUNITY_LEADER: 92,
            Role.COUNTY_ADMIN: 95,
            Role.ADMINISTRATOR: 95,
            Role.COMMUNITY_VOLUNTEER: 82,
            Role.FIELD_RESPONDER: 88,
            Role.DISPATCHER: 86,
            Role.INCIDENT_COMMANDER: 90,
            Role.PUBLIC_USER: 55,
        }
        base = mapping.get(current_user.role, 70)
        if current_user.phone_number:
            base += 2
        if current_user.village:
            base += 1
        return min(99, base)

    def _update_lifecycle(self, incident: Incident, status: str, source: str = "system") -> None:
        analysis = dict(incident.analysis or {})
        lifecycle = list(analysis.get("lifecycle") or [])
        lifecycle.append(
            {
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "by": source,
            }
        )
        analysis["lifecycle"] = lifecycle
        if status in {"triaged", "dispatched", "responding", "contained", "resolved", "closed"}:
            analysis["verification_status"] = "confirmed" if status in {"dispatched", "responding", "contained", "resolved", "closed"} else analysis.get("verification_status", "pending")
        incident.analysis = analysis

    @staticmethod
    def _dashboard_recommendations(incidents: list[Incident], resources: list[Resource]) -> list[str]:
        recommendations = [
            "Send the nearest volunteers and bodabodas toward unresolved urgent reports.",
            "Confirm church, mosque, school, and hall shelter capacity before nightfall.",
            "Keep tractors, boats, and road crews near active closures so villages stay connected.",
        ]
        if sum(1 for r in resources if r.status == ResourceStatus.OFFLINE) > 0:
            recommendations.append("Audit offline resources and clear maintenance queues before new dispatches.")
        if any(i.severity == IncidentSeverity.CRITICAL for i in incidents):
            recommendations.append("Escalate the top critical incident to community leader review immediately.")
        return recommendations

    @staticmethod
    def _community_resource_count(resources: list[Resource], kinds: set[str] | None = None) -> int:
        if kinds is None:
            kinds = {
                "ambulance",
                "boat",
                "helicopter",
                "fire_truck",
                "police_vehicle",
                "community_hall",
                "church",
                "mosque",
                "school",
                "clinic",
                "hospital",
                "generator",
                "water_tank",
                "food_store",
                "community_kitchen",
                "tractor",
                "bodaboda",
                "private_vehicle",
                "rescue_boat",
                "volunteer",
            }
        return sum(1 for resource in resources if resource.kind.value in kinds and resource.status == ResourceStatus.AVAILABLE)

    @staticmethod
    def _resource_dict(resource: Resource) -> dict[str, Any]:
        return {
            "id": resource.id,
            "name": resource.name,
            "kind": resource.kind.value,
            "status": resource.status.value,
            "quantity": resource.quantity,
            "capacity": resource.capacity,
            "unit_name": resource.unit_name,
            "latitude": resource.latitude,
            "longitude": resource.longitude,
            "assigned_to_incident_id": resource.assigned_to_incident_id,
            "notes": resource.notes,
            "eta_minutes": resource.eta_minutes,
            "fuel_level": resource.fuel_level,
            "created_at": resource.created_at,
            "updated_at": resource.updated_at,
        }

    @staticmethod
    def _assignment_dict(assignment: Assignment) -> dict[str, Any]:
        return {
            "id": assignment.id,
            "incident_id": assignment.incident_id,
            "assignee_id": assignment.assignee_id,
            "mission": assignment.mission,
            "location": assignment.location,
            "priority": assignment.priority,
            "eta_minutes": assignment.eta_minutes,
            "instructions": assignment.instructions,
            "status": assignment.status,
            "completed_at": assignment.completed_at,
            "created_at": assignment.created_at,
        }

    @staticmethod
    def _report_dict(report: Report) -> dict[str, Any]:
        return {
            "id": report.id,
            "incident_id": report.incident_id,
            "kind": report.kind.value,
            "title": report.title,
            "summary": report.summary,
            "content": report.content,
            "pdf_url": report.pdf_url,
            "created_at": report.created_at,
        }

    @staticmethod
    def _message_dict(message: Message) -> dict[str, Any]:
        return {
            "id": message.id,
            "incident_id": message.incident_id,
            "sender_id": message.sender_id,
            "recipient_id": message.recipient_id,
            "kind": message.kind.value,
            "body": message.body,
            "metadata": message.extra_metadata,
            "created_at": message.created_at,
        }

    def _audit(
        self,
        action: str,
        entity_type: str,
        entity_id: int | None,
        severity: str,
        actor_id: int | None,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                severity=severity,
                actor_id=actor_id,
                details=details,
            )
        )

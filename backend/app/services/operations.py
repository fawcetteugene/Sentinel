"""Operational service layer for incidents, resources, and live updates."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import IncidentSeverity, IncidentStatus, MessageKind, ReportKind, ResourceStatus
from app.core.security import Role
from app.models import Assignment, Incident, IncidentAttachment, Location, Message, Notification, Report, Resource, User
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
    ReportCreate,
    ResourceCreate,
)
from app.services.ai import AIContext, AIIncidentCommander
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
        return DashboardSummary(
            total_active_incidents=self.incidents.active_count(),
            critical_incidents=self.incidents.critical_count(),
            available_responders=available_responders,
            hospitals=5,
            shelters=8,
            fire_stations=6,
            police_units=9,
            ambulances=sum(1 for r in resources if r.kind.value == "ambulance"),
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
        self.db.commit()
        self.db.refresh(resource)
        broadcaster.publish("resource", f"Resource updated: {resource.name}", {"resource_id": resource.id})
        return self._resource_dict(resource)

    def list_resources(self) -> list[dict[str, Any]]:
        return [self._resource_dict(resource) for resource in self.resources.list()]

    def create_assignment(self, payload: AssignmentCreate) -> dict[str, Any]:
        assignment = Assignment(**payload.model_dump())
        self.db.add(assignment)
        incident = self.incidents.get(payload.incident_id)
        if incident:
            incident.status = IncidentStatus.DISPATCHED
        self.db.commit()
        self.db.refresh(assignment)
        broadcaster.publish("assignment", f"Task assigned to responder {payload.assignee_id}", {"assignment_id": assignment.id})
        return self._assignment_dict(assignment)

    def list_assignments(self) -> list[dict[str, Any]]:
        return [self._assignment_dict(item) for item in self.assignments.list()]

    def create_report(self, payload: ReportCreate, generated_by_id: int | None = None) -> dict[str, Any]:
        report = Report(**payload.model_dump(), generated_by_id=generated_by_id)
        self.db.add(report)
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

    def replay_incident(self, incident_id: int) -> list[dict[str, Any]]:
        incident = self.incidents.get(incident_id)
        if not incident:
            raise ValueError("Incident not found")
        base = incident.created_at
        steps = [
            {"timestamp": base.isoformat(), "label": "Report received", "narrative": f"{incident.title} was reported.", "severity": incident.severity.value},
            {
                "timestamp": (base + timedelta(minutes=5)).isoformat(),
                "label": "AI triage",
                "narrative": incident.ai_summary or "AI triaged the incident.",
                "severity": incident.severity.value,
            },
            {
                "timestamp": (base + timedelta(minutes=15)).isoformat(),
                "label": "Resources dispatched",
                "narrative": "Responder assets were allocated.",
                "severity": incident.severity.value,
            },
        ]
        return steps

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
    def _dashboard_recommendations(incidents: list[Incident], resources: list[Resource]) -> list[str]:
        recommendations = [
            "Move the two nearest ambulances toward unresolved critical incidents.",
            "Confirm shelter capacity for flood-prone sectors before nightfall.",
            "Keep police units near active road closures to preserve access routes.",
        ]
        if sum(1 for r in resources if r.status == ResourceStatus.OFFLINE) > 0:
            recommendations.append("Audit offline resources and clear maintenance queues before new dispatches.")
        if any(i.severity == IncidentSeverity.CRITICAL for i in incidents):
            recommendations.append("Escalate the top critical incident to Incident Commander review immediately.")
        return recommendations

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

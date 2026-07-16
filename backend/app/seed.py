"""Database seed data for local development."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.enums import HazardType, IncidentSeverity, IncidentStatus, MessageKind, ReportKind, ResourceKind, ResourceStatus
from app.core.security import Role, hash_password
from app.models import Incident, Location, Message, Notification, Report, Resource, User


def seed_database(db: Session) -> None:
    if db.query(User).count() > 0:
        return

    users = [
        User(
            email="admin@sentinel.ai",
            full_name="System Administrator",
            password_hash=hash_password("admin123"),
            role=Role.ADMINISTRATOR,
            badge_id="ADM-001",
        ),
        User(
            email="commander@sentinel.ai",
            full_name="Amina Command",
            password_hash=hash_password("admin123"),
            role=Role.INCIDENT_COMMANDER,
            badge_id="IC-100",
        ),
        User(
            email="dispatcher@sentinel.ai",
            full_name="Jordan Dispatch",
            password_hash=hash_password("admin123"),
            role=Role.DISPATCHER,
            badge_id="DSP-204",
        ),
        User(
            email="responder@sentinel.ai",
            full_name="Casey Responder",
            password_hash=hash_password("admin123"),
            role=Role.FIELD_RESPONDER,
            badge_id="RSP-308",
        ),
    ]
    db.add_all(users)
    db.flush()

    incidents = [
        Incident(
            title="Rising River Flooding",
            description="Riverbank overflow affecting low-lying homes and a road bridge.",
            latitude=-1.286389,
            longitude=36.817223,
            severity=IncidentSeverity.CRITICAL,
            hazard_type=HazardType.FLOOD,
            number_of_people=120,
            status=IncidentStatus.DISPATCHED,
            assigned_team="Flood Response Alpha",
            created_by_id=users[1].id,
            severity_score=94,
            priority="P1 - Immediate",
            estimated_response_time_minutes=11,
            risk_level="extreme",
            suggested_action_plan=[
                "Dispatch rescue boats and ambulances",
                "Activate evacuation shelters",
                "Close low-lying roads and bridge approaches",
            ],
            recommended_resources=["ambulances", "boats or high-clearance vehicles", "shelter coordinators"],
            escalation_probability=0.94,
            ai_summary="Immediate evacuation and rescue escalation required for river overflow.",
            replay_events=[{"timestamp": datetime.now(timezone.utc).isoformat(), "label": "Initial report", "narrative": "Flood waters rising", "severity": "critical"}],
        ),
        Incident(
            title="Warehouse Fire",
            description="Industrial warehouse engulfed with smoke visible from adjacent district.",
            latitude=-1.299,
            longitude=36.79,
            severity=IncidentSeverity.HIGH,
            hazard_type=HazardType.FIRE,
            number_of_people=18,
            status=IncidentStatus.RESPONDING,
            assigned_team="Fire Unit Delta",
            created_by_id=users[2].id,
            severity_score=82,
            priority="P1 - Immediate",
            estimated_response_time_minutes=17,
            risk_level="high",
            suggested_action_plan=[
                "Establish a perimeter",
                "Attack the fire from the windward side",
                "Prepare triage for smoke inhalation",
            ],
            recommended_resources=["fire trucks", "water supply units", "medical teams"],
            escalation_probability=0.72,
            ai_summary="Fire spread is contained but still urgent due to industrial exposure.",
        ),
        Incident(
            title="Multi-vehicle Road Accident",
            description="Three vehicles involved with one overturned truck and trapped occupants.",
            latitude=-1.267,
            longitude=36.85,
            severity=IncidentSeverity.MODERATE,
            hazard_type=HazardType.ROAD_ACCIDENT,
            number_of_people=9,
            status=IncidentStatus.TRIAGED,
            assigned_team="Traffic Response",
            created_by_id=users[2].id,
            severity_score=61,
            priority="P2 - Urgent",
            estimated_response_time_minutes=24,
            risk_level="moderate",
            suggested_action_plan=["Stabilize vehicles", "Extract trapped occupants", "Clear traffic lanes"],
            recommended_resources=["ambulances", "police units", "tow vehicles"],
            escalation_probability=0.41,
            ai_summary="Traffic disruption and extraction support required.",
        ),
    ]
    db.add_all(incidents)
    db.flush()

    db.add_all(
        [
            Location(label="River Bridge", latitude=-1.286389, longitude=36.817223, source="seed", incident_id=incidents[0].id),
            Location(label="Warehouse District", latitude=-1.299, longitude=36.79, source="seed", incident_id=incidents[1].id),
            Location(label="Highway Junction", latitude=-1.267, longitude=36.85, source="seed", incident_id=incidents[2].id),
        ]
    )

    resources = [
        Resource(name="Engine 12", kind=ResourceKind.FIRE_TRUCK, status=ResourceStatus.BUSY, quantity=1, unit_name="Fire Station 4", latitude=-1.292, longitude=36.79, eta_minutes=8, fuel_level=84),
        Resource(name="Ambulance A-21", kind=ResourceKind.AMBULANCE, status=ResourceStatus.AVAILABLE, quantity=2, unit_name="EMS Base 2", latitude=-1.280, longitude=36.82, eta_minutes=6, fuel_level=70),
        Resource(name="Police Cruiser 17", kind=ResourceKind.POLICE_VEHICLE, status=ResourceStatus.AVAILABLE, quantity=4, unit_name="Central Precinct", latitude=-1.270, longitude=36.84, eta_minutes=5, fuel_level=90),
        Resource(name="Triage Team 3", kind=ResourceKind.MEDICAL_TEAM, status=ResourceStatus.BUSY, quantity=1, unit_name="District Hospital", latitude=-1.285, longitude=36.81, eta_minutes=12, fuel_level=None),
        Resource(name="Volunteer Group North", kind=ResourceKind.VOLUNTEER, status=ResourceStatus.AVAILABLE, quantity=18, unit_name="Community Center", latitude=-1.282, longitude=36.83, eta_minutes=20, fuel_level=None),
        Resource(name="Rescue Helicopter 2", kind=ResourceKind.HELICOPTER, status=ResourceStatus.MAINTENANCE, quantity=1, unit_name="Air Wing", latitude=-1.35, longitude=36.75, eta_minutes=None, fuel_level=55),
        Resource(name="Fuel Cache 1", kind=ResourceKind.FUEL, status=ResourceStatus.AVAILABLE, quantity=700, unit_name="Logistics Depot"),
        Resource(name="Medical Supply Cache", kind=ResourceKind.MEDICAL_SUPPLIES, status=ResourceStatus.BUSY, quantity=180, unit_name="Warehouse 9"),
    ]
    db.add_all(resources)

    reports = [
        Report(
            incident_id=incidents[0].id,
            kind=ReportKind.INCIDENT,
            title="Flood initial situation report",
            summary="Immediate evacuation guidance and road closure issued.",
            content="Floodplain neighborhoods are affected. Teams are deploying rescue assets and shelters are opening.",
            generated_by_id=users[1].id,
        ),
        Report(
            incident_id=None,
            kind=ReportKind.DAILY,
            title="Daily Situation Report",
            summary="Three active incidents, one critical, with constrained medical capacity.",
            content="Operations remain stable but resource burn rate is elevated for ambulances and triage teams.",
            generated_by_id=users[1].id,
        ),
    ]
    db.add_all(reports)

    db.add_all(
        [
            Message(incident_id=incidents[0].id, sender_id=users[2].id, kind=MessageKind.ALERT, body="Evacuation advisory issued to Zone A.", extra_metadata={"channel": "ops"}),
            Notification(user_id=users[1].id, title="Critical flood escalation", body="Flood incident requires command attention", severity="critical", action_url=f"/incidents/{incidents[0].id}"),
            Notification(user_id=users[2].id, title="Warehouse fire dispatched", body="Engine 12 assigned to warehouse fire", severity="warning", action_url=f"/incidents/{incidents[1].id}"),
        ]
    )
    db.commit()


"""Database seed data for local development."""

from __future__ import annotations

import random
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.enums import HazardType, IncidentSeverity, IncidentStatus, MessageKind, ReportKind, ResourceKind, ResourceStatus
from app.core.security import Role, hash_password
from app.models import Incident, Location, Message, Notification, Report, Resource, User
from app.schemas import IncidentAnalysis
from app.services.ai import AIContext, AIIncidentCommander


def seed_database(db: Session) -> None:
    rng = random.Random(20260716)
    if db.query(User).count() == 0:
        commander = AIIncidentCommander()
        users = _seed_users(rng)
        db.add_all(users)
        db.flush()

        incidents = _seed_incidents(rng, commander, users)
        db.add_all(incidents)
        db.flush()

        db.add_all(_seed_locations(incidents))
        db.add_all(_seed_resources(rng))
        db.add_all(_seed_reports(users, incidents))
        db.add_all(_seed_messages(users, incidents))
        db.add_all(_seed_notifications(users, incidents))

    _seed_community_overrides(db, rng)
    db.commit()


def _seed_community_overrides(db: Session, rng: random.Random) -> None:
    commander = AIIncidentCommander()

    if not db.query(User).filter(User.email == "admin@sentinel.local").first():
        admin = User(
            email="admin@sentinel.local",
            username="county-admin",
            full_name="County Emergency Lead",
            password_hash=hash_password("county123"),
            role=Role.COUNTY_ADMIN,
            badge_id="COUNTY-001",
        )
        leader = User(
            email="leader@sentinel.local",
            username="mama-njeri",
            full_name="Community Leader",
            password_hash=hash_password("2468"),
            role=Role.COMMUNITY_LEADER,
            phone_number="+254700000001",
            village="Matuu",
            skills=["coordination", "announcements", "shelter management"],
            badge_id="LEAD-001",
        )
        volunteer = User(
            email="volunteer@sentinel.local",
            username="bodaboda-juma",
            full_name="Volunteer Rider",
            password_hash=hash_password("1357"),
            role=Role.COMMUNITY_VOLUNTEER,
            phone_number="+254700000002",
            village="Matuu",
            skills=["transport", "first aid", "radio"],
            badge_id="VOL-001",
            is_on_duty=True,
        )
        health_worker = User(
            email="clinic@sentinel.local",
            username="clinic-sarah",
            full_name="Clinic Health Worker",
            password_hash=hash_password("2468"),
            role=Role.COMMUNITY_LEADER,
            phone_number="+254700000003",
            village="Matuu",
            skills=["triage", "maternal care", "public health"],
            badge_id="HEALTH-001",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
        )
        db.add_all([admin, leader, volunteer, health_worker])
        db.flush()

    if not db.query(Incident).filter(
        Incident.hazard_type.in_(
            [
                HazardType.RIVER_OVERFLOW,
                HazardType.MISSING_CHILD,
                HazardType.LANDSLIDE,
                HazardType.SNAKE_BITE,
                HazardType.BOAT_ACCIDENT,
                HazardType.WATER_SHORTAGE,
                HazardType.DISEASE_OUTBREAK,
            ]
        )
    ).first():
        community_users = list(db.query(User).filter(User.email.in_(["leader@sentinel.local", "volunteer@sentinel.local", "clinic@sentinel.local"])).all())
        if community_users:
            incidents = _community_incidents(rng, commander, community_users)
            db.add_all(incidents)
            db.flush()
            db.add_all(_seed_locations(incidents[-10:]))
            db.add_all(_community_resources(rng))
            db.add_all(_community_reports(community_users, incidents))
            db.add_all(_community_messages(community_users, incidents))
            db.add_all(_community_notifications(community_users, incidents))


def _community_incidents(rng: random.Random, commander: AIIncidentCommander, users: list[User]) -> list[Incident]:
    base_lat, base_lon = -0.038, 37.650
    templates = [
        ("River overflow near village bridge", HazardType.RIVER_OVERFLOW, IncidentSeverity.CRITICAL, "Rescue boat team"),
        ("Missing child reported at market", HazardType.MISSING_CHILD, IncidentSeverity.HIGH, "Volunteer search"),
        ("Landslide blocking the main road", HazardType.LANDSLIDE, IncidentSeverity.HIGH, "Road clearing crew"),
        ("Snake bite at homestead", HazardType.SNAKE_BITE, IncidentSeverity.MODERATE, "Clinic transport"),
        ("Boat accident at river crossing", HazardType.BOAT_ACCIDENT, IncidentSeverity.CRITICAL, "River rescue"),
        ("Tree blocking road to school", HazardType.TREE_BLOCKING_ROAD, IncidentSeverity.MODERATE, "Community response"),
        ("Water shortage in trading centre", HazardType.WATER_SHORTAGE, IncidentSeverity.HIGH, "Water delivery"),
        ("Disease outbreak at market", HazardType.DISEASE_OUTBREAK, IncidentSeverity.CRITICAL, "Health team"),
        ("Electric pole down near church", HazardType.ELECTRIC_POLE_DOWN, IncidentSeverity.MODERATE, "Power response"),
        ("Missing elderly person", HazardType.MISSING_ELDERLY, IncidentSeverity.HIGH, "Village search"),
    ]
    villages = ["Matuu", "Kibwezi", "Mwingi", "Machakos", "Kitui", "Meru", "Siaya", "Homa Bay"]
    incidents: list[Incident] = []
    for index in range(24):
        title, hazard, severity, team = templates[index % len(templates)]
        village = rng.choice(villages)
        lat = round(base_lat + rng.uniform(-0.18, 0.18), 6)
        lon = round(base_lon + rng.uniform(-0.18, 0.18), 6)
        incident = Incident(
            title=f"{title} - {village}",
            description=f"{title} reported in {village}. Community members are sharing updates and awaiting support.",
            latitude=lat,
            longitude=lon,
            severity=severity,
            hazard_type=hazard,
            number_of_people=max(1, int(rng.uniform(3, 120))),
            status=[IncidentStatus.NEW, IncidentStatus.TRIAGED, IncidentStatus.DISPATCHED][index % 3],
            assigned_team=team,
            created_by_id=users[index % len(users)].id,
            replay_events=[
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "label": "Public report",
                    "narrative": f"{title} reported from {village}.",
                    "severity": severity.value,
                }
            ],
        )
        analysis: IncidentAnalysis = commander.analyze_incident(
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
        incident.ai_summary = analysis.explanation
        incidents.append(incident)
    return incidents


def _community_resources(rng: random.Random) -> list[Resource]:
    existing = []
    kinds = [
        (ResourceKind.CHURCH, "St. Mary's Church", 1, 120),
        (ResourceKind.MOSQUE, "Al-Huda Mosque", 1, 100),
        (ResourceKind.SCHOOL, "Matuu Primary School", 1, 500),
        (ResourceKind.COMMUNITY_HALL, "Ward Community Hall", 1, 250),
        (ResourceKind.CLINIC, "Matuu Clinic", 1, 40),
        (ResourceKind.HOSPITAL, "County Health Centre", 1, 180),
        (ResourceKind.WATER_TANK, "Ward Water Tank", 2, None),
        (ResourceKind.FOOD_STORE, "Market Food Store", 1, None),
        (ResourceKind.COMMUNITY_KITCHEN, "Community Kitchen", 1, None),
        (ResourceKind.BODABODA, "Bodaboda Riders Group", 12, None),
        (ResourceKind.PRIVATE_VEHICLE, "Volunteer Pickup", 2, None),
        (ResourceKind.TRACTOR, "Farm Tractor", 1, None),
        (ResourceKind.RESCUE_BOAT, "River Rescue Boat", 1, None),
        (ResourceKind.GENERATOR, "Backup Generator", 1, None),
    ]
    for index, (kind, name, quantity, capacity) in enumerate(kinds):
        existing.append(
            Resource(
                name=name,
                kind=kind,
                status=ResourceStatus.AVAILABLE if index % 3 != 0 else ResourceStatus.BUSY,
                quantity=quantity,
                capacity=capacity,
                unit_name=f"Community Unit {index + 1}",
                latitude=round(-0.038 + rng.uniform(-0.08, 0.08), 6),
                longitude=round(37.650 + rng.uniform(-0.08, 0.08), 6),
                notes="Community resource seeded for local coordination.",
                eta_minutes=rng.randint(5, 30) if kind in {ResourceKind.RESCUE_BOAT, ResourceKind.BODABODA, ResourceKind.PRIVATE_VEHICLE, ResourceKind.TRACTOR} else None,
                fuel_level=rng.randint(45, 100) if kind in {ResourceKind.RESCUE_BOAT, ResourceKind.BODABODA, ResourceKind.PRIVATE_VEHICLE, ResourceKind.TRACTOR, ResourceKind.GENERATOR} else None,
            )
        )
    return existing


def _community_reports(users: list[User], incidents: list[Incident]) -> list[Report]:
    leader = users[0]
    return [
        Report(
            incident_id=incidents[0].id,
            kind=ReportKind.INCIDENT,
            title="Village overflow update",
            summary="Families have moved to the school and church shelters.",
            content="The community is coordinating with volunteers, clinic staff, and county officials using simple phone calls and radio updates.",
            generated_by_id=leader.id,
        ),
        Report(
            incident_id=None,
            kind=ReportKind.DAILY,
            title="Community situation brief",
            summary="Flood, road, health, and missing person reports are updating in real time.",
            content="Shelters, clinics, water points, and volunteer transport are being tracked for the next response cycle.",
            generated_by_id=leader.id,
        ),
    ]


def _community_messages(users: list[User], incidents: list[Incident]) -> list[Message]:
    leader = users[0]
    volunteer = users[1]
    return [
        Message(
            incident_id=incidents[0].id,
            sender_id=leader.id,
            kind=MessageKind.ALERT,
            body="Please move children and elders to the school shelter.",
            extra_metadata={"channel": "public"},
        ),
        Message(
            incident_id=incidents[1].id,
            sender_id=volunteer.id,
            kind=MessageKind.SYSTEM,
            body="Bodaboda team is moving the injured person to the clinic.",
            extra_metadata={"channel": "volunteer"},
        ),
    ]


def _community_notifications(users: list[User], incidents: list[Incident]) -> list[Notification]:
    leader = users[0]
    volunteer = users[1]
    return [
        Notification(
            user_id=leader.id,
            title="New river overflow alert",
            body="Community members need shelter support near the river crossing.",
            severity="critical",
            action_url=f"/incidents/{incidents[0].id}",
        ),
        Notification(
            user_id=volunteer.id,
            title="Volunteer search mission",
            body="A missing child search mission is ready for nearby volunteers.",
            severity="warning",
            action_url=f"/incidents/{incidents[1].id}",
        ),
    ]


def _seed_users(rng: random.Random) -> list[User]:
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

    first_names = [
        "Amina",
        "Jordan",
        "Casey",
        "Taylor",
        "Noah",
        "Maya",
        "Riley",
        "Sam",
        "Ivy",
        "Owen",
        "Nadia",
        "Eli",
    ]
    last_names = [
        "Kamau",
        "Otieno",
        "Mwangi",
        "Njeri",
        "Adebayo",
        "Patel",
        "Musa",
        "Okafor",
        "Kariuki",
        "Wanjiku",
        "Mensah",
        "Hassan",
    ]

    for index in range(300):
        full_name = f"{rng.choice(first_names)} {rng.choice(last_names)}"
        users.append(
            User(
                email=f"responder-{index + 1:03d}@sentinel.ai",
                full_name=full_name,
                password_hash=hash_password("admin123"),
                role=Role.FIELD_RESPONDER,
                badge_id=f"RSP-{index + 400:03d}",
                is_on_duty=index % 4 != 0,
            )
        )

    return users


def _seed_incidents(rng: random.Random, commander: AIIncidentCommander, users: list[User]) -> list[Incident]:
    templates = [
        ("Rising River Flooding", HazardType.FLOOD, IncidentSeverity.CRITICAL, "Flood Response Alpha"),
        ("Warehouse Fire", HazardType.FIRE, IncidentSeverity.HIGH, "Fire Unit Delta"),
        ("Multi-vehicle Road Accident", HazardType.ROAD_ACCIDENT, IncidentSeverity.MODERATE, "Traffic Response"),
        ("Collapsed Building", HazardType.OTHER, IncidentSeverity.HIGH, "Urban Search Team"),
        ("Medical Surge at Clinic", HazardType.MEDICAL, IncidentSeverity.HIGH, "EMS Triage Unit"),
        ("Chemical Spill at Depot", HazardType.HAZMAT, IncidentSeverity.CRITICAL, "Hazmat Task Force"),
        ("Storm Damage in Suburbs", HazardType.OTHER, IncidentSeverity.MODERATE, "Public Works"),
        ("Power Failure in District", HazardType.OTHER, IncidentSeverity.LOW, "Utility Coordination"),
        ("Missing Person Search", HazardType.SECURITY, IncidentSeverity.MODERATE, "Search and Rescue"),
        ("Explosion Near Industrial Park", HazardType.HAZMAT, IncidentSeverity.CRITICAL, "Explosive Response"),
    ]
    neighborhoods = [
        "Westlands",
        "Kasarani",
        "Embakasi",
        "Kilimani",
        "Langata",
        "Kibera",
        "Industrial Area",
        "Ruai",
        "Dagoretti",
        "South B",
        "Karen",
        "Mlolongo",
        "Thika Road Corridor",
        "CBD",
        "Eastleigh",
    ]

    incidents: list[Incident] = []
    for index in range(500):
        title, hazard, default_severity, team = templates[index % len(templates)]
        neighborhood = rng.choice(neighborhoods)
        severity = _weighted_severity(rng, default_severity, index)
        people = max(0, int(rng.uniform(3, 180) + (25 if severity == IncidentSeverity.CRITICAL else 0)))
        latitude = round(-1.286389 + rng.uniform(-0.18, 0.18), 6)
        longitude = round(36.817223 + rng.uniform(-0.18, 0.18), 6)
        status = _status_for_severity(severity, index)
        incident = Incident(
            title=f"{title} - {neighborhood}",
            description=f"{title} reported in {neighborhood}. Conditions are being assessed by field teams.",
            latitude=latitude,
            longitude=longitude,
            severity=severity,
            hazard_type=hazard,
            number_of_people=people,
            status=status,
            assigned_team=team,
            created_by_id=users[1 if index % 2 == 0 else 2].id,
            replay_events=[
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "label": "Initial report",
                    "narrative": f"{title} reported in {neighborhood}.",
                    "severity": severity.value,
                }
            ]
            if index < 12
            else None,
        )
        analysis: IncidentAnalysis = commander.analyze_incident(
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
        incident.ai_summary = analysis.explanation
        incidents.append(incident)

    return incidents


def _seed_locations(incidents: list[Incident]) -> list[Location]:
    return [
        Location(
            label=incident.title,
            latitude=incident.latitude,
            longitude=incident.longitude,
            source="seed",
            incident_id=incident.id,
        )
        for incident in incidents
    ]


def _seed_resources(rng: random.Random) -> list[Resource]:
    resources: list[Resource] = []

    def add_resources(
        kind: ResourceKind,
        count: int,
        prefix: str,
        unit_prefix: str,
        status_cycle: tuple[ResourceStatus, ...] = (
            ResourceStatus.AVAILABLE,
            ResourceStatus.BUSY,
            ResourceStatus.MAINTENANCE,
        ),
    ) -> None:
        for index in range(count):
            lat = round(-1.286389 + rng.uniform(-0.22, 0.22), 6)
            lon = round(36.817223 + rng.uniform(-0.22, 0.22), 6)
            resources.append(
                Resource(
                    name=f"{prefix} {index + 1:02d}",
                    kind=kind,
                    status=status_cycle[index % len(status_cycle)],
                    quantity=rng.randint(1, 4) if kind in {ResourceKind.AMBULANCE, ResourceKind.FIRE_TRUCK, ResourceKind.POLICE_VEHICLE, ResourceKind.HELICOPTER, ResourceKind.BOAT, ResourceKind.DRONE} else rng.randint(20, 240),
                    capacity=rng.randint(20, 400) if kind in {ResourceKind.HOSPITAL, ResourceKind.SHELTER, ResourceKind.FIRE_STATION, ResourceKind.POLICE_STATION} else None,
                    unit_name=f"{unit_prefix} {1 + (index % 12)}",
                    latitude=lat,
                    longitude=lon,
                    notes=f"Seeded operational asset for {kind.value.replace('_', ' ')} coverage.",
                    eta_minutes=rng.randint(4, 35) if kind in {ResourceKind.AMBULANCE, ResourceKind.FIRE_TRUCK, ResourceKind.POLICE_VEHICLE, ResourceKind.HELICOPTER, ResourceKind.BOAT, ResourceKind.DRONE} else None,
                    fuel_level=rng.randint(35, 100) if kind in {ResourceKind.AMBULANCE, ResourceKind.FIRE_TRUCK, ResourceKind.POLICE_VEHICLE, ResourceKind.HELICOPTER, ResourceKind.BOAT, ResourceKind.DRONE} else None,
                )
            )

    add_resources(ResourceKind.FIRE_TRUCK, 24, "Fire Truck", "Fire Station")
    add_resources(ResourceKind.AMBULANCE, 30, "Ambulance", "EMS Base")
    add_resources(ResourceKind.POLICE_VEHICLE, 26, "Police Car", "Precinct")
    add_resources(ResourceKind.HELICOPTER, 8, "Helicopter", "Air Wing")
    add_resources(ResourceKind.BOAT, 12, "Rescue Boat", "Water Unit")
    add_resources(ResourceKind.DRONE, 10, "Drone", "Air Recon")
    add_resources(ResourceKind.HOSPITAL, 50, "Hospital", "District Hospital")
    add_resources(ResourceKind.SHELTER, 60, "Shelter", "Evacuation Center")
    add_resources(ResourceKind.FIRE_STATION, 40, "Fire Station", "Station")
    add_resources(ResourceKind.POLICE_STATION, 40, "Police Station", "Precinct")
    add_resources(ResourceKind.FUEL, 18, "Fuel Cache", "Logistics Depot", (ResourceStatus.AVAILABLE,))
    add_resources(ResourceKind.MEDICAL_SUPPLIES, 24, "Medical Supply Cache", "Medical Depot", (ResourceStatus.AVAILABLE, ResourceStatus.BUSY))
    add_resources(ResourceKind.WATER, 18, "Water Cache", "Supply Cache", (ResourceStatus.AVAILABLE,))
    add_resources(ResourceKind.FOOD, 18, "Food Cache", "Supply Cache", (ResourceStatus.AVAILABLE,))
    add_resources(ResourceKind.GENERATOR, 16, "Generator", "Support Unit", (ResourceStatus.AVAILABLE, ResourceStatus.MAINTENANCE))
    add_resources(ResourceKind.TENT, 24, "Tent", "Shelter Kit", (ResourceStatus.AVAILABLE,))
    add_resources(ResourceKind.SATELLITE_PHONE, 12, "Satellite Phone", "Comms Unit", (ResourceStatus.AVAILABLE,))
    add_resources(ResourceKind.VOLUNTEER, 30, "Volunteer Group", "Community Group", (ResourceStatus.AVAILABLE, ResourceStatus.BUSY))
    add_resources(ResourceKind.MEDICAL_TEAM, 24, "Medical Team", "Clinic Team", (ResourceStatus.AVAILABLE, ResourceStatus.BUSY))

    return resources


def _seed_reports(users: list[User], incidents: list[Incident]) -> list[Report]:
    commander = users[1]
    return [
        Report(
            incident_id=incidents[0].id,
            kind=ReportKind.INCIDENT,
            title="Flood initial situation report",
            summary="Immediate evacuation guidance and road closure issued.",
            content="Floodplain neighborhoods are affected. Teams are deploying rescue assets and shelters are opening.",
            generated_by_id=commander.id,
        ),
        Report(
            incident_id=None,
            kind=ReportKind.DAILY,
            title="Daily Situation Report",
            summary="Hundreds of seeded incidents are available for simulation and demo coverage.",
            content="Operations remain stable but resource burn rate is elevated for ambulances, shelters, and triage teams.",
            generated_by_id=commander.id,
        ),
    ]


def _seed_messages(users: list[User], incidents: list[Incident]) -> list[Message]:
    dispatcher = users[2]
    return [
        Message(
            incident_id=incidents[0].id,
            sender_id=dispatcher.id,
            kind=MessageKind.ALERT,
            body="Evacuation advisory issued to Zone A.",
            extra_metadata={"channel": "ops"},
        ),
        Message(
            incident_id=incidents[1].id,
            sender_id=dispatcher.id,
            kind=MessageKind.SYSTEM,
            body="Command post confirmed and teams are checking in.",
            extra_metadata={"channel": "status"},
        ),
    ]


def _seed_notifications(users: list[User], incidents: list[Incident]) -> list[Notification]:
    commander = users[1]
    dispatcher = users[2]
    return [
        Notification(
            user_id=commander.id,
            title="Critical flood escalation",
            body="Flood incident requires command attention",
            severity="critical",
            action_url=f"/incidents/{incidents[0].id}",
        ),
        Notification(
            user_id=dispatcher.id,
            title="Warehouse fire dispatched",
            body="Engine 12 assigned to warehouse fire",
            severity="warning",
            action_url=f"/incidents/{incidents[1].id}",
        ),
    ]


def _weighted_severity(rng: random.Random, default_severity: IncidentSeverity, index: int) -> IncidentSeverity:
    roll = rng.random()
    if index % 11 == 0:
        return IncidentSeverity.CRITICAL
    if roll > 0.8:
        return IncidentSeverity.CRITICAL
    if roll > 0.56:
        return IncidentSeverity.HIGH
    if roll > 0.28:
        return IncidentSeverity.MODERATE
    return default_severity if default_severity != IncidentSeverity.CRITICAL else IncidentSeverity.MODERATE


def _status_for_severity(severity: IncidentSeverity, index: int) -> IncidentStatus:
    if severity == IncidentSeverity.CRITICAL:
        return [IncidentStatus.DISPATCHED, IncidentStatus.RESPONDING, IncidentStatus.TRIAGED][index % 3]
    if severity == IncidentSeverity.HIGH:
        return [IncidentStatus.TRIAGED, IncidentStatus.DISPATCHED, IncidentStatus.RESPONDING][index % 3]
    if severity == IncidentSeverity.MODERATE:
        return [IncidentStatus.NEW, IncidentStatus.TRIAGED, IncidentStatus.DISPATCHED][index % 3]
    return [IncidentStatus.NEW, IncidentStatus.TRIAGED, IncidentStatus.CONTAINED][index % 3]

"""Incident routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user
from app.core.enums import IncidentSeverity, IncidentStatus
from app.models import User
from app.schemas import IncidentAnalysis, IncidentCreate, IncidentRead, IncidentUpdate, IncidentReplayPoint, PublicIncidentReportCreate
from app.services.operations import OperationsService

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentRead])
def list_incidents(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[IncidentRead]:
    return OperationsService(db).list_incidents()


@router.post("", response_model=IncidentRead)
def create_incident(
    payload: IncidentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> IncidentRead:
    return OperationsService(db).create_incident(payload, current_user)


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: int, _: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> IncidentRead:
    incident = OperationsService(db).incidents.get(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return IncidentRead.model_validate(incident)


@router.patch("/{incident_id}", response_model=IncidentRead)
def update_incident(
    incident_id: int, payload: IncidentUpdate, _: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> IncidentRead:
    try:
        return OperationsService(db).update_incident(incident_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{incident_id}/analyze", response_model=IncidentAnalysis)
def analyze_incident(
    incident_id: int, _: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> IncidentAnalysis:
    try:
        return OperationsService(db).analyze_incident(incident_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{incident_id}/replay", response_model=list[IncidentReplayPoint])
def replay_incident(
    incident_id: int, _: User = Depends(get_current_user), db: Session = Depends(db_session)
) -> list[IncidentReplayPoint]:
    try:
        return [IncidentReplayPoint.model_validate(item) for item in OperationsService(db).replay_incident(incident_id)]
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/public/report", response_model=IncidentRead)
def public_report(payload: PublicIncidentReportCreate, db: Session = Depends(db_session)) -> IncidentRead:
    incident = IncidentCreate(
        title=payload.what_happened.strip()[:255],
        description=f"{payload.what_happened.strip()} Location: {payload.where.strip()}.",
        latitude=payload.latitude or -1.286389,
        longitude=payload.longitude or 36.817223,
        severity=IncidentSeverity.CRITICAL if payload.need_help_immediately else IncidentSeverity.MODERATE,
        hazard_type=payload.incident_type,
        number_of_people=1,
        status=IncidentStatus.NEW,
        assigned_team="Community Response",
        image_urls=payload.photo_urls,
        voice_note_urls=payload.voice_note_urls,
    )
    return OperationsService(db).create_incident(incident, None)

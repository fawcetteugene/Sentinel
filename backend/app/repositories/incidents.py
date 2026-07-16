"""Incident repository."""

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.enums import IncidentSeverity, IncidentStatus
from app.models import Incident


class IncidentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Incident]:
        stmt = select(Incident).options(selectinload(Incident.attachments)).order_by(desc(Incident.created_at))
        return list(self.db.scalars(stmt))

    def get(self, incident_id: int) -> Incident | None:
        stmt = select(Incident).options(selectinload(Incident.attachments)).where(Incident.id == incident_id)
        return self.db.scalar(stmt)

    def active_count(self) -> int:
        return self.db.scalar(
            select(func.count()).select_from(Incident).where(
                Incident.status.notin_([IncidentStatus.CLOSED, IncidentStatus.RESOLVED])
            )
        ) or 0

    def critical_count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(Incident).where(Incident.severity == IncidentSeverity.CRITICAL)) or 0

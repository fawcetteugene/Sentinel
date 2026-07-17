"""Report routes."""

from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_role
from app.core.security import Role
from app.models import User
from app.schemas import ReportCreate, ReportRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportRead])
def list_reports(
    _: User = Depends(require_role(Role.COMMUNITY_LEADER, Role.COUNTY_ADMIN, Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> list[ReportRead]:
    return [ReportRead.model_validate(item) for item in OperationsService(db).list_reports()]


@router.post("", response_model=ReportRead)
def create_report(
    payload: ReportCreate,
    current_user: User = Depends(require_role(Role.COMMUNITY_LEADER, Role.COUNTY_ADMIN, Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> ReportRead:
    return ReportRead.model_validate(OperationsService(db).create_report(payload, current_user.id))


@router.get("/export")
def export_reports(
    format: Literal["csv", "pdf"] = Query(default="csv"),
    kind: str | None = Query(default=None),
    _: User = Depends(require_role(Role.COMMUNITY_LEADER, Role.COUNTY_ADMIN, Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> Response:
    service = OperationsService(db)
    if format == "csv":
        content = service.export_reports_csv(kind)
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="sentinel-reports.csv"'},
        )
    content = service.export_reports_pdf(kind)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="sentinel-reports.pdf"'},
    )

"""Report routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.enums import ReportKind
from app.core.security import Role
from app.models import User
from app.schemas import ReportCreate, ReportRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=list[ReportRead])
def list_reports(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[ReportRead]:
    return [ReportRead.model_validate(item) for item in OperationsService(db).list_reports()]


@router.post("", response_model=ReportRead)
def create_report(
    payload: ReportCreate,
    current_user: User = Depends(require_role(Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> ReportRead:
    return ReportRead.model_validate(OperationsService(db).create_report(payload, current_user.id))


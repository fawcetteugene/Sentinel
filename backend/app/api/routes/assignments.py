"""Assignment routes."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.security import Role
from app.models import User
from app.schemas import AssignmentCreate, AssignmentRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=list[AssignmentRead])
def list_assignments(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[AssignmentRead]:
    return [AssignmentRead.model_validate(item) for item in OperationsService(db).list_assignments()]


@router.post("", response_model=AssignmentRead)
def create_assignment(
    payload: AssignmentCreate,
    _: User = Depends(require_role(Role.COMMUNITY_LEADER, Role.COMMUNITY_VOLUNTEER, Role.COUNTY_ADMIN, Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> AssignmentRead:
    return AssignmentRead.model_validate(OperationsService(db).create_assignment(payload))


@router.post("/auto-dispatch", response_model=list[AssignmentRead])
def auto_dispatch(
    limit: int = Query(default=3, ge=1, le=10),
    _: User = Depends(require_role(Role.COMMUNITY_LEADER, Role.COMMUNITY_VOLUNTEER, Role.COUNTY_ADMIN, Role.INCIDENT_COMMANDER, Role.DISPATCHER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> list[AssignmentRead]:
    return [AssignmentRead.model_validate(item) for item in OperationsService(db).auto_dispatch(limit=limit)]

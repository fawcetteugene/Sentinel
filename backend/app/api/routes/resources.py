"""Resource routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user, require_role
from app.core.security import Role
from app.models import User
from app.schemas import ResourceCreate, ResourceRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("", response_model=list[ResourceRead])
def list_resources(_: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[ResourceRead]:
    return [ResourceRead.model_validate(item) for item in OperationsService(db).list_resources()]


@router.post("", response_model=ResourceRead)
def create_resource(
    payload: ResourceCreate,
    _: User = Depends(require_role(Role.DISPATCHER, Role.INCIDENT_COMMANDER, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> ResourceRead:
    return ResourceRead.model_validate(OperationsService(db).create_resource(payload))


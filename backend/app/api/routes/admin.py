"""Admin routes for provisioning, oversight, and audit views."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_role
from app.core.security import Role
from app.models import User
from app.schemas import AdminOverview, AuditLogRead, UserRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview", response_model=AdminOverview)
def overview(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> AdminOverview:
    return AdminOverview.model_validate(OperationsService(db).admin_overview())


@router.get("/users", response_model=list[UserRead])
def list_users(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> list[UserRead]:
    return [UserRead.model_validate(user) for user in db.query(User).order_by(User.created_at.desc()).all()]


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: dict[str, object],
    _: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)),
    db: Session = Depends(db_session),
) -> UserRead:
    try:
        return UserRead.model_validate(OperationsService(db).update_user(user_id, payload))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/audit-logs", response_model=list[AuditLogRead])
def audit_logs(_: User = Depends(require_role(Role.COUNTY_ADMIN, Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> list[AuditLogRead]:
    return [AuditLogRead.model_validate(item) for item in OperationsService(db).list_audit_logs()]

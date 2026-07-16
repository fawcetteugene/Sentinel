"""Admin routes for provisioning and audit style views."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_role
from app.core.security import Role
from app.models import User
from app.schemas import UserRead

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserRead])
def list_users(_: User = Depends(require_role(Role.ADMINISTRATOR)), db: Session = Depends(db_session)) -> list[UserRead]:
    return [UserRead.model_validate(user) for user in db.query(User).order_by(User.created_at.desc()).all()]


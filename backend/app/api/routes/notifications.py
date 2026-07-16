"""Notification routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import db_session, get_current_user
from app.models import User
from app.schemas import NotificationRead
from app.services.operations import OperationsService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(db_session)) -> list[NotificationRead]:
    return OperationsService(db).notifications_for_user(current_user.id)


@router.post("/{notification_id}/read")
def mark_read(notification_id: int, _: User = Depends(get_current_user), db: Session = Depends(db_session)) -> dict[str, str]:
    OperationsService(db).mark_notification_read(notification_id)
    return {"status": "ok"}


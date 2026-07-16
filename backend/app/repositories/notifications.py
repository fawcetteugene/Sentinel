"""Notification repository."""

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Notification


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_recent(self, limit: int = 10) -> list[Notification]:
        stmt = select(Notification).order_by(desc(Notification.created_at)).limit(limit)
        return list(self.db.scalars(stmt))


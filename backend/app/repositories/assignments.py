"""Assignment repository."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Assignment


class AssignmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Assignment]:
        return list(self.db.scalars(select(Assignment).order_by(Assignment.created_at.desc())))


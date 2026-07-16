"""Resource repository."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import ResourceStatus
from app.models import Resource


class ResourceRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self) -> list[Resource]:
        return list(self.db.scalars(select(Resource).order_by(Resource.kind, Resource.name)))

    def available_count(self) -> int:
        return sum(1 for resource in self.list() if resource.status == ResourceStatus.AVAILABLE)


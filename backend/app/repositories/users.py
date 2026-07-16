"""User repository."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import Role
from app.models import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def get_by_role(self, role: Role) -> list[User]:
        return list(self.db.scalars(select(User).where(User.role == role)))

    def list_active_responders(self) -> list[User]:
        return list(
            self.db.scalars(
                select(User).where(User.is_active.is_(True), User.is_on_duty.is_(True), User.role == Role.FIELD_RESPONDER)
            )
        )


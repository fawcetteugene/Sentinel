"""Repository base helpers."""

from sqlalchemy import select
from sqlalchemy.orm import Session


class Repository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, model, obj_id: int):
        return self.db.get(model, obj_id)

    def list(self, model):
        return self.db.scalars(select(model)).all()


"""Test configuration for backend imports."""

from __future__ import annotations

import os
import sys
from os import getpid
from pathlib import Path

TEST_DB = Path(f"/tmp/sentinel-ai-test-{getpid()}.db")
if TEST_DB.exists():
    TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["ENVIRONMENT"] = "test"

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest

from app.core.database import Base, SessionLocal, engine
from app.seed import seed_database


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
        yield db

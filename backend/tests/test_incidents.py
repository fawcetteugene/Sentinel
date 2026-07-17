"""Incident API tests."""

import pytest
from fastapi import HTTPException

from app.api.deps import require_role
from app.api.routes.auth import login
from app.api.routes.incidents import list_incidents
from app.core.security import Role
from app.models import User
from app.schemas import LoginRequest


def test_seeded_login_and_incidents(db_session):
    login_result = login(LoginRequest(email="dispatcher@sentinel.ai", password="admin123"), db_session)
    assert login_result.access_token
    user = db_session.query(User).filter(User.email == "dispatcher@sentinel.ai").first()
    assert user is not None
    incidents = list_incidents(user, db_session)
    assert len(incidents) >= 3


def test_non_admin_cannot_access_admin_overview(db_session):
    dispatcher = db_session.query(User).filter(User.email == "dispatcher@sentinel.ai").first()
    assert dispatcher is not None
    with pytest.raises(HTTPException) as exc:
        require_role(Role.ADMINISTRATOR)(dispatcher)
    assert exc.value.status_code == 403

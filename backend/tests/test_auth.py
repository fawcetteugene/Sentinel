"""Authentication tests."""

from app.api.routes.auth import login
from app.main import healthz, root
from app.schemas import LoginRequest


def test_root():
    body = root()
    assert body["status"] == "ok"
    assert body["api"] == "/api"


def test_healthz():
    assert healthz()["status"] == "ok"


def test_seeded_login(db_session):
    token = login(LoginRequest(email="admin@sentinel.ai", password="admin123"), db_session)
    assert token.access_token

"""Incident API tests."""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_seeded_login_and_incidents():
    login = client.post("/api/auth/login", json={"email": "dispatcher@sentinel.ai", "password": "admin123"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    incidents = client.get("/api/incidents", headers={"Authorization": f"Bearer {token}"})
    assert incidents.status_code == 200
    assert len(incidents.json()) >= 3


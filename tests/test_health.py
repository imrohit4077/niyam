"""Health check test."""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health() -> None:
    """GET /health returns 200."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

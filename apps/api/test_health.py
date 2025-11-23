from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.routes import health as health_routes


client = TestClient(app)


def test_request_id_header_present():
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers.get("X-Request-Id")


def test_healthz_returns_ok():
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "uptime_seconds" in body


def test_readyz_failure_sets_503(monkeypatch):
    monkeypatch.setattr(health_routes, "_check_database", lambda: (False, "forced failure"))
    response = client.get("/readyz")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"]["error"] == "forced failure"



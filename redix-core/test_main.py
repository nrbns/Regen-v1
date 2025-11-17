"""
Basic tests for Redix backend
Run with: pytest test_main.py
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data

def test_ask_basic():
    """Test /ask endpoint with basic query"""
    response = client.post("/ask", json={
        "query": "Hello",
        "options": {}
    })
    # Should return 200 or 500 (if no models configured)
    assert response.status_code in [200, 500]
    if response.status_code == 200:
        data = response.json()
        assert "text" in data
        assert "greenScore" in data

def test_metrics():
    """Test /metrics endpoint"""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "cpu" in data
    assert "memory" in data
    assert "timestamp" in data

def test_consent_log():
    """Test consent logging"""
    response = client.post("/consent", json={
        "userId": "test_user",
        "action": "test_action",
        "approved": True,
        "context": "test"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged"

def test_consent_query():
    """Test consent query"""
    # First log consent
    client.post("/consent", json={
        "userId": "test_user",
        "action": "test_action",
        "approved": True
    })
    
    # Then query
    response = client.get("/consent/test_user/test_action")
    assert response.status_code == 200
    data = response.json()
    assert data["approved"] == True


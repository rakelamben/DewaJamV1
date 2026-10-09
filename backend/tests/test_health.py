"""
Tests untuk health check endpoint.

Requirements: 8.2
"""

from fastapi.testclient import TestClient


def test_health_returns_200_ok(client: TestClient) -> None:
    """GET /api/v1/health harus mengembalikan 200 dengan body {"status": "ok"}."""
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

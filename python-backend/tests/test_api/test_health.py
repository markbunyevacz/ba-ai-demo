"""Integration tests for health endpoint."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    """Health endpoint should report OK status."""
    response = client.get('/api/health')
    assert response.status_code == 200

    payload = response.json()
    assert payload.get('status') == 'OK'
    assert payload.get('backend') == 'python'

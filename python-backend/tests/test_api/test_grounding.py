"""Integration tests for grounding API endpoints."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_grounding_stats(client: TestClient) -> None:
    response = client.get('/api/grounding/stats')
    assert response.status_code == 200

    payload = response.json()
    assert 'knowledgeBaseSize' in payload
    assert 'validationRulesCount' in payload
    assert isinstance(payload['knowledgeBaseSize'], int)
    assert isinstance(payload['validationRulesCount'], int)


def test_grounding_validate_requires_payload(client: TestClient) -> None:
    response = client.post('/api/grounding/validate', json={})
    assert response.status_code == 200

    payload = response.json()
    assert 'issues' in payload
    assert 'warnings' in payload

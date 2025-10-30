"""Integration tests for AI model listing endpoint."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_ai_models_endpoint_returns_providers_and_models(client: TestClient) -> None:
    response = client.get('/api/ai/models')
    assert response.status_code == 200

    payload = response.json()
    assert 'providers' in payload
    assert 'models' in payload

    default_provider = payload.get('defaultProvider')
    providers = payload['providers']

    assert default_provider in providers

    # Models list should contain stubbed fake-model entry for each provider we patched
    for provider, model_list in payload['models'].items():
        assert isinstance(model_list, list)
        if model_list:
            assert model_list[0]['id'] == 'fake-model'
            assert model_list[0]['name'] == 'Fake Model'

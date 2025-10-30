"""Shared pytest fixtures for FastAPI app tests."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client() -> TestClient:
    """Return a FastAPI test client instance."""
    return TestClient(app)


@pytest.fixture(autouse=True)
def stub_model_providers(monkeypatch) -> None:
    """Stub external model provider calls to avoid network usage during tests."""

    async def _fake_list_models(self):  # type: ignore[override]
        return [
            {
                "id": "fake-model",
                "name": "Fake Model",
                "description": "Stub model for testing",
                "recommended": True,
            }
        ]

    async def _fake_health(self) -> bool:  # type: ignore[override]
        return True

    # Patch Anthropic provider methods
    monkeypatch.setattr(
        'models.providers.anthropic_provider.AnthropicProvider.list_models',
        _fake_list_models,
        raising=False,
    )
    monkeypatch.setattr(
        'models.providers.anthropic_provider.AnthropicProvider.health_check',
        _fake_health,
        raising=False,
    )

    # Patch OpenRouter provider methods
    monkeypatch.setattr(
        'models.providers.openrouter_provider.OpenRouterProvider.list_models',
        _fake_list_models,
        raising=False,
    )
    monkeypatch.setattr(
        'models.providers.openrouter_provider.OpenRouterProvider.health_check',
        _fake_health,
        raising=False,
    )

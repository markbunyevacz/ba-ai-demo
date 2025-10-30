"""Shared FastAPI dependencies."""
from typing import AsyncIterator

from fastapi import Depends

from config.database import get_db
from models.providers.anthropic_provider import AnthropicProvider
from models.providers.openrouter_provider import OpenRouterProvider


async def get_db_session():
    """Yield database session."""
    async for db in get_db():  # type: ignore[misc]
        yield db


def get_anthropic_provider() -> AnthropicProvider:
    return AnthropicProvider()


def get_openrouter_provider() -> OpenRouterProvider:
    return OpenRouterProvider()

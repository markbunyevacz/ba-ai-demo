"""Local model provider placeholder."""
from __future__ import annotations

from typing import Any, Dict, List

from models.providers.base import ModelProvider


class LocalProvider(ModelProvider):
    def __init__(self):
        raise NotImplementedError("Local provider not yet implemented")

    async def inference(self, prompt: str, model: str, *, system_prompt: str | None = None, **kwargs: Any) -> Dict[str, Any]:
        raise NotImplementedError("Local provider inference not implemented")

    async def list_models(self) -> List[Dict[str, Any]]:
        return []

    async def health_check(self) -> bool:
        return False

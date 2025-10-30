"""Anthropic Claude API provider implementation."""
from __future__ import annotations

import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime

from config.settings import settings
from models.providers.base import ModelProvider


class AnthropicProvider(ModelProvider):
    """Anthropic Claude model provider."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Anthropic provider.

        Args:
            api_key: Anthropic API key (defaults to settings.ANTHROPIC_API_KEY)
        """
        super().__init__(api_key or settings.ANTHROPIC_API_KEY)
        self.base_url = "https://api.anthropic.com/v1"
        self.models_cache: Optional[List[Dict[str, Any]]] = None
        self.cache_updated_at: Optional[datetime] = None

    async def inference(
        self,
        prompt: str,
        model: str = "claude-3-5-sonnet-20241022",
        system_prompt: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """Run inference with Claude model.

        Args:
            prompt: User prompt
            model: Model ID (default: Claude 3.5 Sonnet)
            system_prompt: Optional system message
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            **kwargs: Additional parameters

        Returns:
            Response dict with content, usage, model, finish_reason
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                }

                payload = {
                    "model": model,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": [{"role": "user", "content": prompt}],
                }

                if system_prompt:
                    payload["system"] = system_prompt

                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=headers,
                    json=payload,
                    timeout=60,
                )

                if response.status_code != 200:
                    self._track_request(success=False)
                    raise ValueError(
                        f"Anthropic API error: {response.status_code} - {response.text}"
                    )

                data = response.json()
                self._track_request(success=True)

                return {
                    "content": data["content"][0]["text"],
                    "usage": {
                        "input_tokens": data["usage"]["input_tokens"],
                        "output_tokens": data["usage"]["output_tokens"],
                    },
                    "model": model,
                    "finish_reason": data.get("stop_reason", "end_turn"),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        except Exception as e:
            self._track_request(success=False)
            raise ValueError(f"Anthropic inference failed: {str(e)}")

    async def list_models(self) -> List[Dict[str, Any]]:
        """List available Claude models.

        Returns:
            List of available models with metadata
        """
        # Anthropic doesn't provide a models endpoint, so return hardcoded list
        # Cache for 1 hour
        if (
            self.models_cache is not None
            and self.cache_updated_at is not None
            and (
                (datetime.utcnow() - self.cache_updated_at).total_seconds() < 3600
            )
        ):
            return self.models_cache

        models = [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "description": "Most capable Claude model with strong reasoning",
                "context_window": 200000,
                "max_output_tokens": 4096,
                "recommended": True,
                "capabilities": ["text", "vision"],
                "pricing": {
                    "input_tokens": 0.003,
                    "output_tokens": 0.015,
                },
            },
            {
                "id": "claude-3-5-haiku-20241022",
                "name": "Claude 3.5 Haiku",
                "description": "Fast and efficient Claude model",
                "context_window": 200000,
                "max_output_tokens": 4096,
                "recommended": False,
                "capabilities": ["text"],
                "pricing": {
                    "input_tokens": 0.00080,
                    "output_tokens": 0.0024,
                },
            },
            {
                "id": "claude-3-opus-20250219",
                "name": "Claude 3 Opus",
                "description": "Previous generation, most capable",
                "context_window": 200000,
                "max_output_tokens": 4096,
                "recommended": False,
                "capabilities": ["text", "vision"],
                "pricing": {
                    "input_tokens": 0.015,
                    "output_tokens": 0.075,
                },
            },
        ]

        self.models_cache = models
        self.cache_updated_at = datetime.utcnow()

        return models

    async def health_check(self) -> bool:
        """Check Anthropic API health.

        Returns:
            True if API is accessible
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "x-api-key": self.api_key,
                    "anthropic-version": "2023-06-01",
                }
                # Quick test with minimal input
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=headers,
                    json={
                        "model": "claude-3-5-haiku-20241022",
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "Hi"}],
                    },
                    timeout=10,
                )
                return response.status_code == 200
        except Exception:
            return False

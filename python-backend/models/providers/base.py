"""Base abstract class for AI model providers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime


class ModelProvider(ABC):
    """Abstract base class for AI model providers (Anthropic, OpenRouter, Local)."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize model provider.

        Args:
            api_key: Optional API key for authentication
        """
        self.api_key = api_key
        self.initialized_at = datetime.utcnow()
        self.request_count = 0
        self.error_count = 0

    @abstractmethod
    async def inference(
        self,
        prompt: str,
        model: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """Run inference with the model.

        Args:
            prompt: User prompt/query
            model: Model ID/name to use
            system_prompt: Optional system message
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0-1)
            **kwargs: Additional provider-specific arguments

        Returns:
            Response dict with keys: content, usage, model, finish_reason
        """
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from provider.

        Returns:
            List of model dicts with: id, name, description, context_window, cost
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if provider is accessible.

        Returns:
            True if provider is healthy, False otherwise
        """
        pass

    async def validate_model(self, model: str) -> bool:
        """Check if model is available.

        Args:
            model: Model ID to validate

        Returns:
            True if model exists, False otherwise
        """
        models = await self.list_models()
        return any(m["id"] == model for m in models)

    async def get_model_info(self, model: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific model.

        Args:
            model: Model ID

        Returns:
            Model info dict or None if not found
        """
        models = await self.list_models()
        for m in models:
            if m["id"] == model:
                return m
        return None

    def _track_request(self, success: bool = True):
        """Track API request statistics.

        Args:
            success: Whether request was successful
        """
        self.request_count += 1
        if not success:
            self.error_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get provider statistics.

        Returns:
            Stats dict with request counts and error rates
        """
        error_rate = (
            self.error_count / self.request_count if self.request_count > 0 else 0
        )
        return {
            "initialized_at": self.initialized_at.isoformat(),
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate": error_rate,
            "uptime_minutes": (
                (datetime.utcnow() - self.initialized_at).total_seconds() / 60
            ),
        }

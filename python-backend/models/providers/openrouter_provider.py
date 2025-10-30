"""OpenRouter LLM aggregator provider implementation."""
from __future__ import annotations

import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime

from config.settings import settings
from models.providers.base import ModelProvider


class OpenRouterProvider(ModelProvider):
    """OpenRouter multi-model LLM aggregator provider."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize OpenRouter provider.

        Args:
            api_key: OpenRouter API key (defaults to settings.OPENROUTER_API_KEY)
        """
        super().__init__(api_key or settings.OPENROUTER_API_KEY)
        self.base_url = "https://openrouter.ai/api/v1"
        self.app_name = "BA AI Demo"
        self.models_cache: Optional[List[Dict[str, Any]]] = None
        self.cache_updated_at: Optional[datetime] = None

    async def inference(
        self,
        prompt: str,
        model: str = "openrouter/auto",
        system_prompt: Optional[str] = None,
        max_tokens: int = 4000,
        temperature: float = 0.7,
        **kwargs
    ) -> Dict[str, Any]:
        """Run inference with OpenRouter model.

        Args:
            prompt: User prompt
            model: Model ID (default: openrouter/auto - best available)
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
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": settings.APP_URL,
                    "X-Title": self.app_name,
                    "Content-Type": "application/json",
                }

                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }

                # Add any provider-specific settings
                if "top_p" in kwargs:
                    payload["top_p"] = kwargs["top_p"]
                if "top_k" in kwargs:
                    payload["top_k"] = kwargs["top_k"]

                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=60,
                )

                if response.status_code != 200:
                    self._track_request(success=False)
                    raise ValueError(
                        f"OpenRouter API error: {response.status_code} - {response.text}"
                    )

                data = response.json()
                self._track_request(success=True)

                return {
                    "content": data["choices"][0]["message"]["content"],
                    "usage": {
                        "input_tokens": data["usage"]["prompt_tokens"],
                        "output_tokens": data["usage"]["completion_tokens"],
                        "total_tokens": data["usage"]["total_tokens"],
                    },
                    "model": data.get("model", model),
                    "finish_reason": data["choices"][0].get("finish_reason", "stop"),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        except Exception as e:
            self._track_request(success=False)
            raise ValueError(f"OpenRouter inference failed: {str(e)}")

    async def list_models(self) -> List[Dict[str, Any]]:
        """List available models from OpenRouter.

        Returns:
            List of available models with metadata
        """
        # Cache for 1 hour
        if (
            self.models_cache is not None
            and self.cache_updated_at is not None
            and (
                (datetime.utcnow() - self.cache_updated_at).total_seconds() < 3600
            )
        ):
            return self.models_cache

        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": settings.APP_URL,
                }

                response = await client.get(
                    f"{self.base_url}/models",
                    headers=headers,
                    timeout=10,
                )

                if response.status_code == 200:
                    data = response.json()
                    models = []

                    # Process models from API
                    for model in data.get("data", []):
                        models.append({
                            "id": model.get("id"),
                            "name": model.get("id", "").split("/")[-1],
                            "description": model.get("description", ""),
                            "context_window": model.get("context_length", 4096),
                            "max_output_tokens": model.get("max_tokens", 4096),
                            "recommended": False,
                            "pricing": {
                                "input_tokens": model.get("pricing", {}).get(
                                    "prompt", 0
                                ),
                                "output_tokens": model.get("pricing", {}).get(
                                    "completion", 0
                                ),
                            },
                        })

                    self.models_cache = models
                    self.cache_updated_at = datetime.utcnow()
                    return models

        except Exception as e:
            print(f"Failed to fetch OpenRouter models: {str(e)}")

        # Fallback to common models if API call fails
        fallback_models = [
            {
                "id": "openrouter/auto",
                "name": "Auto (Best Model)",
                "description": "Automatically selects best model for query",
                "context_window": 4096,
                "max_output_tokens": 2048,
                "recommended": True,
            },
            {
                "id": "meta-llama/llama-2-70b-chat",
                "name": "Llama 2 70B Chat",
                "description": "Open source LLM with strong reasoning",
                "context_window": 4096,
                "max_output_tokens": 2048,
                "recommended": False,
            },
            {
                "id": "mistralai/mistral-7b-instruct",
                "name": "Mistral 7B",
                "description": "Fast and efficient open LLM",
                "context_window": 8192,
                "max_output_tokens": 2048,
                "recommended": False,
            },
        ]

        self.models_cache = fallback_models
        self.cache_updated_at = datetime.utcnow()
        return fallback_models

    async def health_check(self) -> bool:
        """Check OpenRouter API health.

        Returns:
            True if API is accessible
        """
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": settings.APP_URL,
                }

                response = await client.get(
                    f"{self.base_url}/models",
                    headers=headers,
                    timeout=10,
                )
                return response.status_code == 200
        except Exception:
            return False

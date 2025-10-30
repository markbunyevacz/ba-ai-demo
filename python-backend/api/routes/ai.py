"""AI model management and listing endpoints."""
from __future__ import annotations

from fastapi import APIRouter
from typing import Dict, Any, List

from models.providers.anthropic_provider import AnthropicProvider
from models.providers.openrouter_provider import OpenRouterProvider

router = APIRouter()


@router.get("/models")
async def list_models() -> Dict[str, Any]:
    """Get available AI models from all providers.

    Returns:
        Dict with providers and their available models
    """
    models_dict = {
        "defaultProvider": "anthropic",
        "providers": {
            "anthropic": {
                "name": "Anthropic",
                "description": "Claude models from Anthropic",
                "configured": True,
            },
            "openrouter": {
                "name": "OpenRouter",
                "description": "Multi-model LLM aggregator",
                "configured": True,
            },
        },
        "models": {
            "anthropic": [],
            "openrouter": [],
        },
    }

    # Fetch Anthropic models
    try:
        anthropic_provider = AnthropicProvider()
        anthropic_models = await anthropic_provider.list_models()
        models_dict["models"]["anthropic"] = anthropic_models
    except Exception as e:
        print(f"Failed to load Anthropic models: {str(e)}")
        models_dict["models"]["anthropic"] = [
            {"id": "claude-3-5-sonnet", "name": "Claude 3.5 Sonnet", "recommended": True},
            {"id": "claude-3-5-haiku", "name": "Claude 3.5 Haiku", "recommended": False},
        ]

    # Fetch OpenRouter models (try to get from API, fallback to static list)
    try:
        openrouter_provider = OpenRouterProvider()
        openrouter_models = await openrouter_provider.list_models()
        models_dict["models"]["openrouter"] = openrouter_models[:10]  # Limit to top 10
    except Exception as e:
        print(f"Failed to load OpenRouter models: {str(e)}")
        models_dict["models"]["openrouter"] = [
            {"id": "openrouter/auto", "name": "Auto (Best model)", "recommended": True},
            {"id": "meta-llama/llama-2-70b-chat", "name": "Llama 2 70B", "recommended": False},
        ]

    return models_dict

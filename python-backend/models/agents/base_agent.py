"""Base agent class for LLM-powered agents."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime
import json

from models.providers.base import ModelProvider


class BaseAgent(ABC):
    """Abstract base class for AI agents."""

    def __init__(
        self,
        name: str,
        provider: ModelProvider,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 4000,
    ):
        """Initialize base agent.

        Args:
            name: Agent name/identifier
            provider: ModelProvider instance
            model: Model ID to use
            temperature: Sampling temperature
            max_tokens: Maximum output tokens
        """
        self.name = name
        self.provider = provider
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.execution_history: List[Dict[str, Any]] = []
        self.created_at = datetime.utcnow()

    def _get_system_prompt(self) -> str:
        """Get system prompt for this agent.

        Should be overridden by subclasses.

        Returns:
            System message for the model
        """
        return f"You are a helpful AI assistant named {self.name}."

    def _build_context(self, **kwargs) -> str:
        """Build context string from kwargs.

        Args:
            **kwargs: Context data

        Returns:
            Formatted context string
        """
        if not kwargs:
            return ""

        context_lines = ["## Context:\n"]
        for key, value in kwargs.items():
            if isinstance(value, (dict, list)):
                context_lines.append(f"{key}: {json.dumps(value, indent=2)}")
            else:
                context_lines.append(f"{key}: {str(value)}")

        return "\n".join(context_lines)

    async def execute_task(
        self,
        task: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute a task.

        Args:
            task: Task description/prompt
            **kwargs: Additional context

        Returns:
            Result dict with output, model info, usage stats
        """
        try:
            # Build full prompt
            context = self._build_context(**kwargs)
            full_prompt = f"{context}\n\n{task}" if context else task

            # Get system prompt
            system_prompt = self._get_system_prompt()

            # Call model
            response = await self.provider.inference(
                prompt=full_prompt,
                model=self.model,
                system_prompt=system_prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
            )

            # Validate output
            validated = await self._validate_output(response)

            # Track execution
            execution_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "task": task,
                "model": self.model,
                "status": "success" if validated["valid"] else "partial",
                "usage": response.get("usage", {}),
                "errors": validated.get("errors", []),
            }
            self.execution_history.append(execution_record)

            return {
                "success": validated["valid"],
                "output": response.get("content", ""),
                "validation": validated,
                "usage": response.get("usage", {}),
                "model": self.model,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            execution_record = {
                "timestamp": datetime.utcnow().isoformat(),
                "task": task,
                "status": "error",
                "error": str(e),
            }
            self.execution_history.append(execution_record)

            return {
                "success": False,
                "output": "",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat(),
            }

    @abstractmethod
    async def _validate_output(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Validate model output.

        Should be implemented by subclasses.

        Args:
            response: Response from model provider

        Returns:
            Validation result dict with keys: valid, errors, warnings
        """
        pass

    async def health_check(self) -> bool:
        """Check if agent is healthy.

        Returns:
            True if agent is ready to execute tasks
        """
        try:
            # Check provider health
            provider_ok = await self.provider.health_check()
            if not provider_ok:
                return False

            # Check model availability
            model_ok = await self.provider.validate_model(self.model)
            return model_ok

        except Exception:
            return False

    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics.

        Returns:
            Stats dict with execution info
        """
        total_executions = len(self.execution_history)
        successful = sum(
            1
            for e in self.execution_history
            if e.get("status") in ["success", "partial"]
        )

        return {
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "total_executions": total_executions,
            "successful": successful,
            "failed": total_executions - successful,
            "success_rate": (
                successful / total_executions if total_executions > 0 else 0
            ),
            "provider_stats": self.provider.get_stats(),
        }

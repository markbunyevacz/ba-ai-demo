"""DocumentAgent for summarizing and extracting insights from documents."""
from __future__ import annotations

import json
from typing import Any, Dict, Optional

from models.agents.base_agent import BaseAgent
from models.providers.base import ModelProvider


class DocumentAgent(BaseAgent):
    """Agent that summarizes documents and extracts action items."""

    def __init__(
        self,
        provider: ModelProvider,
        model: str = "claude-3-5-haiku-20241022",
        temperature: float = 0.4,
        max_tokens: int = 1500,
    ) -> None:
        super().__init__(
            name="DocumentAgent",
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def _get_system_prompt(self) -> str:
        return (
            "You are a senior business analyst AI that reviews documents and "
            "produces concise summaries, risks, and recommended actions in "
            "JSON."
        )

    async def summarize_document(
        self,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Summarize a document using the language model."""
        if not content:
            return {
                "summary": "",
                "risks": [],
                "recommendations": [],
                "metadata": metadata or {},
                "ai_enhanced": False,
            }

        task = (
            "Analyze the following document and respond with JSON containing "
            "the keys: summary (string), risks (array of strings), "
            "recommendations (array of strings)."
        )

        result = await self.execute_task(
            task,
            document=content[:8000],
            metadata=metadata or {},
        )

        if not result.get("success"):
            return {
                "summary": content[:280],
                "risks": [],
                "recommendations": [],
                "metadata": metadata or {},
                "ai_enhanced": False,
                "error": result.get("error"),
            }

        try:
            parsed = json.loads(result["output"])
            return {
                "summary": parsed.get("summary", ""),
                "risks": parsed.get("risks", []),
                "recommendations": parsed.get("recommendations", []),
                "metadata": metadata or {},
                "ai_enhanced": True,
            }
        except json.JSONDecodeError:
            return {
                "summary": result.get("output", ""),
                "risks": [],
                "recommendations": [],
                "metadata": metadata or {},
                "ai_enhanced": True,
                "warning": "Model response was not valid JSON",
            }

    async def _validate_output(
        self,
        response: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Validate AI response structure."""
        content = response.get("content")
        if not content:
            return {
                "valid": False,
                "errors": ["Empty response"],
                "warnings": [],
            }

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            return {
                "valid": False,
                "errors": ["Response not valid JSON"],
                "warnings": [],
            }

        required = {"summary", "risks", "recommendations"}
        missing = [field for field in required if field not in parsed]

        errors = []
        if missing:
            errors.append(f"Missing fields: {', '.join(missing)}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": [],
        }

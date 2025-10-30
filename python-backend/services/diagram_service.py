"""Diagram generation placeholder service."""
from __future__ import annotations

from typing import Dict


class DiagramService:
    async def render(self, definition: str, formats: list[str]) -> Dict[str, str]:
        return {fmt: "" for fmt in formats}

    async def generate(self, description: str) -> Dict[str, str]:
        return {"definition": "", "svg": ""}

"""Diagram rendering and generation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.diagram_service import DiagramService

router = APIRouter()
diagram_service = DiagramService()


class RenderRequest(BaseModel):
    """Request body for diagram rendering."""
    definition: str
    formats: list[str] = ["svg"]


class GenerateRequest(BaseModel):
    """Request body for diagram generation."""
    description: str
    type: Optional[str] = "flowchart"


@router.post("/render")
async def render_diagram(request: RenderRequest) -> Dict[str, Any]:
    """Render diagram from Mermaid definition.

    Args:
        request: RenderRequest with definition and formats

    Returns:
        Rendered diagram in requested formats
    """
    if not request.definition:
        raise HTTPException(status_code=400, detail="Diagram definition required")

    try:
        result = await diagram_service.render(request.definition, request.formats)
        return {
            "definition": request.definition,
            "formats": request.formats,
            "rendered": result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to render diagram: {str(e)}")


@router.post("/generate")
async def generate_diagram(request: GenerateRequest) -> Dict[str, Any]:
    """Generate diagram from description (placeholder for future ML integration).

    Args:
        request: GenerateRequest with description

    Returns:
        Generated diagram definition
    """
    if not request.description:
        raise HTTPException(status_code=400, detail="Description required")

    try:
        result = await diagram_service.generate(request.description)
        return {
            "description": request.description,
            "type": request.type,
            "definition": result.get("definition", ""),
            "svg": result.get("svg", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate diagram: {str(e)}")

"""Grounding validation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from services.grounding_service import GroundingService

router = APIRouter()
grounding_service = GroundingService()


@router.get("/stats")
async def grounding_stats() -> Dict[str, Any]:
    """Get grounding service statistics.

    Returns:
        Dictionary with knowledge base size, validation rules, supported formats
    """
    return grounding_service.get_grounding_stats()


@router.post("/validate")
async def validate_ticket(ticket: Dict[str, Any]) -> Dict[str, Any]:
    """Validate a ticket against knowledge base.

    Args:
        ticket: Ticket object to validate

    Returns:
        Validation result with confidence score and issues
    """
    if not ticket:
        raise HTTPException(status_code=400, detail="Ticket data required")

    validation = grounding_service.validate_ticket(ticket, {})
    return validation

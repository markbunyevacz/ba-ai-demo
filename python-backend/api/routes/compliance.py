"""Compliance validation endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from services.compliance_service import ComplianceService

router = APIRouter()
compliance_service = ComplianceService()


class ValidateRequest(BaseModel):
    """Request body for compliance validation."""
    tickets: Optional[List[Dict[str, Any]]] = None
    standards: Optional[List[str]] = None


@router.get("/standards")
async def get_standards() -> List[Dict[str, Any]]:
    """Get available compliance standards.

    Returns:
        List of compliance standards with descriptions
    """
    return compliance_service.get_standards()


@router.post("/validate")
async def validate_compliance(request: ValidateRequest) -> Dict[str, Any]:
    """Validate tickets for compliance.

    Args:
        request: Request with tickets and optional standards filter

    Returns:
        Compliance validation results
    """
    if not request.tickets:
        raise HTTPException(status_code=400, detail="Tickets required for validation")

    results = []
    for ticket in request.tickets:
        evaluation = compliance_service.evaluate_ticket(ticket)
        results.append(evaluation)

    avg_score = sum(r.get("score", 0) for r in results) / len(results) if results else 0

    return {
        "overallScore": avg_score,
        "status": "compliant" if avg_score >= 80 else "partial" if avg_score >= 50 else "gap",
        "standards": request.standards or ["PMI", "BABOK"],
        "tickets": results,
        "total": len(results),
    }


@router.post("/report")
async def generate_report(request: ValidateRequest) -> Dict[str, Any]:
    """Generate compliance report for tickets.

    Args:
        request: Request with tickets

    Returns:
        Detailed compliance report
    """
    if not request.tickets:
        raise HTTPException(status_code=400, detail="Tickets required for report")

    tickets = request.tickets
    evaluations = [compliance_service.evaluate_ticket(t) for t in tickets]

    # Find non-compliant tickets
    non_compliant = [
        {
            "ticketId": t.get("id", f"ticket_{i}"),
            "status": e.get("status"),
            "overallScore": e.get("score"),
            "gaps": e.get("gaps", []),
        }
        for i, (t, e) in enumerate(zip(tickets, evaluations))
        if e.get("status") != "compliant"
    ]

    avg_score = sum(e.get("score", 0) for e in evaluations) / len(evaluations) if evaluations else 0

    return {
        "totalTickets": len(tickets),
        "compliantTickets": len(tickets) - len(non_compliant),
        "nonCompliantTickets": non_compliant,
        "averageScore": avg_score,
        "status": "compliant" if len(non_compliant) == 0 else "non-compliant",
        "standards": ["PMI", "BABOK"],
    }

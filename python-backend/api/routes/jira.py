"""Jira integration endpoints (OAuth and ticket management)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from services.jira_service import JiraService

router = APIRouter()
jira_service = JiraService()


class CreateTicketsRequest(BaseModel):
    """Request body for ticket creation."""
    tickets: List[Dict[str, Any]]
    project: Optional[str] = "BA"


@router.get("/status")
async def jira_status() -> Dict[str, Any]:
    """Get Jira connection status.

    Returns:
        Connected status and user info (if connected)
    """
    try:
        status = await jira_service.status()
        return status
    except Exception as e:
        return {
            "connected": False,
            "message": "Jira service not available",
            "error": str(e),
        }


@router.get("/auth")
async def jira_auth_redirect() -> Dict[str, str]:
    """Get Jira OAuth authorization URL.

    Returns:
        Authorization URL for user redirect
    """
    try:
        auth_url = await jira_service.get_auth_url()
        return {"auth_url": auth_url, "redirect": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get auth URL: {str(e)}")


@router.get("/callback")
async def jira_auth_callback(code: str = Query(...), state: str = Query(...)) -> Dict[str, Any]:
    """Handle Jira OAuth callback.

    Args:
        code: Authorization code from Jira
        state: State parameter for security

    Returns:
        Token and user info
    """
    try:
        token_data = await jira_service.handle_callback(code, state)
        return {
            "success": True,
            "token": token_data,
            "message": "Successfully authenticated with Jira",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")


@router.post("/create-tickets")
async def create_tickets(request: CreateTicketsRequest) -> Dict[str, Any]:
    """Create tickets in Jira.

    Args:
        request: Request with tickets to create

    Returns:
        Created ticket IDs and status
    """
    if not request.tickets:
        raise HTTPException(status_code=400, detail="Tickets required")

    try:
        created = await jira_service.create_tickets(request.tickets)
        return {
            "success": True,
            "created": len(created),
            "tickets": created,
            "project": request.project,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create tickets: {str(e)}")


@router.post("/logout")
async def jira_logout() -> Dict[str, str]:
    """Logout from Jira.

    Returns:
        Logout confirmation
    """
    return {
        "success": True,
        "message": "Logged out from Jira",
    }

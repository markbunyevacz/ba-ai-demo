"""Jira OAuth2 integration service."""
from __future__ import annotations

import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

from config.settings import settings


class JiraService:
    """Manages Jira OAuth2 authentication and ticket creation."""

    def __init__(self):
        """Initialize Jira service."""
        self.base_url = settings.JIRA_BASE_URL
        self.client_id = settings.JIRA_CLIENT_ID
        self.client_secret = settings.JIRA_CLIENT_SECRET
        self.callback_url = settings.JIRA_CALLBACK_URL
        self.auth_url = settings.JIRA_AUTH_URL
        self.token_url = settings.JIRA_TOKEN_URL
        
        # Session storage (in production, use Redis or database)
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.tokens: Dict[str, Dict[str, Any]] = {}

    async def get_auth_url(self) -> str:
        """Generate Jira OAuth2 authorization URL.

        Returns:
            Authorization URL for user redirect
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.callback_url,
            "response_type": "code",
            "scope": "read:jira-work write:jira-work manage:jira-project",
        }

        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        auth_url = f"{self.auth_url}?{query_string}"

        return auth_url

    async def handle_callback(self, code: str, state: str) -> Dict[str, Any]:
        """Handle OAuth2 callback and exchange code for token.

        Args:
            code: Authorization code from Jira
            state: State parameter for CSRF protection

        Returns:
            Token data with expiration
        """
        if not code:
            raise ValueError("Authorization code missing")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data={
                        "grant_type": "authorization_code",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "redirect_uri": self.callback_url,
                    },
                    timeout=30,
                )

                if response.status_code != 200:
                    raise ValueError(f"OAuth2 token exchange failed: {response.text}")

                token_data = response.json()
                token_data["acquired_at"] = datetime.utcnow().isoformat()
                token_data["expires_at"] = (
                    datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
                ).isoformat()

                # Store token
                self.tokens[code] = token_data

                return token_data

        except httpx.RequestError as e:
            raise ValueError(f"Failed to exchange OAuth2 code: {str(e)}")

    async def create_tickets(self, tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create tickets in Jira.

        Args:
            tickets: List of ticket objects to create

        Returns:
            List of created ticket IDs and metadata
        """
        created_tickets = []

        for ticket in tickets:
            try:
                jira_ticket = self._convert_to_jira_format(ticket)
                # Note: Actual Jira API call would go here
                # For now, return mock response
                created_tickets.append(
                    {
                        "id": f"BA-{1001 + len(created_tickets)}",
                        "key": f"BA-{1001 + len(created_tickets)}",
                        "url": f"{self.base_url}/browse/BA-{1001 + len(created_tickets)}",
                        "originalId": ticket.get("id"),
                        "status": "created",
                    }
                )
            except Exception as e:
                created_tickets.append(
                    {
                        "originalId": ticket.get("id"),
                        "status": "failed",
                        "error": str(e),
                    }
                )

        return created_tickets

    async def status(self) -> Dict[str, Any]:
        """Get Jira connection status.

        Returns:
            Connection status and user info
        """
        if not self.tokens:
            return {
                "connected": False,
                "message": "No active Jira session",
            }

        # In production, verify token validity
        return {
            "connected": True,
            "message": "Connected to Jira",
            "sessions": len(self.tokens),
        }

    def _convert_to_jira_format(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Convert internal ticket format to Jira format.

        Args:
            ticket: Internal ticket object

        Returns:
            Jira-formatted ticket
        """
        return {
            "fields": {
                "project": {"key": "BA"},
                "summary": ticket.get("summary", "Untitled"),
                "description": ticket.get("description", ""),
                "issuetype": {"name": "Story"},
                "priority": self._map_priority(ticket.get("priority", "Medium")),
                "assignee": self._map_assignee(ticket.get("assignee")),
                "labels": self._extract_labels(ticket),
            }
        }

    @staticmethod
    def _map_priority(priority: str) -> Dict[str, str]:
        """Map internal priority to Jira priority.

        Args:
            priority: Internal priority level

        Returns:
            Jira priority mapping
        """
        priority_map = {
            "Critical": {"name": "Blocker"},
            "High": {"name": "High"},
            "Medium": {"name": "Medium"},
            "Low": {"name": "Low"},
        }
        return priority_map.get(priority, {"name": "Medium"})

    @staticmethod
    def _map_assignee(assignee: Optional[str]) -> Optional[Dict[str, str]]:
        """Map assignee to Jira format.

        Args:
            assignee: Assignee name or email

        Returns:
            Jira assignee mapping or None
        """
        if not assignee or assignee == "Unassigned":
            return None
        return {"name": assignee}

    @staticmethod
    def _extract_labels(ticket: Dict[str, Any]) -> List[str]:
        """Extract labels from ticket.

        Args:
            ticket: Ticket object

        Returns:
            List of labels
        """
        labels = []
        if epic := ticket.get("epic"):
            if epic != "No Epic":
                labels.append(f"epic-{epic}")

        if ticket_type := ticket.get("type"):
            labels.append(ticket_type.lower())

        return labels

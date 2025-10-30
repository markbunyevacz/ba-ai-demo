"""TicketAgent for ML-powered ticket refinement and validation."""
from __future__ import annotations

from typing import Any, Dict, Optional
import json

from models.agents.base_agent import BaseAgent
from models.providers.base import ModelProvider
from services.grounding_service import GroundingService


class TicketAgent(BaseAgent):
    """Agent specialized in ticket processing and refinement."""

    def __init__(
        self,
        provider: ModelProvider,
        grounding_service: GroundingService,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.5,
        max_tokens: int = 2000,
    ):
        """Initialize TicketAgent.

        Args:
            provider: ModelProvider instance
            grounding_service: GroundingService for validation
            model: Model ID to use
            temperature: Lower temperature for consistency (0.5)
            max_tokens: Max output tokens (2000)
        """
        super().__init__(
            name="TicketAgent",
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        self.grounding_service = grounding_service

    def _get_system_prompt(self) -> str:
        """Get specialized system prompt for ticket refinement.

        Returns:
            System message
        """
        return """You are a Business Analyst AI Assistant specializing in ticket refinement and analysis.
Your job is to improve, clarify, and enhance tickets based on the provided information.

Guidelines:
1. Ensure clear, concise summaries (10-50 characters)
2. Write detailed descriptions with business context
3. Define testable acceptance criteria
4. Identify relevant stakeholders
5. Consider project impact and dependencies

Always respond with valid JSON containing the refined ticket structure."""

    async def process_ticket(
        self,
        ticket: Dict[str, Any],
        source_data: Optional[Dict[str, Any]] = None,
        enhance: bool = True,
    ) -> Dict[str, Any]:
        """Process and refine a ticket using AI.

        Args:
            ticket: Original ticket dict
            source_data: Optional source data for context
            enhance: Whether to enhance or just validate

        Returns:
            Processed ticket with AI enhancements
        """
        # First, rule-based validation
        rule_validation = self.grounding_service.validate_ticket(
            ticket, source_data or {}
        )

        # If confidence is high, return with grounding metadata
        if rule_validation["confidence"] >= 0.85 and not enhance:
            return self.grounding_service.enhance_with_grounding(ticket, source_data or {})

        # Otherwise, use AI for refinement
        refinement_prompt = self._build_refinement_prompt(ticket, rule_validation)

        result = await self.execute_task(
            refinement_prompt,
            original_ticket=ticket,
            validation_feedback=rule_validation,
        )

        if result["success"]:
            try:
                # Parse AI response
                refined = json.loads(result["output"])

                # Validate refined ticket
                refined_validation = self.grounding_service.validate_ticket(
                    refined, source_data or {}
                )

                # Merge with grounding
                enhanced = self.grounding_service.enhance_with_grounding(
                    refined, source_data or {}
                )

                enhanced["_refinement"] = {
                    "ai_enhanced": True,
                    "original_confidence": rule_validation["confidence"],
                    "refined_confidence": refined_validation["confidence"],
                    "improvements": refined_validation.get("warnings", []),
                }

                return enhanced

            except json.JSONDecodeError as e:
                # Fallback to rule-based if AI output is invalid
                return self.grounding_service.enhance_with_grounding(
                    ticket, source_data or {}
                )
        else:
            # AI call failed, use rule-based
            return self.grounding_service.enhance_with_grounding(
                ticket, source_data or {}
            )

    def _build_refinement_prompt(
        self, ticket: Dict[str, Any], validation: Dict[str, Any]
    ) -> str:
        """Build prompt for ticket refinement.

        Args:
            ticket: Original ticket
            validation: Rule-based validation result

        Returns:
            Refinement prompt
        """
        issues = validation.get("issues", [])
        warnings = validation.get("warnings", [])

        issues_text = "\n".join(f"- {issue}" for issue in issues) if issues else "None"
        warnings_text = "\n".join(f"- {w}" for w in warnings) if warnings else "None"

        prompt = f"""Please refine the following ticket to improve clarity, completeness, and business alignment.

Original Ticket:
{json.dumps(ticket, indent=2)}

Validation Issues (must fix):
{issues_text}

Suggestions to Improve (nice to have):
{warnings_text}

Please provide the refined ticket as valid JSON with the following structure:
{{
  "id": "Ticket ID (keep original if valid, suggest if not)",
  "summary": "Clear, concise title (10-50 chars recommended)",
  "description": "Detailed description with business context and requirements",
  "priority": "One of: Critical, High, Medium, Low",
  "type": "One of: Bug, Feature, Enhancement, Task, Story, Epic",
  "assignee": "Suggested assignee if identifiable, or 'Unassigned'",
  "epic": "Epic name or 'No Epic'",
  "acceptanceCriteria": ["Testable criteria as a list"],
  "stakeholders": ["List of identified stakeholders"],
  "estimatedEffort": "XS/S/M/L/XL (if estimable)"
}}

Focus on making the ticket actionable and clear for the development team."""

        return prompt

    async def _validate_output(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Validate AI output for ticket refinement.

        Args:
            response: Response from model provider

        Returns:
            Validation result
        """
        content = response.get("content", "")
        errors = []
        warnings = []

        if not content:
            errors.append("Empty response from model")
            return {"valid": False, "errors": errors, "warnings": warnings}

        # Try to parse JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            warnings.append("Response is not valid JSON, attempting to extract structure")
            return {"valid": False, "errors": errors, "warnings": warnings}

        # Check required fields
        required_fields = [
            "summary",
            "description",
            "priority",
            "type",
            "acceptanceCriteria",
        ]

        for field in required_fields:
            if field not in parsed or not parsed[field]:
                errors.append(f"Missing required field: {field}")

        # Validate field values
        if parsed.get("priority") not in [
            "Critical",
            "High",
            "Medium",
            "Low",
        ]:
            errors.append(
                f"Invalid priority: {parsed.get('priority')}"
            )

        if parsed.get("type") not in [
            "Bug",
            "Feature",
            "Enhancement",
            "Task",
            "Story",
            "Epic",
        ]:
            errors.append(f"Invalid type: {parsed.get('type')}")

        # Check acceptance criteria
        ac = parsed.get("acceptanceCriteria", [])
        if not isinstance(ac, list) or len(ac) == 0:
            warnings.append("No acceptance criteria provided")
        elif len(ac) > 10:
            warnings.append(f"Too many acceptance criteria ({len(ac)}), consider consolidating")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "parsed": parsed,
        }

    async def batch_process_tickets(
        self,
        tickets: list[Dict[str, Any]],
        source_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Process multiple tickets.

        Args:
            tickets: List of tickets
            source_data: Optional source data

        Returns:
            Batch processing result
        """
        results = {
            "total": len(tickets),
            "processed": 0,
            "enhanced": 0,
            "failed": 0,
            "tickets": [],
        }

        for ticket in tickets:
            try:
                result = await self.process_ticket(ticket, source_data)
                results["tickets"].append(result)
                results["processed"] += 1

                if result.get("_refinement", {}).get("ai_enhanced"):
                    results["enhanced"] += 1

            except Exception as e:
                results["failed"] += 1
                results["tickets"].append({
                    "id": ticket.get("id"),
                    "error": str(e),
                    "status": "failed",
                })

        return results

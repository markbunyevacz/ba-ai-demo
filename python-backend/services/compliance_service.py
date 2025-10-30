"""Compliance service for PMI/BABOK standards validation."""
from __future__ import annotations

from typing import Any, Dict, List


class ComplianceService:
    """Validates tickets against PMI/BABOK standards."""

    # PMI/BABOK compliance areas
    COMPLIANCE_AREAS = {
        "requirements": [
            "requirements",
            "acceptance",
            "criteria",
            "specification",
        ],
        "documentation": ["documentation", "document", "report", "artifact"],
        "communication": ["communication", "notify", "inform", "report", "stakeholder"],
        "risk": ["risk", "mitigation", "contingency", "issue"],
        "quality": ["quality", "testing", "review", "validation"],
        "scope": ["scope", "boundary", "inclusion", "exclusion"],
        "schedule": ["timeline", "deadline", "date", "milestone", "schedule"],
    }

    BABOK_KNOWLEDGE_AREAS = [
        "Business Analysis Planning & Monitoring",
        "Elicitation & Collaboration",
        "Requirements Analysis",
        "Traceability & Monitoring",
        "Requirements Communication",
        "Implementation & Deployment",
        "Solution Evaluation",
    ]

    def __init__(self):
        """Initialize compliance service."""
        pass

    def evaluate_ticket(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate ticket compliance with standards.

        Args:
            ticket: Ticket object

        Returns:
            Compliance evaluation result
        """
        evaluation = {
            "status": "compliant",
            "score": 100.0,
            "gaps": [],
            "recommendations": [],
            "areas": {},
        }

        # Check required fields
        required_fields = ["summary", "description", "priority", "type"]
        missing_fields = [f for f in required_fields if not ticket.get(f)]

        if missing_fields:
            evaluation["status"] = "gap"
            evaluation["gaps"].append(f"Missing fields: {', '.join(missing_fields)}")
            evaluation["score"] -= len(missing_fields) * 10

        # Check compliance areas
        context = self._build_context(ticket)
        for area, keywords in self.COMPLIANCE_AREAS.items():
            coverage = sum(1 for kw in keywords if kw in context) / len(keywords)
            evaluation["areas"][area] = {"coverage": coverage, "compliant": coverage > 0.3}

            if coverage < 0.3:
                evaluation["gaps"].append(f"Low coverage in {area}: {coverage:.0%}")
                evaluation["score"] -= 5

        # Check acceptance criteria
        criteria = ticket.get("acceptanceCriteria", [])
        if not criteria or len(criteria) == 0:
            evaluation["gaps"].append("No acceptance criteria defined")
            evaluation["score"] -= 15
            evaluation["status"] = "gap"

        # Check description quality
        description = ticket.get("description", "")
        if len(description) < 50:
            evaluation["gaps"].append("Description too short (< 50 chars)")
            evaluation["score"] -= 10

        # Determine status
        if evaluation["score"] < 50:
            evaluation["status"] = "gap"
        elif evaluation["score"] < 80:
            evaluation["status"] = "partial"

        # Add recommendations
        evaluation["recommendations"] = self._generate_recommendations(evaluation, ticket)

        return evaluation

    def _build_context(self, ticket: Dict[str, Any]) -> str:
        """Build analysis context from ticket."""
        parts = [
            ticket.get("summary", ""),
            ticket.get("description", ""),
            ticket.get("type", ""),
        ]

        if isinstance(ticket.get("acceptanceCriteria"), list):
            parts.append(" ".join(ticket["acceptanceCriteria"]))

        return " ".join(filter(None, parts)).lower()

    def _generate_recommendations(self, evaluation: Dict[str, Any], ticket: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate compliance recommendations."""
        recommendations = []

        # Missing acceptance criteria
        if not ticket.get("acceptanceCriteria"):
            recommendations.append(
                {
                    "area": "Requirements",
                    "recommendation": "Add acceptance criteria that define when the ticket is complete",
                    "impact": "Improves requirement clarity and testing",
                }
            )

        # Short description
        if len(ticket.get("description", "")) < 100:
            recommendations.append(
                {
                    "area": "Documentation",
                    "recommendation": "Expand description with more details and context",
                    "impact": "Better understanding for implementation team",
                }
            )

        # Low coverage areas
        for area, data in evaluation.get("areas", {}).items():
            if data.get("coverage", 0) < 0.3:
                recommendations.append(
                    {
                        "area": "Compliance",
                        "recommendation": f"Address {area} coverage in documentation",
                        "impact": f"Increases {area} compliance",
                    }
                )

        return recommendations

    def get_standards(self) -> List[Dict[str, str]]:
        """Get list of compliance standards.

        Returns:
            List of standards
        """
        return [
            {
                "standard": "PMI",
                "description": "Project Management Institute standards",
                "areas": list(self.COMPLIANCE_AREAS.keys()),
            },
            {
                "standard": "BABOK",
                "description": "Business Analysis Body of Knowledge",
                "areas": self.BABOK_KNOWLEDGE_AREAS,
            },
        ]

    def validate_compliance(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Validate ticket compliance (simplified wrapper).

        Args:
            ticket: Ticket to validate

        Returns:
            Validation result
        """
        evaluation = self.evaluate_ticket(ticket)
        return {
            "overallScore": evaluation["score"],
            "status": evaluation["status"],
            "standards": ["PMI", "BABOK"],
            "gaps": evaluation["gaps"],
        }

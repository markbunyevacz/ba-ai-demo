"""Grounding Service for AI Output Validation and RAG.

Implements fact-checking, hallucination detection, and knowledge-based validation.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from services.compliance_service import ComplianceService


class GroundingService:
    """Validates AI-generated content against knowledge base and source data."""

    # Priority and classification rules
    VALID_PRIORITIES = ["Critical", "High", "Medium", "Low"]
    PRIORITY_MAPPING = {
        "Kritikus": "Critical",
        "Magas": "High",
        "Közepes": "Medium",
        "Alacsony": "Low",
        "URGENT": "Critical",
        "HIGH": "High",
        "MEDIUM": "Medium",
        "LOW": "Low",
        "Must have": "Critical",
        "Should have": "High",
        "Could have": "Medium",
        "Won't have": "Low",
    }

    VALID_TYPES = ["Bug", "Feature", "Enhancement", "Task", "Story", "Epic"]

    # Validation patterns
    EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    ASSIGNEE_PATTERNS = [
        re.compile(r"^[A-Za-z\s\.]+$"),  # Names
        re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),  # Email
        re.compile(r"^[A-Za-z0-9\-_]+$"),  # Usernames
        re.compile(r"^Team\s+[A-Za-z0-9\s]+$"),  # Teams
    ]
    EPIC_PATTERNS = [
        re.compile(r"^[A-Z]{2,}-\d+$"),  # Project-ID format
        re.compile(r"^[A-Za-z\s]+$"),  # Text format
    ]

    # Stakeholder analysis rules
    POWER_LEVELS = ["High", "Medium", "Low"]
    INTEREST_LEVELS = ["High", "Medium", "Low"]
    GENERIC_NAMES = [
        "User",
        "Admin",
        "Manager",
        "Developer",
        "Team",
        "Stakeholder",
        "Client",
        "Customer",
    ]

    def __init__(self):
        """Initialize knowledge base and validation rules."""
        self.knowledge_base: Dict[str, Any] = {}
        self.validation_rules: Dict[str, Any] = {}
        self.source_attribution: Dict[str, Any] = {}
        self.compliance_service = ComplianceService()
        self._initialize_knowledge_base()

    def _initialize_knowledge_base(self) -> None:
        """Load business rules and validation patterns into knowledge base."""
        self.knowledge_base = {
            "ticket_priorities": self.VALID_PRIORITIES,
            "ticket_types": self.VALID_TYPES,
            "priority_mapping": self.PRIORITY_MAPPING,
            "power_levels": self.POWER_LEVELS,
            "interest_levels": self.INTEREST_LEVELS,
        }

        self.validation_rules = {
            "summary": {"minLength": 10, "maxLength": 255},
            "description": {"minLength": 20, "maxLength": 5000},
            "acceptance_criteria": {"maxItems": 10},
            "confidence_weights": {
                "priority_match": 0.2,
                "summary_valid": 0.15,
                "assignee_valid": 0.1,
                "no_hallucination": 0.3,
                "compliance_pass": 0.25,
            },
            "thresholds": {
                "minimum_confidence": 0.7,
                "hallucination_threshold": 0.5,
            },
        }

    def validate_ticket(
        self, ticket: Dict[str, Any], source_data: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """Validate AI-generated ticket against knowledge base.

        Args:
            ticket: Generated ticket object
            source_data: Original Excel data for source attribution

        Returns:
            Validation result with confidence score
        """
        validation = {
            "isValid": True,
            "confidence": 1.0,
            "issues": [],
            "sources": [],
            "warnings": [],
            "compliance": {},
        }

        # Validate priority
        if ticket.get("priority") not in self.knowledge_base["ticket_priorities"]:
            validation["issues"].append(f"Invalid priority: {ticket.get('priority')}")
            validation["confidence"] -= 0.2

        # Validate ticket type
        if ticket.get("type") not in self.knowledge_base["ticket_types"]:
            validation["issues"].append(f"Invalid ticket type: {ticket.get('type')}")
            validation["confidence"] -= 0.15

        # Validate summary length
        summary = ticket.get("summary", "")
        summary_rules = self.validation_rules["summary"]
        if len(summary) < summary_rules["minLength"] or len(summary) > summary_rules["maxLength"]:
            validation["issues"].append(f"Summary length invalid: {len(summary)} chars")
            validation["confidence"] -= 0.1

        # Validate assignee format
        assignee = ticket.get("assignee", "Unassigned")
        if assignee != "Unassigned":
            is_valid_assignee = any(
                pattern.match(assignee) for pattern in self.ASSIGNEE_PATTERNS
            )
            if not is_valid_assignee:
                validation["warnings"].append(f"Assignee format may be invalid: {assignee}")
                validation["confidence"] -= 0.05

        # Validate epic format
        epic = ticket.get("epic", "No Epic")
        if epic != "No Epic":
            is_valid_epic = any(pattern.match(epic) for pattern in self.EPIC_PATTERNS)
            if not is_valid_epic:
                validation["warnings"].append(f"Epic format may be invalid: {epic}")
                validation["confidence"] -= 0.05

        # Check for hallucinations
        hallucination_check = self.detect_hallucination(ticket, source_data or {})
        if hallucination_check["detected"]:
            validation["issues"].append(f"Potential hallucination: {hallucination_check['reason']}")
            validation["confidence"] -= 0.3

        # Standards compliance validation
        try:
            compliance = self.compliance_service.evaluate_ticket(ticket)
            validation["compliance"] = compliance

            if compliance.get("status") == "gap":
                validation["issues"].append("Ticket fails PMI/BABOK compliance checks")
                validation["confidence"] -= 0.15
            elif compliance.get("status") == "partial":
                validation["warnings"].append("Ticket partially meets PMI/BABOK standards")
                validation["confidence"] -= 0.05
        except Exception as e:
            validation["warnings"].append(f"Compliance evaluation failed: {str(e)}")

        # Add source attribution
        if source_data:
            validation["sources"].append(
                {
                    "type": "excel_data",
                    "timestamp": datetime.utcnow().isoformat(),
                    "row": source_data.get("rowIndex", -1),
                }
            )

        # Final validity check
        validation["isValid"] = validation["confidence"] > self.validation_rules["thresholds"]["minimum_confidence"]
        return validation

    def detect_hallucination(
        self, ticket: Dict[str, Any], source_data: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """Detect potential hallucinations in AI-generated ticket.

        Args:
            ticket: Generated ticket
            source_data: Original source data

        Returns:
            Hallucination detection result
        """
        detection = {"detected": False, "reason": "", "confidence": 0.0}

        # Check for fabricated IDs
        ticket_id = ticket.get("id", "")
        if ticket_id and not ticket_id.startswith("MVM-"):
            detection["detected"] = True
            detection["reason"] = "Ticket ID format mismatch"
            detection["confidence"] = 0.9
            return detection

        # Check for excessive acceptance criteria
        criteria = ticket.get("acceptanceCriteria", [])
        if criteria and len(criteria) > 10:
            detection["detected"] = True
            detection["reason"] = "Excessive acceptance criteria count"
            detection["confidence"] = 0.7
            return detection

        # Check for fabricated timestamps
        created_at_str = ticket.get("createdAt")
        if created_at_str:
            try:
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                now = datetime.utcnow()
                one_day_ago = now - timedelta(days=1)

                if created_at > now or created_at < one_day_ago:
                    detection["detected"] = True
                    detection["reason"] = "Suspicious timestamp"
                    detection["confidence"] = 0.6
                    return detection
            except (ValueError, AttributeError):
                pass

        return detection

    def enhance_with_grounding(
        self, ticket: Dict[str, Any], source_data: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """Enhance ticket with grounding metadata.

        Args:
            ticket: Original ticket
            source_data: Source data for attribution

        Returns:
            Enhanced ticket with _grounding metadata
        """
        validation = self.validate_ticket(ticket, source_data)

        return {
            **ticket,
            "_grounding": {
                "validated": validation["isValid"],
                "confidence": validation["confidence"],
                "issues": validation["issues"],
                "warnings": validation["warnings"],
                "sources": validation["sources"],
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0",
            },
        }

    def get_grounding_stats(self) -> Dict[str, Any]:
        """Get grounding statistics.

        Returns:
            Grounding metrics and coverage info
        """
        return {
            "knowledgeBaseSize": len(self.knowledge_base),
            "validationRulesCount": len(self.validation_rules),
            "supportedFormats": {
                "priorities": self.knowledge_base["ticket_priorities"],
                "types": self.knowledge_base["ticket_types"],
            },
            "lastUpdated": datetime.utcnow().isoformat(),
        }

    def validate_stakeholders(self, stakeholders: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate extracted stakeholder data.

        Args:
            stakeholders: List of extracted stakeholders

        Returns:
            Validation result with issues and hallucinations
        """
        validation = {
            "valid": True,
            "total": len(stakeholders),
            "issues": [],
            "warnings": [],
            "hallucinations": [],
        }

        if not stakeholders:
            validation["warnings"].append("No stakeholders extracted from tickets")
            return validation

        for idx, stakeholder in enumerate(stakeholders):
            # Validate name
            name = stakeholder.get("name", "").strip()
            if not name:
                validation["issues"].append(f"Stakeholder {idx}: Missing or empty name")
                validation["valid"] = False

            # Validate name length
            if len(name) < 2:
                validation["warnings"].append(
                    f"Stakeholder {name}: Name too short (possible abbreviation)"
                )
            if len(name) > 100:
                validation["issues"].append(
                    f"Stakeholder {name}: Name too long (likely extraction error)"
                )
                validation["valid"] = False

            # Validate power and interest levels
            power = stakeholder.get("power", "")
            interest = stakeholder.get("interest", "")

            if power not in self.POWER_LEVELS:
                validation["issues"].append(
                    f"Stakeholder {name}: Invalid power level '{power}'"
                )
                validation["valid"] = False

            if interest not in self.INTEREST_LEVELS:
                validation["issues"].append(
                    f"Stakeholder {name}: Invalid interest level '{interest}'"
                )
                validation["valid"] = False

            # Validate mentions exist
            mentions = stakeholder.get("mentions", [])
            if not mentions:
                validation["issues"].append(f"Stakeholder {name}: No mentions found")
                validation["hallucinations"].append(
                    {
                        "name": name,
                        "reason": "No source mentions",
                        "confidence": 0.95,
                    }
                )
                validation["valid"] = False

            # Check for generic names
            if name in self.GENERIC_NAMES:
                validation["warnings"].append(f"Stakeholder {name}: Generic name (verify in source)")

            # Check confidence for single-mention stakeholders
            frequency = stakeholder.get("frequency", 0)
            confidence = stakeholder.get("confidence", 0)
            if frequency == 1 and confidence < 0.6:
                validation["hallucinations"].append(
                    {
                        "name": name,
                        "reason": "Single mention with low confidence",
                        "confidence": 0.7,
                        "frequency": frequency,
                    }
                )

        return validation

    def detect_stakeholder_hallucinations(
        self, stakeholders: List[Dict[str, Any]], source_data: Dict[str, Any] | None = None
    ) -> Dict[str, Any]:
        """Detect hallucinated stakeholders.

        Args:
            stakeholders: List of stakeholders
            source_data: Original source data

        Returns:
            Hallucination detection results
        """
        detection = {
            "hallucinations": [],
            "suspiciousPatterns": [],
            "warnings": [],
            "confidence": 0.0,
        }

        if not stakeholders:
            return detection

        for stakeholder in stakeholders:
            name = stakeholder.get("name", "")

            # Check for generic or fabricated names
            if name in self.GENERIC_NAMES:
                detection["hallucinations"].append(
                    {
                        "name": name,
                        "type": "generic_name",
                        "reason": "Generic name detected",
                        "confidence": 0.6,
                        "suggestion": "Verify stakeholder identity in source data",
                    }
                )

            # Check for suspicious patterns
            if "," in name or "@" in name:
                detection["suspiciousPatterns"].append(
                    {
                        "name": name,
                        "pattern": "Contains special characters",
                        "confidence": 0.8,
                        "suggestion": "Likely extraction error - verify source",
                    }
                )

            # Check for multiple spaces
            if re.search(r"\s{2,}", name):
                detection["suspiciousPatterns"].append(
                    {
                        "name": name,
                        "pattern": "Multiple consecutive spaces",
                        "confidence": 0.6,
                        "suggestion": "May indicate parsing issue",
                    }
                )

            # Check for very high frequency without source
            mentions = stakeholder.get("mentions", [])
            frequency = stakeholder.get("frequency", 0)
            if frequency > 20 and not mentions:
                detection["hallucinations"].append(
                    {
                        "name": name,
                        "type": "high_frequency_no_source",
                        "reason": "High frequency but no source mentions",
                        "confidence": 0.85,
                        "suggestion": "May be fabricated aggregate",
                    }
                )

            # Check for low frequency single mentions
            if frequency == 1 and stakeholder.get("confidence", 0) < 0.6:
                detection["warnings"].append(
                    {
                        "name": name,
                        "level": "warning",
                        "message": "Single mention with low confidence",
                        "confidence": 0.65,
                        "suggestion": "May be a misextraction - verify in source",
                    }
                )

        # Calculate overall hallucination confidence
        total_length = max(len(stakeholders), 1)
        detection["confidence"] = min(
            1.0,
            (len(detection["hallucinations"]) * 0.3 + len(detection["suspiciousPatterns"]) * 0.2)
            / total_length,
        )

        return detection

    def validate_stakeholder_matrix(self, matrix: Dict[str, Any]) -> Dict[str, Any]:
        """Validate stakeholder power/interest matrix.

        Args:
            matrix: Power/interest matrix

        Returns:
            Validation result
        """
        validation = {"valid": True, "issues": [], "warnings": []}

        if not matrix:
            validation["issues"].append("Matrix data is missing")
            validation["valid"] = False
            return validation

        # Validate structure
        required_quadrants = [
            "highPowerHighInterest",
            "highPowerLowInterest",
            "lowPowerHighInterest",
            "lowPowerLowInterest",
        ]
        for quadrant in required_quadrants:
            if not isinstance(matrix.get(quadrant), list):
                validation["issues"].append(f"Missing or invalid quadrant: {quadrant}")
                validation["valid"] = False

        # Validate summary
        if matrix.get("summary"):
            summary = matrix["summary"]
            total = summary.get("total", 0)
            by_quadrant = summary.get("byQuadrant", {})
            sum_quadrants = sum(by_quadrant.values())

            if sum_quadrants != total:
                validation["warnings"].append(
                    f"Quadrant sum ({sum_quadrants}) doesn't match total ({total})"
                )

        # Validate stakeholder distribution
        total_stakeholders = sum(
            len(matrix.get(q, [])) for q in required_quadrants if isinstance(matrix.get(q), list)
        )
        if total_stakeholders == 0:
            validation["warnings"].append("Matrix contains no stakeholders")

        return validation

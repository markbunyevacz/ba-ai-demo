"""Stakeholder identification and analysis service.

Implements stakeholder extraction, power/interest assessment, and matrix building.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

from services.nlp_pipeline import StakeholderNLPPipeline

POWER_SCORES = {"Low": 1, "Medium": 2, "High": 3}


class StakeholderService:
    """Identifies and analyzes stakeholders from tickets."""

    # Power keywords for determining stakeholder influence
    POWER_KEYWORDS = {
        "executive": [
            "executive",
            "ceo",
            "cfo",
            "director",
            "president",
            "cto",
            "vp",
            "vice",
        ],
        "manager": [
            "manager",
            "lead",
            "supervisor",
            "coordinator",
            "owner",
            "stakeholder",
        ],
        "technical": [
            "developer",
            "engineer",
            "architect",
            "tech",
            "technical",
            "coding",
        ],
        "business": ["business", "analyst", "product", "owner", "sponsor"],
    }

    # Interest keywords
    INTEREST_KEYWORDS = {
        "high": [
            "critical",
            "must have",
            "required",
            "essential",
            "urgent",
            "blocker",
        ],
        "medium": [
            "important",
            "should have",
            "desired",
            "impacted",
            "involved",
        ],
        "low": [
            "optional",
            "nice to have",
            "could have",
            "future",
            "phase 2",
        ],
    }

    # Generic names to filter out
    GENERIC_NAMES = {
        "user",
        "admin",
        "manager",
        "developer",
        "team",
        "stakeholder",
        "client",
        "customer",
        "staff",
        "member",
        "person",
    }

    # Name extraction patterns
    EXTRACTION_PATTERNS = [
        re.compile(r"(?:assigned to|assignee|owner):\s*(\w+(?:\s+\w+)*)", re.IGNORECASE),
        re.compile(r"(?:reviewed by|approved by):\s*(\w+(?:\s+\w+)*)", re.IGNORECASE),
        re.compile(r"mentioned?\s+(\w+(?:\s+\w+)*)", re.IGNORECASE),
    ]

    def __init__(self, nlp_pipeline: Optional[StakeholderNLPPipeline] = None):
        """Initialize stakeholder service."""
        self.stakeholders: Dict[str, Dict[str, Any]] = {}
        self.extraction_patterns = self.EXTRACTION_PATTERNS
        self.nlp_pipeline = nlp_pipeline or StakeholderNLPPipeline()

    def identify_stakeholders(self, tickets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract and analyze stakeholders from tickets.

        Args:
            tickets: List of ticket objects

        Returns:
            List of enriched stakeholder profiles
        """
        profiles: Dict[str, Dict[str, Any]] = {}

        for idx, ticket in enumerate(tickets):
            context = self._build_ticket_context(ticket)
            extracted_names = self._extract_names_from_text(context)

            # Process extracted names
            for name in extracted_names:
                normalized = self._normalize_name(name)
                profile = self._get_or_create_profile(profiles, normalized, name, context)

                profile["mentions"].append(
                    {
                        "ticketId": ticket.get("id"),
                        "index": idx,
                        "source": "extraction",
                        "context": context,
                        "snippet": self._get_snippet(context, name),
                    }
                )
                profile["frequency"] = len(profile["mentions"]) + len(profile["assignments"])

            # Process ticket assignee
            assignee = ticket.get("assignee")
            if assignee and assignee != "Unassigned":
                normalized = self._normalize_name(assignee)
                profile = self._get_or_create_profile(profiles, normalized, assignee, context)

                profile["assignments"].append(
                    {
                        "ticketId": ticket.get("id"),
                        "summary": ticket.get("summary", ""),
                        "status": ticket.get("status", "Unknown"),
                        "team": ticket.get("assigneeTeam"),
                        "role": ticket.get("assigneeRole", profile.get("type")),
                    }
                )
                profile["frequency"] = len(profile["mentions"]) + len(profile["assignments"])

        # Enrich profiles
        enriched_profiles = []
        for profile in profiles.values():
            combined_context = " ".join(m.get("context", "") for m in profile.get("mentions", []))

            profile["power"] = self._determine_power_level(profile, combined_context)
            profile["interest"] = self._determine_interest_level(profile, combined_context)
            profile["quadrant"] = self._get_quadrant(profile["power"], profile["interest"])
            profile["color"] = self._get_quadrant_color(profile["power"], profile["interest"])
            profile["influenceScore"] = self._calculate_influence_score(profile)
            profile["confidence"] = self._calculate_confidence(profile)
            profile["communicationPlan"] = self._build_communication_plan(profile)
            profile["originalNames"] = list(set(profile["originalNames"]))
            profile["roles"] = list(set(profile["roles"]))
            if profile["roles"]:
                profile["type"] = profile["roles"][0]

            # NLP enhancement (sentiment, entities, embeddings)
            profile = self._apply_nlp_enhancements(profile, combined_context)

            enriched_profiles.append(profile)

        self.stakeholders = {p["id"]: p for p in enriched_profiles}
        return enriched_profiles

    def _apply_nlp_enhancements(self, profile: Dict[str, Any], context: str) -> Dict[str, Any]:
        """Apply NLP enrichment to a stakeholder profile."""
        if not context or not self.nlp_pipeline:
            return profile

        try:
            profile = self.nlp_pipeline.enhance_profile(profile, context)
        except Exception as exc:  # pragma: no cover - optional dependency
            profile.setdefault("nlp", {})
            profile["nlp"]["error"] = str(exc)
        return profile

    def _build_ticket_context(self, ticket: Dict[str, Any]) -> str:
        """Combine ticket fields into single context string."""
        parts = [
            ticket.get("summary", ""),
            ticket.get("description", ""),
        ]

        if isinstance(ticket.get("acceptanceCriteria"), list):
            parts.append(" ".join(ticket["acceptanceCriteria"]))

        if isinstance(ticket.get("comments"), list):
            parts.append(" ".join(ticket["comments"]))

        assignee = ticket.get("assignee")
        if assignee:
            parts.append(f"Assignee: {assignee}")

        return " ".join(filter(None, parts))

    def _extract_names_from_text(self, text: str) -> List[str]:
        """Extract likely personal names from text using patterns.

        Args:
            text: Context text to search

        Returns:
            List of extracted names
        """
        candidates: Set[str] = set()

        if not text or not self.extraction_patterns:
            return list(candidates)

        for pattern in self.extraction_patterns:
            for match in pattern.findall(text):
                normalized = self._normalize_name(match)
                if normalized.lower() not in self.GENERIC_NAMES and len(normalized.split()) <= 3:
                    candidates.add(normalized)

        # Extract capitalized words adjacent to known stakeholder terms
        name_pattern = re.compile(r"([A-Z][a-z]+\s+[A-Z][a-z]+)")
        for match in name_pattern.findall(text):
            normalized = self._normalize_name(match)
            if normalized.lower() not in self.GENERIC_NAMES:
                candidates.add(normalized)

        return list(candidates)

    def _split_candidate_names(self, raw: str) -> List[str]:
        """Split multi-name strings by common delimiters."""
        names = re.split(r"(?:,|&|\band\b|\+|/)+", raw, flags=re.IGNORECASE)
        return [n.strip() for n in names if n.strip()]

    def _is_likely_person_name(self, name: str) -> bool:
        """Check if string is likely a personal name."""
        trimmed = name.strip()

        if not trimmed or len(trimmed) < 2:
            return False

        if len(trimmed) > 100:
            return False

        if trimmed.lower() in self.GENERIC_NAMES:
            return False

        # Filter numeric-only strings
        if trimmed.isdigit():
            return False

        return True

    def _normalize_name(self, name: str) -> str:
        """Normalize name for matching and aggregation."""
        return name.strip().lower().replace("_", " ")

    def _get_or_create_profile(
        self, profiles: Dict[str, Dict], norm_id: str, original_name: str, context: str
    ) -> Dict[str, Any]:
        """Get existing profile or create new one."""
        if norm_id not in profiles:
            profiles[norm_id] = {
                "id": norm_id,
                "name": original_name,
                "originalNames": [original_name],
                "mentions": [],
                "assignments": [],
                "frequency": 0,
                "type": self._infer_role(original_name, context),
                "roles": [self._infer_role(original_name, context)],
                "power": "Medium",
                "interest": "Medium",
                "quadrant": "middle",
                "confidence": 0.5,
                "influenceScore": 0.5,
            }
        else:
            profiles[norm_id]["originalNames"].append(original_name)

        return profiles[norm_id]

    def _infer_role(self, name: str, context: str) -> str:
        """Infer stakeholder role from name and context."""
        combined = f"{name} {context}".lower()

        for role, keywords in self.POWER_KEYWORDS.items():
            if any(kw in combined for kw in keywords):
                return role

        return "stakeholder"

    def _determine_power_level(self, profile: Dict[str, Any], context: str) -> str:
        """Determine stakeholder power level."""
        combined = f"{profile['name']} {context}".lower()

        exec_score = sum(1 for kw in self.POWER_KEYWORDS.get("executive", []) if kw in combined)
        manager_score = sum(1 for kw in self.POWER_KEYWORDS.get("manager", []) if kw in combined)
        tech_score = sum(1 for kw in self.POWER_KEYWORDS.get("technical", []) if kw in combined)

        if exec_score >= 2:
            return "High"
        elif manager_score >= 2 or (exec_score >= 1 and manager_score >= 1):
            return "High"
        elif tech_score >= 3:
            return "Medium"
        elif profile.get("frequency", 0) > 5:
            return "Medium"

        return "Low"

    def _determine_interest_level(self, profile: Dict[str, Any], context: str) -> str:
        """Determine stakeholder interest level."""
        combined = f"{profile['name']} {context}".lower()

        high_score = sum(1 for kw in self.INTEREST_KEYWORDS.get("high", []) if kw in combined)
        medium_score = sum(1 for kw in self.INTEREST_KEYWORDS.get("medium", []) if kw in combined)

        if high_score >= 2:
            return "High"
        elif high_score >= 1 and medium_score >= 1:
            return "High"
        elif medium_score >= 2 or profile.get("frequency", 0) > 3:
            return "Medium"

        return "Low"

    def _get_quadrant(self, power: str, interest: str) -> str:
        """Determine quadrant based on power and interest."""
        power_idx = POWER_SCORES.get(power, 2)
        interest_idx = POWER_SCORES.get(interest, 2)

        if power_idx >= 2 and interest_idx >= 2:
            return "highPowerHighInterest"
        elif power_idx >= 2 and interest_idx < 2:
            return "highPowerLowInterest"
        elif power_idx < 2 and interest_idx >= 2:
            return "lowPowerHighInterest"
        else:
            return "lowPowerLowInterest"

    def _get_quadrant_color(self, power: str, interest: str) -> str:
        """Get color for quadrant visualization."""
        quadrant = self._get_quadrant(power, interest)
        colors = {
            "highPowerHighInterest": "#1e40af",  # Blue
            "highPowerLowInterest": "#7c3aed",  # Purple
            "lowPowerHighInterest": "#059669",  # Green
            "lowPowerLowInterest": "#6b7280",  # Gray
        }
        return colors.get(quadrant, "#9ca3af")

    def _calculate_influence_score(self, profile: Dict[str, Any]) -> float:
        """Calculate overall influence score."""
        power_score = POWER_SCORES.get(profile.get("power", "Low"), 1) / 3.0
        frequency_score = min(profile.get("frequency", 0) / 10.0, 1.0)
        assignment_score = min(len(profile.get("assignments", [])) / 5.0, 1.0)

        return (power_score * 0.5 + frequency_score * 0.25 + assignment_score * 0.25)

    def _calculate_confidence(self, profile: Dict[str, Any]) -> float:
        """Calculate extraction confidence."""
        frequency = profile.get("frequency", 0)
        if frequency >= 5:
            return 0.95
        elif frequency >= 3:
            return 0.80
        elif frequency >= 2:
            return 0.65
        return 0.5

    def _build_communication_plan(self, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Build communication strategy for stakeholder."""
        quadrant = profile.get("quadrant")
        strategies = {
            "highPowerHighInterest": {
                "strategy": "Manage Closely",
                "frequency": "Weekly",
                "channels": ["Meeting", "Email", "Presentation"],
                "involvement": "High",
            },
            "highPowerLowInterest": {
                "strategy": "Keep Satisfied",
                "frequency": "Bi-weekly",
                "channels": ["Email", "Report"],
                "involvement": "Medium",
            },
            "lowPowerHighInterest": {
                "strategy": "Keep Informed",
                "frequency": "Weekly",
                "channels": ["Email", "Update", "Chat"],
                "involvement": "Medium",
            },
            "lowPowerLowInterest": {
                "strategy": "Monitor",
                "frequency": "Monthly",
                "channels": ["Email"],
                "involvement": "Low",
            },
        }
        return strategies.get(quadrant, strategies["lowPowerLowInterest"])

    def _get_snippet(self, context: str, name: str) -> str:
        """Extract snippet around name mention."""
        lower_context = context.lower()
        lower_name = name.lower()
        idx = lower_context.find(lower_name)

        if idx == -1:
            return context[:100]

        start = max(0, idx - 30)
        end = min(len(context), idx + len(name) + 30)
        return context[start:end].strip()

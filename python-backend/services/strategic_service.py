"""Strategic analysis service for PESTLE, SWOT, and prioritization.

Analyzes tickets for strategic implications and provides recommendations.
"""
from __future__ import annotations

from typing import Any, Dict, List

class StrategicAnalysisService:
    """Provides strategic analysis on tickets and projects."""

    # PESTLE factors keywords
    PESTLE_KEYWORDS = {
        "Political": [
            "regulation",
            "compliance",
            "legal",
            "government",
            "policy",
            "authority",
        ],
        "Economic": [
            "budget",
            "cost",
            "roi",
            "revenue",
            "financial",
            "investment",
            "price",
        ],
        "Social": [
            "user",
            "customer",
            "satisfaction",
            "adoption",
            "engagement",
            "experience",
            "feedback",
        ],
        "Technological": [
            "technology",
            "platform",
            "system",
            "infrastructure",
            "api",
            "integration",
            "digital",
        ],
        "Legal": [
            "legal",
            "contract",
            "compliance",
            "liability",
            "intellectual property",
            "gdpr",
        ],
        "Environmental": [
            "sustainability",
            "environmental",
            "green",
            "carbon",
            "emissions",
            "waste",
        ],
    }

    # SWOT analysis keywords
    SWOT_KEYWORDS = {
        "Strengths": [
            "strength",
            "advantage",
            "expertise",
            "capability",
            "resource",
            "asset",
        ],
        "Weaknesses": [
            "weakness",
            "limitation",
            "constraint",
            "risk",
            "gap",
            "challenge",
        ],
        "Opportunities": [
            "opportunity",
            "market",
            "growth",
            "expansion",
            "potential",
            "benefit",
        ],
        "Threats": ["threat", "risk", "competitor", "challenge", "barrier", "obstacle"],
    }

    # Moscow categories
    MOSCOW_KEYWORDS = {
        "must": [
            "must have",
            "critical",
            "blocker",
            "required",
            "essential",
            "mandatory",
        ],
        "should": [
            "should have",
            "important",
            "high priority",
            "desired",
            "valuable",
        ],
        "could": ["could have", "nice to have", "enhancement", "optimization"],
        "wont": ["won't have", "future", "phase 2", "deferred", "backlog"],
    }

    def __init__(self):
        """Initialize strategic analysis service."""
        pass

    def analyze_ticket(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive strategic analysis on ticket.

        Args:
            ticket: Ticket object to analyze

        Returns:
            Enhanced ticket with strategic metadata
        """
        context = self._build_context(ticket)

        pestle = self._analyze_pestle(context)
        swot = self._build_swot_matrix(pestle, context)
        moscow = self._determine_moscow_category(ticket, context)
        recommendations = self._generate_recommendations(pestle, swot, ticket)

        return {
            **ticket,
            "_strategic": {
                "pestle": pestle,
                "swot": swot,
                "moscow": moscow,
                "recommendations": recommendations,
                "confidence": self._calculate_analysis_confidence(pestle, swot),
            },
        }

    def _build_context(self, ticket: Dict[str, Any]) -> str:
        """Build analysis context from ticket."""
        parts = [
            ticket.get("summary", ""),
            ticket.get("description", ""),
            ticket.get("type", ""),
            ticket.get("priority", ""),
        ]

        if isinstance(ticket.get("acceptanceCriteria"), list):
            parts.append(" ".join(ticket["acceptanceCriteria"]))

        return " ".join(filter(None, parts)).lower()

    def _analyze_pestle(self, context: str) -> Dict[str, Any]:
        """Analyze PESTLE factors in context."""
        pestle = {}

        for factor, keywords in self.PESTLE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in context)
            pestle[factor] = {"score": min(score / len(keywords) * 10, 10), "mentioned": score > 0}

        return pestle

    def _build_swot_matrix(self, pestle: Dict[str, Any], context: str) -> Dict[str, Any]:
        """Build SWOT matrix from PESTLE and context."""
        swot = {
            "Strengths": [],
            "Weaknesses": [],
            "Opportunities": [],
            "Threats": [],
        }

        for factor, keywords in self.SWOT_KEYWORDS.items():
            items = []
            for keyword in keywords:
                if keyword in context:
                    items.append(keyword)

            if items:
                swot[factor] = items[:3]  # Limit to 3 items per category

        return swot

    def _determine_moscow_category(self, ticket: Dict[str, Any], context: str) -> str:
        """Determine MoSCoW category for ticket."""
        priority = ticket.get("priority", "").lower()

        # Check keywords
        for category, keywords in self.MOSCOW_KEYWORDS.items():
            if any(kw in context for kw in keywords):
                return category

        # Map from priority
        priority_mapping = {
            "critical": "must",
            "high": "should",
            "medium": "could",
            "low": "wont",
        }

        return priority_mapping.get(priority, "could")

    def _generate_recommendations(
        self, pestle: Dict[str, Any], swot: Dict[str, Any], ticket: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate strategic recommendations."""
        recommendations = []

        # High-risk recommendations
        if pestle.get("Political", {}).get("score", 0) > 5:
            recommendations.append(
                {
                    "category": "Compliance",
                    "priority": "High",
                    "action": "Review regulatory requirements before implementation",
                    "risk": "Potential regulatory violation",
                }
            )

        if pestle.get("Legal", {}).get("score", 0) > 5:
            recommendations.append(
                {
                    "category": "Legal",
                    "priority": "High",
                    "action": "Consult with legal team",
                    "risk": "Legal liability",
                }
            )

        # Growth opportunities
        if len(swot.get("Opportunities", [])) > 0:
            recommendations.append(
                {
                    "category": "Growth",
                    "priority": "Medium",
                    "action": "Evaluate expansion potential",
                    "benefit": "Market expansion",
                }
            )

        # Risk mitigation
        if len(swot.get("Threats", [])) > 0:
            recommendations.append(
                {
                    "category": "Risk Management",
                    "priority": "High",
                    "action": "Develop mitigation strategy",
                    "risk": "Identified threats",
                }
            )

        return recommendations

    def _calculate_analysis_confidence(self, pestle: Dict[str, Any], swot: Dict[str, Any]) -> float:
        """Calculate confidence in analysis."""
        pestle_score = sum(1 for v in pestle.values() if v.get("mentioned"))
        swot_score = sum(1 for v in swot.values() if isinstance(v, list) and len(v) > 0)

        total_factors = len(pestle) + sum(len(v) if isinstance(v, list) else 0 for v in swot.values())
        if total_factors == 0:
            return 0.5

        mentioned_factors = pestle_score + swot_score
        return min(mentioned_factors / total_factors, 1.0)

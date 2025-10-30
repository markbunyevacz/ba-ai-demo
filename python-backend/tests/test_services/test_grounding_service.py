"""Unit tests for GroundingService."""
import pytest
from services.grounding_service import GroundingService


@pytest.fixture
def grounding_service():
    """Create a GroundingService instance."""
    return GroundingService()


class TestGroundingServiceValidation:
    """Test ticket validation functionality."""

    def test_validate_valid_ticket(self, grounding_service):
        """Test validation of a valid ticket."""
        ticket = {
            "id": "MVM-1001",
            "summary": "Implement user authentication",
            "description": "Add OAuth2 support to the application",
            "priority": "High",
            "type": "Story",
            "assignee": "John Doe",
            "acceptanceCriteria": ["AC1", "AC2"],
        }

        result = grounding_service.validate_ticket(ticket, {})

        assert result["isValid"] is True
        assert result["confidence"] >= 0.7
        assert len(result["issues"]) == 0

    def test_validate_invalid_priority(self, grounding_service):
        """Test validation with invalid priority."""
        ticket = {
            "summary": "Test ticket",
            "priority": "InvalidPriority",
        }

        result = grounding_service.validate_ticket(ticket, {})

        assert result["isValid"] is False
        assert result["confidence"] < 1.0
        assert len(result["issues"]) > 0

    def test_validate_short_summary(self, grounding_service):
        """Test validation with too-short summary."""
        ticket = {
            "summary": "Short",
            "priority": "High",
        }

        result = grounding_service.validate_ticket(ticket, {})

        assert result["confidence"] < 1.0

    def test_enhance_with_grounding(self, grounding_service):
        """Test grounding metadata attachment."""
        ticket = {
            "summary": "Test ticket",
            "priority": "High",
        }

        enhanced = grounding_service.enhance_with_grounding(ticket, {})

        assert "_grounding" in enhanced
        assert "validated" in enhanced["_grounding"]
        assert "confidence" in enhanced["_grounding"]
        assert "timestamp" in enhanced["_grounding"]


class TestHallucinationDetection:
    """Test hallucination detection functionality."""

    def test_detect_invalid_ticket_id(self, grounding_service):
        """Test detection of fabricated ticket IDs."""
        ticket = {
            "id": "INVALID-1001",  # Should start with MVM-
            "summary": "Test",
        }

        result = grounding_service.detect_hallucination(ticket, {})

        assert result["detected"] is True
        assert result["confidence"] > 0.8

    def test_detect_valid_ticket_id(self, grounding_service):
        """Test acceptance of valid ticket IDs."""
        ticket = {
            "id": "MVM-1001",
            "summary": "Test",
        }

        result = grounding_service.detect_hallucination(ticket, {})

        assert result["detected"] is False

    def test_detect_excessive_criteria(self, grounding_service):
        """Test detection of excessive acceptance criteria."""
        ticket = {
            "acceptanceCriteria": [f"AC{i}" for i in range(15)],  # Too many
        }

        result = grounding_service.detect_hallucination(ticket, {})

        assert result["detected"] is True


class TestStakeholderValidation:
    """Test stakeholder validation."""

    def test_validate_valid_stakeholder(self, grounding_service):
        """Test validation of valid stakeholders."""
        stakeholders = [
            {
                "name": "John Doe",
                "power": "High",
                "interest": "High",
                "mentions": [{"context": "mentioned in ticket"}],
            }
        ]

        result = grounding_service.validate_stakeholders(stakeholders)

        assert result["valid"] is True

    def test_validate_empty_stakeholders(self, grounding_service):
        """Test validation of empty stakeholder list."""
        stakeholders = []

        result = grounding_service.validate_stakeholders(stakeholders)

        assert result["valid"] is True
        assert len(result["warnings"]) > 0

    def test_detect_generic_names(self, grounding_service):
        """Test detection of generic stakeholder names."""
        stakeholders = [
            {
                "name": "User",  # Generic
                "power": "Low",
                "interest": "Low",
                "mentions": [],
            }
        ]

        result = grounding_service.detect_stakeholder_hallucinations(stakeholders)

        assert len(result["hallucinations"]) > 0 or len(result["suspiciousPatterns"]) > 0


class TestGroundingStatistics:
    """Test grounding statistics."""

    def test_get_grounding_stats(self, grounding_service):
        """Test statistics retrieval."""
        stats = grounding_service.get_grounding_stats()

        assert "knowledgeBaseSize" in stats
        assert "validationRulesCount" in stats
        assert "supportedFormats" in stats
        assert "lastUpdated" in stats

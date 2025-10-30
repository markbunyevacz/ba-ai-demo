"""Monitoring and telemetry service."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


class MonitoringService:
    """Tracks requests, performance metrics, and business analytics."""

    def __init__(self):
        """Initialize monitoring service."""
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.metrics: List[Dict[str, Any]] = []
        self.session_timeout = 3600  # 1 hour

    def track_request(self, payload: Dict[str, Any]) -> str:
        """Start tracking a request session.

        Args:
            payload: Request metadata

        Returns:
            Session ID for later completion tracking
        """
        session_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()

        self.sessions[session_id] = {
            "id": session_id,
            "timestamp": timestamp,
            "start_time": time.time(),
            "endpoint": payload.get("endpoint"),
            "type": payload.get("type"),
            "tickets": payload.get("tickets", 0),
            "status": "in_progress",
            "metadata": payload,
        }

        return session_id

    def track_completion(self, session_id: str, payload: Dict[str, Any]) -> None:
        """Mark request session as complete.

        Args:
            session_id: Session ID from track_request
            payload: Completion metadata
        """
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        elapsed_time = time.time() - session["start_time"]

        session.update(
            {
                "status": "completed",
                "elapsed_time": elapsed_time,
                "completion_timestamp": datetime.utcnow().isoformat(),
                "result": payload,
            }
        )

        # Store metric for aggregation
        self.metrics.append(
            {
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                "type": session.get("type"),
                "elapsed_time": elapsed_time,
                "tickets_processed": payload.get("ticketsEvaluated", 0),
                "average_confidence": payload.get("averageScore", 0),
                "success": True,
            }
        )

    def get_metrics(self) -> Dict[str, Any]:
        """Retrieve current metrics snapshot.

        Returns:
            Metrics summary
        """
        if not self.metrics:
            return {
                "requests": 0,
                "errors": 0,
                "avgResponseTimeMs": 0,
                "totalTicketsProcessed": 0,
            }

        total_requests = len(self.metrics)
        total_time = sum(m.get("elapsed_time", 0) for m in self.metrics)
        avg_response_time = (total_time / total_requests * 1000) if total_requests > 0 else 0
        total_tickets = sum(m.get("tickets_processed", 0) for m in self.metrics)

        return {
            "requests": total_requests,
            "errors": 0,
            "avgResponseTimeMs": avg_response_time,
            "totalTicketsProcessed": total_tickets,
            "recentMetrics": self.metrics[-10:],
        }

    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get active alerts based on metrics.

        Returns:
            List of alert objects
        """
        alerts = []

        # Check for high error rate
        recent_metrics = self.metrics[-20:]
        if recent_metrics:
            errors = sum(1 for m in recent_metrics if not m.get("success", True))
            if errors / len(recent_metrics) > 0.1:  # > 10% error rate
                alerts.append(
                    {
                        "level": "warning",
                        "message": f"High error rate detected: {errors}/{len(recent_metrics)} requests",
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                )

        # Check for slow responses
        slow_responses = [m for m in recent_metrics if m.get("elapsed_time", 0) > 30]
        if len(slow_responses) > 3:
            alerts.append(
                {
                    "level": "info",
                    "message": f"{len(slow_responses)} slow responses detected (>30s)",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        return alerts

    def get_performance(self) -> Dict[str, Any]:
        """Get performance summary.

        Returns:
            Performance metrics
        """
        if not self.metrics:
            return {
                "ticketsGenerated": 0,
                "averageConfidence": 0,
                "agentUsageRate": 0,
                "systemHealthy": True,
            }

        total_tickets = sum(m.get("tickets_processed", 0) for m in self.metrics)
        avg_confidence = (
            sum(m.get("average_confidence", 0) for m in self.metrics) / len(self.metrics)
            if self.metrics
            else 0
        )

        return {
            "ticketsGenerated": total_tickets,
            "averageConfidence": avg_confidence,
            "agentUsageRate": 1.0 if len(self.metrics) > 0 else 0,
            "systemHealthy": all(m.get("success", True) for m in self.metrics[-10:]),
        }

    def cleanup_sessions(self) -> int:
        """Remove expired sessions.

        Returns:
            Number of sessions cleaned up
        """
        current_time = time.time()
        expired_sessions = []

        for session_id, session in self.sessions.items():
            elapsed = current_time - session["start_time"]
            if elapsed > self.session_timeout:
                expired_sessions.append(session_id)

        for session_id in expired_sessions:
            del self.sessions[session_id]

        return len(expired_sessions)

    def export_metrics(self, days: int = 7) -> Dict[str, Any]:
        """Export metrics for a time period.

        Args:
            days: Number of days to include

        Returns:
            Exported metrics data
        """
        cutoff_time = datetime.utcnow() - timedelta(days=days)
        cutoff_iso = cutoff_time.isoformat()

        filtered_metrics = [m for m in self.metrics if m.get("timestamp", "") >= cutoff_iso]

        return {
            "period_days": days,
            "start_date": cutoff_time.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "total_requests": len(filtered_metrics),
            "total_tickets_processed": sum(m.get("tickets_processed", 0) for m in filtered_metrics),
            "average_confidence": (
                sum(m.get("average_confidence", 0) for m in filtered_metrics) / len(filtered_metrics)
                if filtered_metrics
                else 0
            ),
            "metrics": filtered_metrics,
        }

"""Monitoring and metrics endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Query
from typing import Dict, Any, List

from services.monitoring_service import MonitoringService

router = APIRouter()
monitoring_service = MonitoringService()


@router.get("/metrics")
async def get_metrics() -> Dict[str, Any]:
    """Get current system metrics.

    Returns:
        Current request count, errors, average response time
    """
    return monitoring_service.get_metrics()


@router.get("/alerts")
async def get_alerts() -> List[Dict[str, Any]]:
    """Get active system alerts.

    Returns:
        List of alert objects with level and message
    """
    return monitoring_service.get_alerts()


@router.get("/performance")
async def get_performance() -> Dict[str, Any]:
    """Get performance summary.

    Returns:
        Tickets generated, average confidence, system health
    """
    return monitoring_service.get_performance()


@router.get("/export")
async def export_metrics(days: int = Query(7, ge=1, le=30)) -> Dict[str, Any]:
    """Export metrics for specified time period.

    Args:
        days: Number of days to export (1-30)

    Returns:
        Detailed metrics export
    """
    return monitoring_service.export_metrics(days)

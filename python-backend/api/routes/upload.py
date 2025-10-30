"""Upload API endpoints for Excel and Word documents."""
from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Any, Dict

from services.grounding_service import GroundingService
from services.monitoring_service import MonitoringService
from utils.file_handlers import process_excel_to_tickets

router = APIRouter()

# Global service instances
grounding_service = GroundingService()
monitoring_service = MonitoringService()


@router.post("/")
async def upload_excel(file: UploadFile = File(...)):
    """Process uploaded Excel file and return generated tickets.

    This endpoint handles Excel file uploads, parses them, validates tickets
    against the knowledge base, and returns ticket objects.

    Args:
        file: Excel file (.xlsx)

    Returns:
        JSON response with tickets and metadata
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Validate file type
    allowed_types = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
        "application/vnd.ms-excel",  # .xls
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Only Excel files (.xlsx) are allowed.",
        )

    # Track request
    session_id = monitoring_service.track_request(
        {
            "endpoint": "/api/upload",
            "type": "excel_upload",
            "file_name": file.filename,
            "file_size": file.size or 0,
        }
    )

    try:
        # Read file content
        file_content = await file.read()

        # Process Excel to tickets
        result = process_excel_to_tickets(file_content, grounding_service, monitoring_service)

        # Calculate average confidence
        avg_confidence = (
            sum(t.get("_grounding", {}).get("confidence", 0.8) for t in result["tickets"])
            / len(result["tickets"])
            if result["tickets"]
            else 0
        )

        # Track completion
        monitoring_service.track_completion(
            session_id,
            {
                "success": True,
                "ticketsEvaluated": len(result["tickets"]),
                "averageScore": avg_confidence,
                "totalProcessed": result["processed_count"],
            },
        )

        return {
            "tickets": result["tickets"],
            "_metadata": {
                "processedBy": "python-backend",
                "fallback": False,
                "agentHealthy": False,
                "sessionId": session_id,
                "totalRows": result["total_rows"],
                "processedCount": result["processed_count"],
                "averageConfidence": avg_confidence,
                "columnIndices": result["column_indices"],
            },
        }

    except ValueError as e:
        # Validation error
        monitoring_service.track_completion(
            session_id, {"success": False, "error": str(e)}
        )
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Unexpected error
        monitoring_service.track_completion(
            session_id, {"success": False, "error": "Internal server error"}
        )
        raise HTTPException(status_code=500, detail="Failed to process file")


@router.post("/document")
async def upload_document(file: UploadFile = File(...)):
    """Process uploaded Word or Excel document.

    Handles both .xlsx (Excel) and .docx (Word) files.

    Args:
        file: Document file (.xlsx or .docx)

    Returns:
        JSON response with processed content
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    allowed_types = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
        "application/vnd.ms-excel",  # .xls
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: Excel (.xlsx), Word (.docx)",
        )

    session_id = monitoring_service.track_request(
        {
            "endpoint": "/api/upload/document",
            "type": "document_upload",
            "file_name": file.filename,
        }
    )

    try:
        file_content = await file.read()

        # Determine file type and process accordingly
        if file.filename.endswith(".xlsx") or file.content_type.startswith("application/vnd.openxmlformats-officedocument.spreadsheetml"):
            result = process_excel_to_tickets(file_content, grounding_service)
            return {
                "type": "excel",
                "tickets": result["tickets"],
                "processed": len(result["tickets"]),
            }
        elif file.filename.endswith(".docx"):
            from services.document_parser import DocumentParser

            parser = DocumentParser()
            text = await parser.parse_word_document(file_content)
            return {
                "type": "word",
                "content": text,
                "preview": text[:500],
            }
        else:
            raise ValueError("Unsupported file format")

    except Exception as e:
        monitoring_service.track_completion(
            session_id, {"success": False, "error": str(e)}
        )
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agent")
async def upload_agent(file: UploadFile = File(...)):
    """Process file using AI agent (placeholder for future ML integration).

    Currently returns same result as /api/upload. Future: integrate with LLM.

    Args:
        file: Excel file

    Returns:
        Agent-processed tickets
    """
    return await upload_excel(file)


@router.post("/rule-based")
async def upload_rule_based(file: UploadFile = File(...)):
    """Process file using only rule-based validation (no AI).

    Args:
        file: Excel file

    Returns:
        Rule-based processed tickets
    """
    return await upload_excel(file)

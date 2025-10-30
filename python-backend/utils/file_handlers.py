"""File handling utilities for Excel and Word documents."""
from __future__ import annotations

import io
from typing import Any, Dict, List

try:
    import openpyxl
    HAS_OPENPYXL = True
except ImportError:
    HAS_OPENPYXL = False


# Priority mapping from various formats to standard ones
PRIORITY_MAP = {
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
    "Must Have": "Critical",
    "Should Have": "High",
    "Could Have": "Medium",
    "Won't Have": "Low",
}

TICKET_COUNTER = 1000


def parse_excel_file(buffer: bytes) -> tuple[List[List[str]], Dict[str, int]]:
    """Parse Excel file and detect column indices.

    Args:
        buffer: File buffer bytes

    Returns:
        Tuple of (rows list, column indices dict)

    Raises:
        ValueError: If file is invalid or empty
    """
    if not HAS_OPENPYXL:
        raise RuntimeError("openpyxl is not installed")

    try:
        wb = openpyxl.load_workbook(io.BytesIO(buffer), data_only=True)
        ws = wb.active

        rows: List[List[str]] = []
        for row in ws.iter_rows(values_only=True):
            row_data = [str(cell or "") for cell in row]
            rows.append(row_data)

        if not rows or len(rows) < 2:
            raise ValueError("Excel file is empty or has no data rows")

        # Extract headers and detect columns
        headers = rows[0]
        column_indices = detect_column_indices(headers)

        # Validate essential columns
        if "User Story" not in column_indices:
            raise ValueError(
                f"Missing required 'User Story' column. Found headers: {', '.join(headers)}"
            )

        return rows, column_indices

    except Exception as e:
        raise ValueError(f"Failed to parse Excel file: {str(e)}")


def detect_column_indices(headers: List[str]) -> Dict[str, int]:
    """Detect column indices by keyword matching.

    Args:
        headers: List of header strings

    Returns:
        Dictionary mapping column names to indices
    """
    indices = {}

    for idx, header in enumerate(headers):
        normalized = str(header).lower().strip()

        if "story" in normalized:
            indices["User Story"] = idx
        elif "priority" in normalized or "prioritás" in normalized:
            indices["Priority"] = idx
        elif "assignee" in normalized or "hozzárendelt" in normalized:
            indices["Assignee"] = idx
        elif "epic" in normalized:
            indices["Epic"] = idx
        elif ("acceptance" in normalized or "criteria" in normalized or "kritérium" in normalized):
            indices["Acceptance Criteria"] = idx

    return indices


def build_ticket_from_row(
    row: List[str], row_index: int, column_indices: Dict[str, int], ticket_counter: int
) -> Dict[str, Any]:
    """Build ticket object from Excel row.

    Args:
        row: Excel row data
        row_index: Index of row
        column_indices: Column index mapping
        ticket_counter: Counter for ticket ID generation

    Returns:
        Ticket object
    """
    ticket = {
        "id": f"MVM-{ticket_counter + row_index}",
        "summary": "Untitled",
        "description": "",
        "priority": "Medium",
        "assignee": "Unassigned",
        "epic": "No Epic",
        "acceptanceCriteria": [],
        "createdAt": "",
        "type": "Story",
    }

    # Extract User Story
    if "User Story" in column_indices:
        idx = column_indices["User Story"]
        if 0 <= idx < len(row):
            value = str(row[idx]).strip()
            ticket["summary"] = value if value else "Untitled"
            ticket["description"] = value

    # Extract Priority
    if "Priority" in column_indices:
        idx = column_indices["Priority"]
        if 0 <= idx < len(row):
            raw_priority = str(row[idx]).strip()
            ticket["priority"] = PRIORITY_MAP.get(raw_priority, raw_priority or "Medium")

    # Extract Assignee
    if "Assignee" in column_indices:
        idx = column_indices["Assignee"]
        if 0 <= idx < len(row):
            value = str(row[idx]).strip()
            ticket["assignee"] = value if value else "Unassigned"

    # Extract Epic
    if "Epic" in column_indices:
        idx = column_indices["Epic"]
        if 0 <= idx < len(row):
            value = str(row[idx]).strip()
            ticket["epic"] = value if value else "No Epic"

    # Extract Acceptance Criteria
    if "Acceptance Criteria" in column_indices:
        idx = column_indices["Acceptance Criteria"]
        if 0 <= idx < len(row):
            raw_criteria = str(row[idx]).strip()
            if raw_criteria:
                criteria = [c.strip() for c in raw_criteria.split(r"/[;\n]/")]
                ticket["acceptanceCriteria"] = [c for c in criteria if c]

    # Build description
    ticket["description"] = (
        f"User Story: {ticket['summary']}\n\n"
        f"Priority: {ticket['priority']}\n"
        f"Assignee: {ticket['assignee']}\n"
        f"Epic: {ticket['epic']}"
    )

    return ticket


def process_excel_to_tickets(
    buffer: bytes, grounding_service: Any = None, monitoring_service: Any = None
) -> Dict[str, Any]:
    """Process entire Excel file to tickets with validation.

    Args:
        buffer: Excel file buffer
        grounding_service: GroundingService instance for validation
        monitoring_service: MonitoringService instance for tracking

    Returns:
        Dict with tickets and metadata
    """
    rows, column_indices = parse_excel_file(buffer)

    tickets = []
    ticket_counter = 1001  # Starting counter

    # Process data rows (skip header)
    for idx, row in enumerate(rows[1:]):
        ticket = build_ticket_from_row(row, idx, column_indices, ticket_counter)

        # Apply grounding validation if available
        if grounding_service:
            source_data = {"rowIndex": idx, "originalRow": row}
            ticket = grounding_service.enhance_with_grounding(ticket, source_data)
        else:
            # Minimal grounding stub
            ticket["_grounding"] = {
                "validated": True,
                "confidence": 0.8,
                "issues": [],
                "warnings": [],
                "timestamp": "",
            }

        # Filter empty tickets
        if ticket.get("summary", "").strip() and ticket.get("summary") != "Untitled":
            tickets.append(ticket)

    return {
        "tickets": tickets,
        "column_indices": column_indices,
        "headers": rows[0],
        "total_rows": len(rows) - 1,
        "processed_count": len(tickets),
    }

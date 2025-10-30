# Python FastAPI Backend – API Documentation

**Version**: 2.0.0  
**Base URL**: `http://localhost:8000/api`  
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Health & Status](#health--status)
2. [Upload Endpoints](#upload-endpoints)
3. [Grounding Endpoints](#grounding-endpoints)
4. [Compliance Endpoints](#compliance-endpoints)
5. [Monitoring Endpoints](#monitoring-endpoints)
6. [AI Model Endpoints](#ai-model-endpoints)
7. [Diagram Endpoints](#diagram-endpoints)
8. [Jira OAuth Endpoints](#jira-oauth-endpoints)
9. [Error Handling](#error-handling)
10. [Authentication](#authentication)

---

## Health & Status

### GET /api/health

Simple health check for liveness/readiness probes.

**Response (200 OK):**
```json
{
  "status": "OK",
  "version": "2.0.0",
  "backend": "python"
}
```

---

## Upload Endpoints

### POST /api/upload

Upload and process Excel file containing tickets.

**Request:**
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `file` (required): Excel file (.xlsx) with ticket data

**Response (200 OK):**
```json
{
  "tickets": [
    {
      "id": "MVM-1001",
      "summary": "Implement user authentication",
      "description": "Add OAuth2 support",
      "priority": "High",
      "type": "Story",
      "assignee": "John Doe",
      "acceptanceCriteria": ["AC1", "AC2"],
      "_grounding": {
        "validated": true,
        "confidence": 0.95,
        "timestamp": "2025-10-30T13:30:00Z"
      }
    }
  ],
  "_metadata": {
    "processedBy": "python-backend",
    "sessionId": "uuid-12345",
    "totalRows": 50,
    "processedCount": 50,
    "averageConfidence": 0.92,
    "columnIndices": {
      "userStory": 0,
      "priority": 1,
      "assignee": 2,
      "epic": 3,
      "ac": 4
    }
  }
}
```

**Error (400 Bad Request):**
```json
{
  "detail": "File type not supported. Use .xlsx files only."
}
```

---

### POST /api/upload/document

Upload Word or Excel documents for parsing.

**Request:**
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `file` (required): Document file (.docx or .xlsx)

**Response**: Same as `/api/upload`

---

### POST /api/upload/agent

Upload file for AI agent processing.

**Request**: Same as `/api/upload`

**Response**: Same as `/api/upload`

---

### POST /api/upload/rule-based

Upload file for rule-based processing (fallback).

**Request**: Same as `/api/upload`

**Response**: Same as `/api/upload`

---

## Grounding Endpoints

### GET /api/grounding/stats

Get grounding service statistics and configuration.

**Response (200 OK):**
```json
{
  "knowledgeBaseSize": 8,
  "validationRulesCount": 8,
  "supportedFormats": {
    "priorities": ["Critical", "High", "Medium", "Low"],
    "types": ["Bug", "Feature", "Enhancement", "Task", "Story", "Epic"],
    "epics": ["No Epic", "Performance", "Security", "UI/UX", "Backend", "DevOps"],
    "assignees": ["Unassigned", "John Doe", "Jane Smith", "Dev Team", "QA Team"]
  },
  "lastUpdated": "2025-10-30T13:30:00Z"
}
```

---

### POST /api/grounding/validate

Validate a ticket against grounding rules.

**Request:**
```json
{
  "id": "MVM-1001",
  "summary": "Implement authentication",
  "description": "Add OAuth2 support",
  "priority": "High",
  "type": "Story",
  "acceptanceCriteria": ["AC1", "AC2"]
}
```

**Response (200 OK):**
```json
{
  "isValid": true,
  "confidence": 0.95,
  "issues": [],
  "warnings": [],
  "_grounding": {
    "validated": true,
    "timestamp": "2025-10-30T13:30:00Z"
  }
}
```

**Response (200 OK - With Issues):**
```json
{
  "isValid": false,
  "confidence": 0.45,
  "issues": [
    "Priority 'InvalidValue' not recognized",
    "Type must be one of: Bug, Feature, Enhancement, Task, Story, Epic"
  ],
  "warnings": [
    "Summary is too short (< 10 chars recommended)",
    "No acceptance criteria provided"
  ]
}
```

---

## Compliance Endpoints

### GET /api/compliance/standards

List all supported compliance standards.

**Response (200 OK):**
```json
{
  "pmi": [
    {
      "id": "scope",
      "name": "Scope Management",
      "description": "Define and control project scope",
      "criteria": ["Defined scope", "Requirements documented", "Change control"]
    }
  ],
  "babok": [
    {
      "id": "requirements",
      "name": "Requirements Analysis",
      "description": "BA knowledge area",
      "criteria": ["AC present", "Clear description", "Stakeholders identified"]
    }
  ]
}
```

---

### POST /api/compliance/validate

Validate tickets against compliance standards.

**Request:**
```json
{
  "tickets": [
    {
      "id": "MVM-1001",
      "summary": "Test",
      "priority": "High",
      "acceptanceCriteria": ["AC1", "AC2"]
    }
  ],
  "standards": ["pmi", "babok"]
}
```

**Response (200 OK):**
```json
{
  "totalTickets": 1,
  "compliantTickets": 1,
  "nonCompliantTickets": [],
  "averageScore": 85,
  "details": [
    {
      "ticketId": "MVM-1001",
      "score": 85,
      "status": "compliant",
      "gaps": []
    }
  ]
}
```

---

### POST /api/compliance/report

Generate detailed compliance report.

**Request:**
```json
{
  "tickets": [
    {...}
  ],
  "standards": ["pmi", "babok"]
}
```

**Response (200 OK):**
```json
{
  "reportId": "report-uuid",
  "generatedAt": "2025-10-30T13:30:00Z",
  "totalTickets": 50,
  "compliantTickets": 45,
  "nonCompliantTickets": [
    {
      "ticketId": "MVM-1001",
      "status": "gap",
      "overallScore": 42,
      "gaps": [
        "Missing acceptance criteria",
        "Short summary"
      ],
      "recommendations": [
        "Add detailed acceptance criteria",
        "Expand summary with more context"
      ]
    }
  ],
  "averageScore": 82,
  "standardsCompliance": {
    "pmi": 0.88,
    "babok": 0.85
  },
  "status": "mostly-compliant"
}
```

---

## Monitoring Endpoints

### GET /api/monitoring/metrics

Get system-wide metrics.

**Response (200 OK):**
```json
{
  "requests": {
    "total": 250,
    "successful": 249,
    "failed": 1,
    "errorRate": 0.004
  },
  "performance": {
    "avgResponseTimeMs": 42.5,
    "minResponseTimeMs": 10,
    "maxResponseTimeMs": 150,
    "p95ResponseTimeMs": 95,
    "p99ResponseTimeMs": 140
  },
  "tickets": {
    "processed": 1850,
    "validated": 1820,
    "averageConfidence": 0.92
  },
  "sessions": {
    "active": 5,
    "total": 42
  }
}
```

---

### GET /api/monitoring/alerts

Get active alerts.

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "alert-001",
      "severity": "warning",
      "title": "High Error Rate",
      "message": "Error rate exceeded 0.5% threshold",
      "timestamp": "2025-10-30T13:25:00Z",
      "resolved": false
    }
  ],
  "count": 1,
  "criticalCount": 0
}
```

---

### GET /api/monitoring/performance

Get performance summary.

**Response (200 OK):**
```json
{
  "uptime": "99.95%",
  "avgResponseTime": 42.5,
  "requestsPerSecond": 2.1,
  "errorRate": 0.004,
  "diskUsage": "45%",
  "memoryUsage": "62%",
  "cpuUsage": "28%",
  "topEndpoints": [
    {
      "endpoint": "POST /api/upload",
      "requests": 180,
      "avgTime": 95
    }
  ]
}
```

---

### GET /api/monitoring/export

Export metrics for date range.

**Query Parameters:**
- `days` (optional, default=7): Number of days to export (1-30)

**Response (200 OK):**
```json
{
  "exportId": "export-uuid",
  "dateRange": "2025-10-23 to 2025-10-30",
  "metrics": [
    {
      "date": "2025-10-30",
      "requests": 250,
      "errors": 1,
      "avgResponseTime": 42.5,
      "ticketsProcessed": 300
    }
  ],
  "downloadUrl": "/api/monitoring/download/export-uuid"
}
```

---

## AI Model Endpoints

### GET /api/ai/models

List available AI models from providers.

**Response (200 OK):**
```json
{
  "defaultProvider": "anthropic",
  "providers": {
    "anthropic": {
      "name": "Anthropic",
      "description": "Claude models from Anthropic",
      "configured": true
    },
    "openrouter": {
      "name": "OpenRouter",
      "description": "Multi-model LLM aggregator",
      "configured": true
    }
  },
  "models": {
    "anthropic": [
      {
        "id": "claude-3-5-sonnet",
        "name": "Claude 3.5 Sonnet",
        "description": "Latest Claude model with strong reasoning",
        "recommended": true,
        "contextWindow": 200000
      },
      {
        "id": "claude-3-5-haiku",
        "name": "Claude 3.5 Haiku",
        "description": "Fast and efficient Claude model",
        "recommended": false,
        "contextWindow": 200000
      }
    ],
    "openrouter": [
      {
        "id": "openrouter/auto",
        "name": "Auto (Best Model)",
        "description": "Automatically selects best model",
        "recommended": true
      }
    ]
  }
}
```

---

## Diagram Endpoints

### POST /api/diagrams/render

Render Mermaid diagram to SVG/PNG.

**Request:**
```json
{
  "definition": "graph TD\n    A[Start] --> B[Process]\n    B --> C[End]",
  "formats": ["svg"]
}
```

**Response (200 OK):**
```json
{
  "definition": "graph TD...",
  "formats": ["svg"],
  "rendered": {
    "svg": "<svg>...</svg>"
  }
}
```

---

### POST /api/diagrams/generate

Generate diagram from text description (AI-based).

**Request:**
```json
{
  "description": "Create a flowchart showing user registration flow",
  "type": "flowchart"
}
```

**Response (200 OK):**
```json
{
  "description": "Create a flowchart...",
  "type": "flowchart",
  "definition": "graph TD...",
  "svg": "<svg>...</svg>"
}
```

---

## Jira OAuth Endpoints

### GET /api/jira/status

Check Jira connection status.

**Response (200 OK - Connected):**
```json
{
  "connected": true,
  "message": "Connected to Jira",
  "sessions": 1,
  "user": {
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

**Response (200 OK - Not Connected):**
```json
{
  "connected": false,
  "message": "No active Jira session"
}
```

---

### GET /api/jira/auth

Get OAuth2 authorization URL.

**Response (200 OK):**
```json
{
  "auth_url": "https://auth.atlassian.com/authorize?client_id=...",
  "redirect": true
}
```

---

### GET /api/jira/callback

OAuth2 callback handler (called by Jira after user approval).

**Query Parameters:**
- `code` (required): Authorization code
- `state` (required): CSRF protection state

**Response (200 OK):**
```json
{
  "success": true,
  "token": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600,
    "expires_at": "2025-10-30T14:30:00Z"
  },
  "message": "Successfully authenticated with Jira"
}
```

---

### POST /api/jira/create-tickets

Create tickets in Jira.

**Request:**
```json
{
  "tickets": [
    {
      "id": "MVM-1001",
      "summary": "Implement authentication",
      "description": "Add OAuth2 support",
      "priority": "High",
      "type": "Story",
      "assignee": "John Doe",
      "acceptanceCriteria": ["AC1", "AC2"]
    }
  ],
  "project": "BA"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "created": 1,
  "tickets": [
    {
      "id": "BA-1001",
      "key": "BA-1001",
      "url": "https://jira.example.com/browse/BA-1001",
      "originalId": "MVM-1001",
      "status": "created"
    }
  ],
  "project": "BA"
}
```

**Response (200 OK - Partial Success):**
```json
{
  "success": true,
  "created": 1,
  "tickets": [
    {
      "originalId": "MVM-1001",
      "status": "failed",
      "error": "Priority mapping failed"
    }
  ]
}
```

---

### POST /api/jira/logout

Logout from Jira.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out from Jira"
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Invalid file type, missing parameters |
| 401 | Unauthorized | OAuth token expired or invalid |
| 403 | Forbidden | User doesn't have access |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Service temporarily down |

### Error Examples

**File Upload Error:**
```json
{
  "detail": "File too large. Maximum size: 50MB"
}
```

**Validation Error:**
```json
{
  "detail": "Invalid priority: 'Unknown'. Valid options: Critical, High, Medium, Low"
}
```

**OAuth Error:**
```json
{
  "detail": "OAuth callback failed: Invalid authorization code"
}
```

---

## Authentication

### Session-based Authentication

Sessions are managed via HTTP cookies (set after OAuth login).

**Cookie Name**: `jira_session`  
**Expiration**: 24 hours

### Required Headers

Most endpoints don't require authentication headers. OAuth endpoints handle tokens internally.

### CORS

CORS is enabled for:
- **Allowed Origins**: `localhost:3000`, `localhost:5173` (development)
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization

---

## Rate Limiting

Current implementation has no rate limiting (can be added).

Recommended limits:
- 100 requests/minute per IP (general)
- 10 requests/minute (file uploads)
- 5 requests/minute (OAuth endpoints)

---

## Examples

### Complete Upload & Validation Flow

```bash
# 1. Upload Excel file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@tickets.xlsx"

# Response: Tickets with grounding metadata

# 2. Validate compliance
curl -X POST http://localhost:8000/api/compliance/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [{...}],
    "standards": ["pmi", "babok"]
  }'

# Response: Compliance validation results
```

### Jira OAuth Flow

```bash
# 1. Get authorization URL
curl http://localhost:8000/api/jira/auth

# Response: {"auth_url": "https://..."}

# 2. User visits auth_url and approves
# Jira redirects to: http://localhost:8000/api/jira/callback?code=...&state=...

# 3. Create tickets
curl -X POST http://localhost:8000/api/jira/create-tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [{...}],
    "project": "BA"
  }'

# Response: Created ticket IDs
```

---

## Deployment Notes

- All endpoints require Python backend to be running (`uvicorn main:app`)
- CORS must be configured for frontend domain
- Environment variables must be set in `.env`
- Database connection pooling recommended for production
- Rate limiting should be implemented at reverse proxy (Nginx)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2025-10-30 | Python FastAPI backend, 21 endpoints, OAuth2 |
| 1.0.0 | 2025-09-01 | Node.js/Express backend |

---

**Last Updated**: 2025-10-30  
**Maintainer**: BA AI Demo Team

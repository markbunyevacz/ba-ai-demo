# Python Backend Verification Checklist

## Complete Testing Guide for Backend Migration

**Date**: January 2025
**Purpose**: Verify Python backend functionality before removing JavaScript backend files

---

## Prerequisites

- [ ] Python 3.10+ installed
- [ ] Node.js 18+ installed (for frontend)
- [ ] Virtual environment created in `python-backend/`
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] NLTK data downloaded (`python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"`)

---

## Phase 1: Backend Health Check

### 1.1 Start Python Backend

```bash
cd python-backend
source venv/bin/activate  # Windows: .\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Expected Output**:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

- [ ] Backend starts without errors
- [ ] Health endpoint accessible

### 1.2 Test Health Endpoint

```bash
curl http://localhost:8000/api/health
```

**Expected Response**:

```json
{
  "status": "OK",
  "version": "2.0.0",
  "backend": "python"
}
```

- [ ] Status is "OK"
- [ ] Version is "2.0.0"
- [ ] Backend field is "python"

---

## Phase 2: Core API Endpoints

### 2.1 Upload Endpoint - Excel File

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@docs/demo_simple.xlsx"
```

**Expected Response**:

- Status: 200 OK
- Contains: `tickets` array
- Each ticket has: `id`, `summary`, `priority`, `assignee`, `epic`

**Checklist**:

- [ ] Upload succeeds
- [ ] Tickets are generated
- [ ] Ticket structure matches expected format
- [ ] No errors in response

### 2.2 Upload Endpoint - Word Document

```bash
curl -X POST http://localhost:8000/api/upload/document \
  -F "file=@docs/your_document.docx" \
  -F "aiProvider=openai" \
  -F "aiModel=gpt-4-turbo-preview"
```

**Expected Response**:

- Status: 200 OK
- Contains: `tickets`, `preview`, `epics`, `processFlow`, `strategicInsights`

**Checklist**:

- [ ] Word document upload succeeds
- [ ] AI analysis is performed (if configured)
- [ ] Tickets are generated
- [ ] Preview is generated
- [ ] Epics are identified

### 2.3 AI Models Endpoint

```bash
curl http://localhost:8000/api/ai/models
```

**Expected Response**:

- Status: 200 OK
- Contains: `models` object with provider lists
- Contains: `defaultProvider`
- Contains: `providers` availability status

**Checklist**:

- [ ] Models list is returned
- [ ] Default provider is set
- [ ] Provider availability is correct

### 2.4 Grounding Statistics

```bash
curl http://localhost:8000/api/grounding/stats
```

**Expected Response**:

- Status: 200 OK
- Contains: grounding statistics

**Checklist**:

- [ ] Stats endpoint works
- [ ] Returns valid statistics

### 2.5 Monitoring Metrics

```bash
curl http://localhost:8000/api/monitoring/metrics
```

**Expected Response**:

- Status: 200 OK
- Contains: monitoring metrics

**Checklist**:

- [ ] Metrics endpoint works
- [ ] Returns valid metrics

### 2.6 Compliance Validation

```bash
curl -X POST http://localhost:8000/api/compliance/validate \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [{"id": "TEST-1", "summary": "Test ticket"}],
    "standards": ["pmi", "babok"]
  }'
```

**Expected Response**:

- Status: 200 OK
- Contains: compliance validation results

**Checklist**:

- [ ] Validation endpoint works
- [ ] Returns compliance results

### 2.7 Diagram Generation

```bash
curl -X POST http://localhost:8000/api/diagrams/generate \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [{"id": "TEST-1", "summary": "Test"}],
    "type": "bpmn",
    "formats": ["svg", "xml"]
  }'
```

**Expected Response**:

- Status: 200 OK
- Contains: diagram data

**Checklist**:

- [ ] Diagram generation works
- [ ] Returns diagram in requested formats

---

## Phase 3: Jira OAuth Integration

### 3.1 Prerequisites

- [ ] Jira OAuth app registered at Atlassian Developer Portal
- [ ] `JIRA_CLIENT_ID` set in `.env`
- [ ] `JIRA_CLIENT_SECRET` set in `.env`
- [ ] `JIRA_CALLBACK_URL` set to `http://localhost:8000/api/jira/callback`
- [ ] `JIRA_BASE_URL` set to your Jira instance URL

### 3.2 Get Authorization URL

```bash
curl http://localhost:8000/api/jira/auth
```

**Expected Response**:

```json
{
  "auth_url": "https://auth.atlassian.com/authorize?...",
  "redirect": true
}
```

**Checklist**:

- [ ] Auth URL is generated
- [ ] URL is valid Atlassian OAuth URL
- [ ] Contains correct `client_id` and `redirect_uri`

### 3.3 Test OAuth Flow (Manual)

1. Open auth URL in browser
2. Log in with Atlassian account
3. Grant permissions
4. Get redirected to callback URL with `code` parameter

**Checklist**:

- [ ] OAuth redirect works
- [ ] Can log in successfully
- [ ] Permissions granted
- [ ] Callback receives authorization code

### 3.4 Check Connection Status

```bash
curl http://localhost:8000/api/jira/status
```

**Expected Response** (after OAuth):

```json
{
  "connected": true,
  "user": {...},
  "project": "..."
}
```

**Checklist**:

- [ ] Status endpoint works
- [ ] Returns connection status correctly
- [ ] User info is available when connected

### 3.5 Create Tickets in Jira

```bash
curl -X POST http://localhost:8000/api/jira/create-tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tickets": [
      {
        "id": "TEST-1",
        "summary": "Test ticket from Python backend",
        "description": "Testing ticket creation",
        "priority": "Medium"
      }
    ],
    "project": "BA"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "created": ["BA-123", "BA-124"],
  "failed": []
}
```

**Checklist**:

- [ ] Tickets are created in Jira
- [ ] Returns Jira ticket keys
- [ ] Error handling works for failures

---

## Phase 4: Frontend Integration

### 4.1 Start Frontend

```bash
npm run dev
```

**Checklist**:

- [ ] Frontend starts without errors
- [ ] Vite proxy configured for port 8000
- [ ] Frontend accessible at http://localhost:5173

### 4.2 Test File Upload via Frontend

1. Open http://localhost:5173
2. Upload `docs/demo_simple.xlsx`
3. Click "Feldolgozás" (Process)

**Checklist**:

- [ ] File upload works
- [ ] Tickets are displayed
- [ ] No console errors
- [ ] UI updates correctly

### 4.3 Test Jira OAuth via Frontend

1. Click "🔗 Jira Connection" button
2. Complete OAuth flow
3. Verify connection status shows "Connected"

**Checklist**:

- [ ] OAuth button works
- [ ] Redirects to Atlassian
- [ ] Callback handled correctly
- [ ] Connection status updates

### 4.4 Test Ticket Creation via Frontend

1. Upload and process a file
2. Click "Jira-ba Küldés" (Send to Jira)
3. Verify tickets created in Jira

**Checklist**:

- [ ] Ticket creation works
- [ ] Success message displayed
- [ ] Tickets appear in Jira
- [ ] Error handling works

---

## Phase 5: End-to-End Testing

### 5.1 Complete Workflow

1. Upload Excel file
2. Process tickets
3. View stakeholder analysis
4. View compliance report
5. Generate diagrams
6. Connect to Jira
7. Create tickets in Jira

**Checklist**:

- [ ] Complete workflow works end-to-end
- [ ] No errors in console
- [ ] All features functional
- [ ] Performance acceptable

### 5.2 Error Handling

Test error scenarios:

- Invalid file types
- Corrupted files
- Network errors
- Jira OAuth failures
- Missing required fields

**Checklist**:

- [ ] Errors handled gracefully
- [ ] Error messages are clear
- [ ] No crashes or hangs
- [ ] Appropriate HTTP status codes

---

## Phase 6: Performance Testing

### 6.1 Response Times

Measure average response times:

- Health check: < 100ms
- File upload: < 5s (for normal files)
- Ticket generation: < 10s
- Jira OAuth: < 2s

**Checklist**:

- [ ] Response times acceptable
- [ ] No significant slowdowns
- [ ] Concurrent requests handled

### 6.2 Load Testing

Test with:

- Multiple concurrent uploads
- Large files (10MB+)
- Many tickets (100+)

**Checklist**:

- [ ] Handles concurrent requests
- [ ] Large files processed
- [ ] Many tickets generated
- [ ] Memory usage reasonable

---

## Verification Summary

### All Tests Passing

- [ ] Phase 1: Backend Health ✅
- [ ] Phase 2: Core API Endpoints ✅
- [ ] Phase 3: Jira OAuth ✅
- [ ] Phase 4: Frontend Integration ✅
- [ ] Phase 5: End-to-End Testing ✅
- [ ] Phase 6: Performance Testing ✅

### Issues Found

Document any issues found during testing:

1. **Issue**: _________________
   - **Severity**: Critical / High / Medium / Low
   - **Status**: Open / Fixed / Deferred

---

## Sign-Off

**Tested By**: _________________
**Date**: _________________
**Python Backend Version**: _________________
**Status**: ✅ **APPROVED** / ⚠️ **CONDITIONAL** / ❌ **REJECTED**

**Notes**:

---

---

---

---

**Next Steps After Approval**:

1. Remove backend-only JavaScript services
2. Deprecate `server.js` with timeline
3. Update production deployment documentation
4. Archive JavaScript backend code

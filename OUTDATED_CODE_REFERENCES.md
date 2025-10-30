# Outdated Code References in Documentation
## Specific Examples Found in Markdown Files

This document lists specific outdated references to JavaScript backend code found in markdown documentation files.

---

## 🔴 Critical - Startup Guides

### `00_START_HERE.md`
**Issue**: References Node.js backend commands

**Found References**:
- `npm run server` - Should reference Python backend: `uvicorn python-backend.main:app --reload`
- `server.js` file references - Should reference `python-backend/main.py`

**Impact**: ⚠️ **HIGH** - First-time users will follow outdated instructions

---

### `START_HERE.md`
**Issue**: References JavaScript backend OAuth routes

**Found References**:
- `server.js` OAuth routes - Should reference Python FastAPI routes
- Mentions "OAuth routes added" in `server.js` - Should reference `python-backend/api/routes/jira.py`

**Impact**: ⚠️ **HIGH** - Critical onboarding document

---

### `GETTING_STARTED.md`
**Issue**: References Node.js backend setup

**Found References**:
- `server.js` file structure
- Node.js backend instructions

**Impact**: ⚠️ **HIGH** - Getting started guide

---

## 🟡 Implementation Guides

### `LANGGRAPH_IMPLEMENTATION_SUMMARY.md`
**Issue**: Entire document references JavaScript implementation

**Found References**:
- `src/agents/BaseAgent.js` - Should reference `python-backend/models/agents/base_agent.py`
- `src/agents/TicketAgent.js` - Should reference `python-backend/models/agents/ticket_agent.py`
- `src/workflows/BAWorkflow.js` - Should reference `python-backend/models/workflow.py`
- `server.js` - Should reference `python-backend/main.py`
- "Node.js verzió: v18+" - Should mention Python 3.10+

**Example Code Block**:
```markdown
#### BaseAgent (`src/agents/BaseAgent.js`)
```

**Should Be**:
```markdown
#### BaseAgent (`python-backend/models/agents/base_agent.py`)
```

**Impact**: 🟡 **MEDIUM** - Implementation reference, but still used

---

### `IMPLEMENTATION_VERIFICATION.md`
**Issue**: References JavaScript services and server

**Found References**:
- `src/services/documentParser.js` - Should reference `python-backend/services/document_parser.py`
- `server.js` - Should reference Python backend endpoints
- Package.json dependencies - Should reference `requirements.txt`

**Example**:
```markdown
**File**: `src/services/documentParser.js`
```

**Should Be**:
```markdown
**File**: `python-backend/services/document_parser.py`
```

**Impact**: 🟡 **MEDIUM** - Verification checklist

---

### `WORD_DOCUMENT_PARSING_GUIDE.md`
**Issue**: References Express.js backend

**Found References**:
- `server.js` endpoint configuration
- Express.js middleware documentation links
- JavaScript service file paths

**Example**:
```markdown
Modify `server.js` endpoint to change defaults:
```

**Should Be**:
```markdown
Modify `python-backend/api/routes/upload.py` endpoint to change defaults:
```

**Impact**: 🟡 **MEDIUM** - Feature guide

---

### `AI_ANALYSIS_IMPLEMENTATION.md`
**Issue**: References JavaScript AI service

**Found References**:
- `src/services/aiAnalysisService.js` - Should reference Python AI provider implementation
- `server.js` integration - Should reference FastAPI routes
- Node.js test script - Should reference Python pytest

**Example**:
```markdown
### 1. **AI Analysis Service** (`src/services/aiAnalysisService.js`)
```

**Should Be**:
```markdown
### 1. **AI Analysis Service** (`python-backend/models/providers/`)
```

**Impact**: 🟡 **MEDIUM** - Feature implementation guide

---

## 🟠 Testing Guides

### `MANUAL_TESTING_GUIDE.md`
**Issue**: References Node.js backend and test scripts

**Found References**:
- `npm run server` - Should reference `uvicorn python-backend.main:app --reload`
- `node test-xlsx-upload.js` - Should reference `pytest python-backend/tests/`
- Port 5000 (Node.js) - Should reference port 8000 (Python)

**Example**:
```markdown
- Backend running: `npm run server` (port 5000)
```

**Should Be**:
```markdown
- Backend running: `uvicorn python-backend.main:app --reload` (port 8000)
```

**Impact**: 🟠 **MEDIUM** - Testing instructions

---

### `OPENAI_CONFIGURATION.md`
**Issue**: References Node.js backend startup

**Found References**:
- `npm run server` command
- Node.js backend references

**Impact**: 🟠 **LOW** - Configuration guide

---

## 📝 Historical Phase Documents

### `MICROSERVICES_PHASE1_COMPLETE.md`
**Status**: Historical document - **KEEP** but annotate

**Found References**:
- Node.js backend Dockerfile
- Express.js backend setup
- Port 5000 references

**Recommendation**: Add header: "**Historical Document** - See `python-backend/README.md` for current setup"

---

### `MICROSERVICES_PHASE2_COMPLETE.md`
**Status**: Historical document - **KEEP** but annotate

**Found References**:
- Node.js backend refactoring notes
- Express → FastAPI migration notes

**Recommendation**: Annotate as historical

---

### `MICROSERVICES_PHASE3_COMPLETE.md`
**Status**: Historical document - **KEEP** but annotate

**Found References**:
- Node.js to Python migration notes
- Service porting references

**Recommendation**: Annotate as historical

---

### `MICROSERVICES_PHASE5_FRONTEND_COMPLETE.md`
**Status**: May need updates - references API client changes

**Found References**:
- `src/services/apiClient.js` - ✅ Still valid (frontend file)
- References to backend endpoints - ⚠️ May need Python endpoint updates

**Impact**: 🟡 **LOW** - Frontend integration guide, mostly still valid

---

## 🔧 Configuration References

### Various Docs Reference:
- `package.json` dependencies - Should also mention `requirements.txt`
- `npm install` - Should also mention `pip install -r requirements.txt`
- Node.js version requirements - Should mention Python version requirements

---

## 📊 Summary by File Type

| Document Type | Files | Priority | Action |
|---------------|-------|----------|--------|
| **Startup Guides** | 3 | 🔴 HIGH | Update immediately |
| **Implementation Guides** | 5 | 🟡 MEDIUM | Update or annotate |
| **Testing Guides** | 2 | 🟠 MEDIUM | Update commands |
| **Historical Docs** | 5+ | 🟢 LOW | Annotate as historical |
| **Feature Guides** | 3 | 🟡 MEDIUM | Update file paths |

---

## 🎯 Recommended Update Pattern

### For Startup Guides:
```markdown
<!-- OLD -->
npm run server

<!-- NEW -->
uvicorn python-backend.main:app --reload --port 8000
```

### For File References:
```markdown
<!-- OLD -->
`src/services/documentParser.js`

<!-- NEW -->
`python-backend/services/document_parser.py`
```

### For Historical Docs:
```markdown
> **📌 Historical Document**  
> This document describes the original JavaScript/Node.js implementation.  
> For current Python backend setup, see: `python-backend/README.md`
```

---

## 📋 Quick Fix Checklist

- [ ] Update `00_START_HERE.md` - Replace `npm run server` with Python commands
- [ ] Update `START_HERE.md` - Replace `server.js` references with Python backend
- [ ] Update `GETTING_STARTED.md` - Add Python backend setup instructions
- [ ] Annotate `MICROSERVICES_PHASE*.md` files as historical
- [ ] Update `MANUAL_TESTING_GUIDE.md` - Replace test commands
- [ ] Review and update implementation guides as needed

---

**Last Updated**: 2025-01-XX  
**See Also**: `CLEANUP_REPORT.md` for full analysis


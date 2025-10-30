# Cleanup Quick Reference
## JavaScript to Python Migration - Files to Review/Remove

**Quick action checklist for codebase cleanup**

---

## 🔴 HIGH PRIORITY - Backend Files

### Main Backend Server
- [ ] **`server.js`** (1,496 lines) - Verify if still used
  - Referenced in: `package.json`, `Dockerfile.backend`, `docker-compose.dev.yml`
  - Check: Frontend `VITE_API_URL` configuration

### Backend Services (Check Duplicates)
- [ ] `src/services/groundingService.js` → `python-backend/services/grounding_service.py`
- [ ] `src/services/monitoringService.js` → `python-backend/services/monitoring_service.py`
- [ ] `src/services/jiraService.js` → `python-backend/services/jira_service.py`
- [ ] `src/services/complianceService.js` → `python-backend/services/compliance_service.py`
- [ ] `src/services/diagramService.js` → `python-backend/services/diagram_service.py`
- [ ] `src/services/documentParser.js` → `python-backend/services/document_parser.py`
- [ ] `src/services/sessionStore.js` → `python-backend/services/session_store.py`

### Agents & Workflows (If Unused)
- [ ] `src/agents/BaseAgent.js`
- [ ] `src/agents/TicketAgent.js`
- [ ] `src/agents/StakeholderAgent.js`
- [ ] `src/agents/StrategicAgent.js`
- [ ] `src/workflows/BAWorkflow.js`
- [ ] `src/tools/GroundingTool.js`
- [ ] `src/tools/ComplianceTool.js`

---

## 🟡 MEDIUM PRIORITY - Test Files

- [ ] **`test-ai-analysis.js`** - Update to Python backend or remove
- [ ] **`test-xlsx-upload.js`** - Hardcoded `localhost:5000`, update to port 8000

---

## 🟢 LOW PRIORITY - Legacy Frontend

- [ ] **`public/app.js`** - Standalone JS, likely unused
- [ ] **`public/index.html`** - Verify if still needed
- [ ] **`public/style.css`** - Check if used

---

## 📚 DOCUMENTATION - Critical Updates

### Must Update (First-Time User Guides)
- [ ] `00_START_HERE.md` - References `server.js`, `npm run server`
- [ ] `START_HERE.md` - References `server.js`
- [ ] `GETTING_STARTED.md` - References `server.js`

### Should Update (Implementation Guides)
- [ ] `LANGGRAPH_IMPLEMENTATION_SUMMARY.md` - JS backend references
- [ ] `IMPLEMENTATION_VERIFICATION.md` - `server.js` references
- [ ] `WORD_DOCUMENT_PARSING_GUIDE.md` - Express.js references
- [ ] `AI_ANALYSIS_IMPLEMENTATION.md` - JS service references
- [ ] `MANUAL_TESTING_GUIDE.md` - `npm run server` commands

### Historical (Annotate, Don't Delete)
- [ ] `MICROSERVICES_PHASE1_COMPLETE.md` - Historical doc
- [ ] `MICROSERVICES_PHASE2_COMPLETE.md` - Historical doc
- [ ] `MICROSERVICES_PHASE3_COMPLETE.md` - Historical doc
- [ ] `MICROSERVICES_PHASE4_COMPLETE.md` - Historical doc
- [ ] `MICROSERVICES_PHASE5_FRONTEND_COMPLETE.md` - May need update

---

## ✅ KEEP - Client-Side Services (Still Used)

These are used in React components and should **NOT** be removed:

- ✅ `src/services/bpmnService.js` - Used in `App.jsx`
- ✅ `src/services/stakeholderService.js` - Used in `App.jsx`
- ✅ `src/services/prioritizationService.js` - Used in `App.jsx`
- ✅ `src/services/apiClient.js` - Primary API client
- ✅ `src/services/diagramClient.js` - API wrapper
- ✅ `src/services/complianceClient.js` - API wrapper
- ⚠️ `src/services/groundingService.js` - Verify client-side usage

---

## 🔧 CONFIGURATION FILES - Check Updates

- [ ] **`package.json`** - Remove `server` script if unused
- [ ] **`docker-compose.dev.yml`** - Remove Node.js backend service if unused
- [ ] **`Dockerfile.backend`** - Remove if unused
- [ ] **`vite.config.js`** - Update proxy default port if changed

---

## 📋 VERIFICATION STEPS

Before removing anything:

1. **Check Frontend Configuration**
   ```bash
   grep -r "VITE_API_URL" .env* vite.config.js
   ```

2. **Check Which Backend Runs**
   ```bash
   # Check docker-compose
   grep -A 10 "backend:" docker-compose.dev.yml
   
   # Check package.json scripts
   grep "server" package.json
   ```

3. **Verify Python Backend Endpoints**
   ```bash
   curl http://localhost:8000/api/health
   curl http://localhost:8000/api/upload
   ```

4. **Test Frontend with Python Backend Only**
   - Stop Node.js backend
   - Start Python backend on port 8000
   - Test frontend functionality

---

## 🎯 RECOMMENDED CLEANUP ORDER

1. **Update Documentation** (Low Risk)
   - Fix critical guides first
   - Then implementation guides

2. **Remove Test Scripts** (Low Risk)
   - Update or remove `test-*.js` files

3. **Remove Legacy Frontend** (Low Risk)
   - Remove `public/app.js` if unused

4. **Verify Backend Usage** (High Priority)
   - Determine which backend is actually used

5. **Remove Backend Services** (Medium Risk)
   - Only after verification
   - Keep client-side services

6. **Remove Main Backend** (High Risk)
   - Only if Python backend is confirmed production-ready

---

**Last Updated**: 2025-01-XX  
**See**: `CLEANUP_REPORT.md` for detailed analysis


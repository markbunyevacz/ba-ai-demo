# Execution Guide - Complete Testing Workflow
## Step-by-Step Instructions for Python Backend Verification

**Date**: January 2025  
**Purpose**: Complete execution guide for testing Python backend

---

## 🎯 Quick Start (Automated Setup)

### Option 1: Automated Setup & Test

Run the setup script:
```powershell
.\EXECUTE_VERIFICATION.ps1
```

This will:
- ✅ Check Python installation
- ✅ Create virtual environment (if needed)
- ✅ Install dependencies
- ✅ Download NLTK data
- ✅ Verify setup

---

## 📋 Manual Execution Steps

### Step 1: Setup Python Backend Environment

**Run Setup Script** (Recommended):
```powershell
.\EXECUTE_VERIFICATION.ps1
```

**OR Manual Setup**:
```powershell
# 1. Create virtual environment
cd python-backend
python -m venv venv

# 2. Activate virtual environment
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Download NLTK data
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"

# 5. Return to project root
cd ..
```

**✅ Success Indicators**:
- Virtual environment created in `python-backend\venv\`
- Dependencies installed (no errors)
- NLTK data downloaded

---

### Step 2: Start Python Backend

**Option A: Use Start Script** (Easiest):
```powershell
.\START_BACKEND.ps1
```

**Option B: Manual Start**:
```powershell
# Terminal 1 - Keep this running
cd python-backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**✅ Success Indicators**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**⚠️ Keep this terminal open!** The backend must stay running.

---

### Step 3: Run Automated Tests

**Open a NEW Terminal** (Terminal 2 - keep Terminal 1 running):
```powershell
# Make sure you're in project root
cd C:\Users\Admin\.cursor\ba-ai-demo

# Run verification script
.\verify-backend.ps1
```

**Expected Output**:
```
========================================
Python Backend Quick Verification
========================================
Backend URL: http://localhost:8000

1. Testing Health Endpoint... ✓ PASSED
   Status: OK, Version: 2.0.0, Backend: python
2. Testing AI Models Endpoint... ✓ PASSED
3. Testing Grounding Statistics... ✓ PASSED
4. Testing Monitoring Metrics... ✓ PASSED
5. Testing Jira Status... ✓ PASSED
6. Testing Jira Auth URL... ✓ PASSED / ⚠ SKIPPED
7. Testing File Upload... ✓ PASSED / ⚠ SKIPPED

✅ All critical tests passed!
```

**✅ Success**: All tests pass (or critical ones pass)

**❌ Failure**: If tests fail, check:
- Backend is running (Terminal 1)
- Backend URL is correct (`http://localhost:8000`)
- No firewall blocking port 8000

---

### Step 4: Manual Verification

Follow **`VERIFICATION_CHECKLIST.md`** for detailed manual testing.

#### Quick Manual Tests:

**4.1 Test Health Endpoint**:
```powershell
curl http://localhost:8000/api/health
```

**Expected**:
```json
{"status":"OK","version":"2.0.0","backend":"python"}
```

**4.2 Test File Upload** (if test file exists):
```powershell
curl -X POST http://localhost:8000/api/upload -F "file=@docs/demo_simple.xlsx"
```

**4.3 Test Frontend Integration**:
```powershell
# Terminal 3 - Start frontend
npm run dev
```

Then:
1. Open http://localhost:5173
2. Upload a test file
3. Verify tickets are generated
4. Check browser console (F12) for errors

---

### Step 5: Document Results

Update **`VERIFICATION_CHECKLIST.md`**:

1. **Check off completed items**:
   ```markdown
   - [x] Phase 1: Backend Health ✅
   - [x] Phase 2: Core API Endpoints ✅
   - [ ] Phase 3: Jira OAuth ⏳ (Not tested - no Jira configured)
   ```

2. **Document issues** (if any):
   ```markdown
   ### Issues Found
   1. **Issue**: [Description]
      - **Severity**: Medium
      - **Status**: Open
   ```

3. **Add sign-off**:
   ```markdown
   ## Sign-Off
   **Tested By**: [Your Name]
   **Date**: January 2025
   **Status**: ✅ APPROVED
   ```

See **`VERIFICATION_RESULTS_TEMPLATE.md`** for complete format.

---

## 🚀 After Verification Approval

### If All Tests Pass ✅

1. **Sign Off** on `VERIFICATION_CHECKLIST.md`
2. **Plan Migration**:
   - Update production deployment docs
   - Prepare staging migration
   - Create rollback plan
3. **Code Cleanup** (After Production Verification):
   - Remove backend-only JavaScript services
   - Follow `CODE_CLEANUP_RECOMMENDATIONS.md`
   - Archive deprecated code

### If Tests Fail ❌

1. **Document Issues** in `VERIFICATION_CHECKLIST.md`
2. **Fix Issues** in Python backend
3. **Re-test** until all pass
4. **Do NOT proceed** to migration until verified

---

## 📊 Testing Checklist Summary

### Prerequisites ✅
- [x] Python 3.10+ installed (Verified: Python 3.14.0)
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] NLTK data downloaded

### Backend Startup
- [ ] Backend starts without errors
- [ ] Health endpoint accessible
- [ ] No import errors

### Automated Tests
- [ ] Health check passes
- [ ] AI models endpoint works
- [ ] Grounding stats work
- [ ] Monitoring metrics work
- [ ] Jira endpoints work (or skipped)
- [ ] File upload works (if test file available)

### Manual Tests
- [ ] Frontend connects to backend
- [ ] File upload via UI works
- [ ] Tickets are generated
- [ ] No console errors
- [ ] Jira OAuth works (if configured)

---

## 🛠️ Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`
```powershell
# Solution: Install dependencies
cd python-backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Error**: `ImportError: cannot import name 'BaseSettings'`
```powershell
# Solution: Install pydantic-settings
pip install pydantic-settings
```

**Error**: Port 8000 already in use
```powershell
# Solution: Use different port
uvicorn main:app --reload --port 8001
# Update vite.config.js: BACKEND_PORT=8001
```

### Tests Fail

**Error**: `Cannot connect to backend`
- Check backend is running (Terminal 1)
- Verify URL: `http://localhost:8000/api/health`
- Check firewall settings

**Error**: `404 Not Found`
- Check backend logs for errors
- Verify endpoint paths
- Check Python backend routes

---

## 📝 Execution Log Template

Keep track of your execution:

```
Date: _______________
Tester: _______________

Setup:
[ ] Virtual environment created
[ ] Dependencies installed
[ ] NLTK data downloaded

Backend Startup:
[ ] Started successfully
[ ] Health endpoint works
[ ] Port: 8000

Automated Tests:
[ ] Health: PASS/FAIL
[ ] AI Models: PASS/FAIL
[ ] Grounding: PASS/FAIL
[ ] Monitoring: PASS/FAIL
[ ] Jira Status: PASS/FAIL/SKIP
[ ] Jira Auth: PASS/FAIL/SKIP
[ ] File Upload: PASS/FAIL/SKIP

Manual Tests:
[ ] Frontend connection: PASS/FAIL
[ ] File upload UI: PASS/FAIL
[ ] Ticket generation: PASS/FAIL
[ ] Console errors: NONE/SOME

Issues Found:
1. _______________
2. _______________

Status: APPROVED / CONDITIONAL / REJECTED
```

---

## ✅ Success Criteria

**Ready to Proceed When**:
- [x] Backend starts without errors
- [x] All automated tests pass (or critical ones)
- [x] Frontend connects successfully
- [x] File upload works
- [x] No critical bugs found
- [x] Results documented
- [x] Sign-off obtained

---

## 🎯 Next Actions After Verification

1. ✅ **Document Results** - Update `VERIFICATION_CHECKLIST.md`
2. ✅ **Sign Off** - Mark as approved
3. ⏳ **Plan Migration** - Update deployment docs
4. ⏳ **Code Cleanup** - Remove backend-only services (after production)
5. ⏳ **Production Deployment** - Migrate to Python backend

---

**Ready to execute!** Start with `.\EXECUTE_VERIFICATION.ps1` or follow manual steps above.


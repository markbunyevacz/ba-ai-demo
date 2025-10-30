# Run Verification Tests - Step-by-Step Guide
## Complete Python Backend Testing Instructions

**Date**: January 2025  
**Purpose**: Execute all verification tests for Python backend

---

## Prerequisites Check

Before starting, verify:

```powershell
# Check Python version (should be 3.10+)
python --version

# Check if you're in project root
Get-Location  # Should be: C:\Users\Admin\.cursor\ba-ai-demo

# Verify Python backend directory exists
Test-Path python-backend\requirements.txt  # Should be True
```

---

## Step 1: Setup Python Backend (If Not Done)

### 1.1 Create Virtual Environment
```powershell
cd python-backend
python -m venv venv
```

### 1.2 Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

You should see `(venv)` in your prompt.

### 1.3 Install Dependencies
```powershell
pip install -r requirements.txt
```

### 1.4 Download NLTK Data
```powershell
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"
```

---

## Step 2: Start Python Backend

**In Terminal 1** (keep this running):
```powershell
cd python-backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Expected Output**:
```
INFO:     Will watch for changes in these directories: ['C:\\Users\\Admin\\.cursor\\ba-ai-demo\\python-backend']
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Success Indicators**:
- No error messages
- Server shows "Application startup complete"
- Server accessible at http://127.0.0.1:8000

---

## Step 3: Run Automated Tests

**In Terminal 2** (new terminal, keep backend running in Terminal 1):

```powershell
# Make sure you're in project root
cd C:\Users\Admin\.cursor\ba-ai-demo

# Run automated test script
.\test-python-backend.ps1
```

**Expected Output**:
```
==========================================
Python Backend Verification Tests
==========================================
Backend URL: http://localhost:8000

Checking if backend is running...
Backend is running

Testing Health Check... ✓ PASSED (HTTP 200)
Testing AI Models Endpoint... ✓ PASSED (HTTP 200)
Testing Grounding Statistics... ✓ PASSED (HTTP 200)
Testing Monitoring Metrics... ✓ PASSED (HTTP 200)
Testing Jira Status... ✓ PASSED (HTTP 200)
Testing Jira Auth URL... ✓ PASSED (HTTP 200)
Testing Compliance Validation... ✓ PASSED (HTTP 200)
Testing Diagram Generation... ✓ PASSED (HTTP 200)
Testing File Upload... ✓ PASSED (HTTP 200)

==========================================
Test Summary
==========================================
Passed: 9
Failed: 0
Total: 9

✓ All tests passed!
```

---

## Step 4: Manual Verification

Follow `VERIFICATION_CHECKLIST.md` for detailed manual testing.

### Quick Manual Tests:

#### 4.1 Health Check (Should already pass from automated tests)
```powershell
curl http://localhost:8000/api/health
```

#### 4.2 Test File Upload
```powershell
# If you have a test file
curl -X POST http://localhost:8000/api/upload -F "file=@docs/demo_simple.xlsx"
```

#### 4.3 Test Frontend Integration
1. **Terminal 3** - Start frontend:
   ```powershell
   npm run dev
   ```

2. Open browser: http://localhost:5173
3. Upload a test file
4. Verify tickets are generated
5. Check browser console for errors

---

## Step 5: Document Results

Update `VERIFICATION_CHECKLIST.md` with your test results:

1. Check off completed items in the checklist
2. Document any issues found
3. Add your sign-off at the bottom

**Example**:
```markdown
## Verification Summary

### All Tests Passing
- [x] Phase 1: Backend Health ✅
- [x] Phase 2: Core API Endpoints ✅
- [ ] Phase 3: Jira OAuth ⏳ (Not tested - no Jira configured)
- [x] Phase 4: Frontend Integration ✅
- [x] Phase 5: End-to-End Testing ✅
- [ ] Phase 6: Performance Testing ⏳ (Deferred)

### Issues Found
None - All tests passed successfully.

## Sign-Off
**Tested By**: [Your Name]
**Date**: January 2025
**Python Backend Version**: 2.0.0
**Status**: ✅ APPROVED
```

---

## Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`
**Solution**: Virtual environment not activated or dependencies not installed
```powershell
cd python-backend
.\venv\Scripts\activate
pip install -r requirements.txt
```

**Error**: `ImportError: cannot import name 'BaseSettings'`
**Solution**: Install pydantic-settings
```powershell
pip install pydantic-settings
```

**Error**: Port 8000 already in use
**Solution**: Use different port or stop other service
```powershell
uvicorn main:app --reload --port 8001
# Then update BACKEND_PORT=8001 in .env
```

### Tests Fail

**Error**: `Cannot connect to backend`
**Solution**: 
1. Verify backend is running (check Terminal 1)
2. Check backend URL: `http://localhost:8000/api/health`
3. Verify no firewall blocking port 8000

**Error**: `404 Not Found` on endpoints
**Solution**: 
1. Check backend is running correctly
2. Verify endpoint paths match Python backend routes
3. Check Python backend logs for errors

---

## Next Steps After Verification

Once all tests pass:

1. ✅ **Document Results** - Update `VERIFICATION_CHECKLIST.md`
2. ✅ **Sign Off** - Mark verification as approved
3. ⏳ **Migration Planning** - Plan production migration
4. ⏳ **Code Cleanup** - Remove backend-only JavaScript services
5. ⏳ **Update Production** - Deploy Python backend

---

## Quick Reference Commands

```powershell
# Start backend
cd python-backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Run tests (in another terminal)
.\test-python-backend.ps1

# Start frontend (in another terminal)
npm run dev

# Test health endpoint
curl http://localhost:8000/api/health

# Test file upload
curl -X POST http://localhost:8000/api/upload -F "file=@docs/demo_simple.xlsx"
```

---

**Ready to test!** Follow the steps above to verify Python backend functionality.


# Quick Start - Testing Python Backend
## Fast 5-Minute Verification Guide

**Ready to test?** Follow these steps:

---

## 🚀 Quick Start (3 Steps)

### Step 1: Start Python Backend

**Open Terminal 1**:
```powershell
cd python-backend

# If virtual environment doesn't exist, create it:
python -m venv venv

# Activate virtual environment:
.\venv\Scripts\activate

# Install dependencies (first time only):
pip install -r requirements.txt

# Download NLTK data (first time only):
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"

# Start backend:
uvicorn main:app --reload --port 8000
```

**✅ Success**: You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Keep this terminal running!**

---

### Step 2: Run Automated Tests

**Open Terminal 2** (new terminal, keep Terminal 1 running):
```powershell
# Make sure you're in project root
cd C:\Users\Admin\.cursor\ba-ai-demo

# Run verification script
.\verify-backend.ps1
```

**✅ Success**: You should see:
```
========================================
Python Backend Quick Verification
========================================

1. Testing Health Endpoint... ✓ PASSED
2. Testing AI Models Endpoint... ✓ PASSED
3. Testing Grounding Statistics... ✓ PASSED
4. Testing Monitoring Metrics... ✓ PASSED
5. Testing Jira Status... ✓ PASSED
6. Testing Jira Auth URL... ✓ PASSED / ⚠ SKIPPED
7. Testing File Upload... ✓ PASSED / ⚠ SKIPPED

✅ All critical tests passed!
```

---

### Step 3: Test Frontend Integration

**Open Terminal 3** (new terminal, keep Terminals 1 & 2):
```powershell
# Start frontend
npm run dev
```

**In Browser**:
1. Open http://localhost:5173
2. Upload `docs/demo_simple.xlsx`
3. Click "Feldolgozás" (Process)
4. Verify tickets are displayed

**✅ Success**: 
- Tickets appear in UI
- No console errors (F12 → Console)
- UI updates correctly

---

## 📝 Document Results

After testing, update `VERIFICATION_CHECKLIST.md`:

1. Check off completed phases
2. Document any issues
3. Add sign-off

See `VERIFICATION_RESULTS_TEMPLATE.md` for format.

---

## ⚠️ Troubleshooting

### Backend Won't Start
- **Check**: Virtual environment activated? (`(venv)` in prompt)
- **Check**: Dependencies installed? (`pip install -r requirements.txt`)
- **Check**: Port 8000 available? (Try port 8001 if busy)

### Tests Fail
- **Check**: Backend running? (Terminal 1 still active?)
- **Check**: Correct URL? (`http://localhost:8000`)
- **Check**: Firewall blocking port 8000?

### Frontend Can't Connect
- **Check**: Backend running?
- **Check**: Vite proxy configured? (Should proxy to port 8000)
- **Check**: Browser console for errors

---

## ✅ Success Criteria

You're ready to proceed when:
- [x] Backend starts without errors
- [x] All automated tests pass (or critical ones pass)
- [x] Frontend connects to backend
- [x] File upload works
- [x] Tickets are generated

---

**That's it!** If all tests pass, you're ready for migration. 🎉


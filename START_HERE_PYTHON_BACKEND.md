# 🚀 START HERE - Python Backend Setup Guide

**Status:** ✅ **Current Production Backend**  
**Last Updated:** January 2025  
**Backend:** Python FastAPI (port 8000)

---

## 🎯 Quick Start (3 Steps)

### Step 1: Start Python Backend
```bash
cd python-backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend will be available at: **http://localhost:8000**

### Step 2: Start Frontend
```bash
# In project root directory
npm install
npm run dev
```

Frontend will be available at: **http://localhost:5173** (or 3000)

### Step 3: Verify Connection
```bash
# Test backend health
curl http://localhost:8000/api/health

# Should return:
# {"status":"OK","version":"2.0.0","backend":"python"}
```

---

## 📋 Complete Setup Instructions

### Prerequisites
- **Python 3.10+** (check: `python --version`)
- **Node.js 18+** (check: `node --version`)
- **npm** (comes with Node.js)

### Python Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd python-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   - **Windows (PowerShell/CMD):**
     ```bash
     .\venv\Scripts\activate
     ```
   - **Linux/macOS:**
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables** (if needed)
   Create `.env` file in `python-backend/`:
   ```env
   API_HOST=0.0.0.0
   API_PORT=8000
   CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
   ANTHROPIC_API_KEY=your_key_here
   OPENROUTER_API_KEY=your_key_here
   JIRA_CLIENT_ID=your_client_id
   JIRA_CLIENT_SECRET=your_client_secret
   JIRA_CALLBACK_URL=http://localhost:8000/api/jira/callback
   JIRA_BASE_URL=https://yourcompany.atlassian.net
   ```

6. **Start the backend**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   You should see:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000
   INFO:     Application startup complete.
   ```

### Frontend Setup

1. **Install dependencies** (from project root)
   ```bash
   npm install
   ```

2. **Configure frontend** (optional)
   Create `.env` file in project root:
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_AUTH_URL=http://localhost:8000/auth
   BACKEND_PORT=8000
   ```

3. **Start frontend**
   ```bash
   npm run dev
   ```

   Frontend will start on port 5173 (or 3000) and proxy API requests to Python backend.

---

## 🧪 Testing the Setup

### 1. Test Backend Health
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "version": "2.0.0",
  "backend": "python"
}
```

### 2. Test File Upload
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@docs/demo_simple.xlsx"
```

### 3. Test in Browser
1. Open http://localhost:5173
2. Upload an Excel file
3. Verify tickets are generated

---

## 🔄 Migration from JavaScript Backend

If you were previously using the JavaScript backend (`server.js`):

### Key Changes
- **Backend Port**: Changed from 5000 → 8000
- **Backend Language**: Node.js/Express → Python/FastAPI
- **Start Command**: `npm run server` → `uvicorn main:app --reload`

### Configuration Updates Needed
1. Update `vite.config.js` proxy target to port 8000:
   ```js
   proxy: {
     '/api': {
       target: 'http://localhost:8000',  // Changed from 5000
       changeOrigin: true,
     }
   }
   ```

2. Update `.env` files:
   ```env
   BACKEND_PORT=8000  # Changed from 5000
   VITE_API_URL=http://localhost:8000/api
   ```

---

## 🐳 Docker Setup (Alternative)

### Using Docker Compose
```bash
docker-compose -f docker-compose.dev.yml up backend
```

### Using Dockerfile
```bash
cd python-backend
docker build -t ba-ai-backend .
docker run -p 8000:8000 ba-ai-backend
```

---

## 📚 API Endpoints

All endpoints are available at: `http://localhost:8000/api/`

### Main Endpoints
- `GET /api/health` - Health check
- `POST /api/upload` - Upload Excel file
- `POST /api/upload/document` - Upload Word/Excel document
- `GET /api/ai/models` - List available AI models
- `GET /api/grounding/stats` - Grounding statistics
- `GET /api/monitoring/metrics` - Monitoring metrics
- `POST /api/compliance/validate` - Compliance validation
- `POST /api/diagrams/generate` - Generate diagrams

### Jira Endpoints
- `GET /api/jira/auth` - Get OAuth authorization URL
- `GET /api/jira/callback` - OAuth callback handler
- `POST /api/jira/create-tickets` - Create tickets in Jira
- `GET /api/jira/status` - Check authentication status

See `python-backend/API_DOCUMENTATION.md` for complete API reference.

---

## 🚨 Troubleshooting

### Backend Won't Start

**Issue**: `ModuleNotFoundError` or import errors
```bash
# Solution: Make sure virtual environment is activated
source venv/bin/activate  # Linux/macOS
.\venv\Scripts\activate   # Windows

# Then reinstall dependencies
pip install -r requirements.txt
```

**Issue**: Port 8000 already in use
```bash
# Solution: Use different port
uvicorn main:app --reload --port 8001

# Update frontend .env:
BACKEND_PORT=8001
```

### Frontend Can't Connect to Backend

**Issue**: CORS errors or connection refused
```bash
# Solution 1: Check backend is running
curl http://localhost:8000/api/health

# Solution 2: Check vite.config.js proxy settings
# Should proxy to port 8000

# Solution 3: Check CORS_ORIGINS in python-backend/.env
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### File Upload Fails

**Issue**: 422 Validation Error
```bash
# Solution: Ensure file is valid Excel (.xlsx) or Word (.docx)
# Check file size (max 10MB)
# Verify Content-Type header
```

---

## 📖 Additional Documentation

- **Python Backend README**: `python-backend/README.md`
- **API Documentation**: `python-backend/API_DOCUMENTATION.md`
- **Cleanup Report**: `CLEANUP_REPORT.md` (for migration details)
- **Quick Reference**: `CLEANUP_QUICK_REFERENCE.md`

---

## ⚠️ Legacy JavaScript Backend

The JavaScript backend (`server.js`) is still available but **deprecated**:

- **Location**: `server.js` (root directory)
- **Port**: 5000 (default)
- **Status**: Legacy/Fallback only
- **Start**: `npm run server`

**Recommendation**: Use Python backend for all new development.

---

## ✅ Success Checklist

- [ ] Python backend running on port 8000
- [ ] Health check returns `{"backend":"python"}`
- [ ] Frontend connects to backend
- [ ] File upload works
- [ ] Tickets are generated successfully

---

**Need Help?** Check:
1. `python-backend/README.md` for backend details
2. `CLEANUP_REPORT.md` for migration information
3. Backend logs for error messages


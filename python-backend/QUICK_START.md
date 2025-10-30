# Quick Start - Python Backend

## One-Line Setup (After Virtual Environment)

```bash
pip install -r requirements.txt && python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')" && uvicorn main:app --reload --port 8000
```

## Step-by-Step Setup

### 1. Navigate to Backend Directory
```bash
cd python-backend
```

### 2. Create Virtual Environment
```bash
python -m venv venv
```

### 3. Activate Virtual Environment

**Windows (PowerShell/CMD):**
```bash
.\venv\Scripts\activate
```

**Linux/macOS:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Download NLTK Data (Required)
```bash
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"
```

### 6. Start the Server
```bash
uvicorn main:app --reload --port 8000
```

## Verify It's Working

In another terminal, test the health endpoint:

```bash
curl http://localhost:8000/api/health
```

You should see:
```json
{
  "status": "OK",
  "version": "2.0.0",
  "backend": "python"
}
```

## Common Issues

### Import Errors
If you see import errors, make sure:
1. Virtual environment is activated (check prompt shows `(venv)`)
2. All dependencies are installed: `pip install -r requirements.txt`

### NLTK Data Missing
If NLP features fail, download data:
```bash
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"
```

### Port Already in Use
Use a different port:
```bash
uvicorn main:app --reload --port 8001
```

## Next Steps

- Configure environment variables (see `.env.example` or `SETUP_GUIDE.md`)
- Start the frontend: `npm run dev` (from project root)
- Test file upload at: http://localhost:5173

## Documentation

- **Full Setup Guide**: `SETUP_GUIDE.md`
- **API Documentation**: `API_DOCUMENTATION.md`
- **Project README**: `../README.md`


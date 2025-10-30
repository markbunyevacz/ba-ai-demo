# Python Backend Setup Guide

## Quick Start

```bash
# 1. Navigate to backend directory
cd python-backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows (PowerShell/CMD):
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the server
uvicorn main:app --reload --port 8000
```

## Verifying Installation

After starting the server, you should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Test the health endpoint:
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

## Common Issues

### Issue: `ModuleNotFoundError: No module named 'pydantic_settings'`

**Solution**: Install pydantic-settings:
```bash
pip install pydantic-settings
```

Or use Pydantic v1 (if compatibility issues):
```bash
pip install "pydantic<2.0"
```

### Issue: `ImportError: cannot import name 'BaseSettings' from 'pydantic'`

**Solution**: This happens with Pydantic v2. The code has been updated to handle both versions. Make sure you have:
```bash
pip install pydantic-settings
```

### Issue: NLTK data not found

**Solution**: Download NLTK data:
```python
python -c "import nltk; nltk.download('vader_lexicon')"
```

Or in Python:
```python
import nltk
nltk.download('vader_lexicon')
nltk.download('punkt')
```

### Issue: Port 8000 already in use

**Solution**: Use a different port:
```bash
uvicorn main:app --reload --port 8001
```

Then update frontend configuration to point to port 8001.

## Environment Variables

Create a `.env` file in `python-backend/` directory:

```env
# Application
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS (comma-separated or JSON array)
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# AI Providers (optional)
ANTHROPIC_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
DEFAULT_MODEL_PROVIDER=anthropic

# Jira OAuth (optional)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_CLIENT_ID=your_client_id
JIRA_CLIENT_SECRET=your_client_secret
JIRA_CALLBACK_URL=http://localhost:8000/api/jira/callback
JIRA_AUTH_URL=https://auth.atlassian.com/authorize
JIRA_TOKEN_URL=https://auth.atlassian.com/oauth/token

# Database (optional, for future use)
DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/ba_ai

# Message Queue (optional, for future use)
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

## Dependencies

See `requirements.txt` for complete list. Main dependencies:

- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation and settings
- **httpx** - HTTP client for external APIs
- **openpyxl** - Excel file processing
- **python-docx** - Word document processing
- **nltk** - Natural language processing

## Development Mode

For development with auto-reload:
```bash
uvicorn main:app --reload --port 8000
```

For production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Testing

Run tests:
```bash
pytest
```

Run specific test file:
```bash
pytest tests/test_api/test_health.py -v
```

## Troubleshooting

### Check Python version
```bash
python --version
# Should be Python 3.10 or higher
```

### Check if virtual environment is activated
```bash
which python  # Linux/macOS
where python  # Windows
# Should point to venv/bin/python or venv\Scripts\python.exe
```

### Reinstall dependencies
```bash
pip install --upgrade -r requirements.txt
```

### Check for missing modules
```bash
python -c "import fastapi, uvicorn, pydantic, httpx, openpyxl; print('All imports OK')"
```

---

**See also**: `README.md` in project root for frontend setup


# python-backend/README.md

# Python Backend

This directory contains the Python backend for the application, built with FastAPI.

## Setup

1.  Navigate to the `python-backend` directory:
    ```sh
    cd python-backend
    ```

2.  Create a virtual environment:
    ```sh
    python -m venv venv
    ```

3.  Activate the virtual environment:
    -   **Windows (PowerShell/CMD):**
        ```sh
        .\venv\Scripts\activate
        ```
    -   **Linux/macOS:**
        ```sh
        source venv/bin/activate
        ```

4.  Install the dependencies:
    ```sh
    pip install -r requirements.txt
    ```

## Running the Application

With the virtual environment activated, run the following command from the `python-backend` directory:

```sh
uvicorn main:app --reload --port 8000
```

The application will be available at `http://127.0.0.1:8000`.

**Note**: The entry point is `main:app` (from `main.py` at the root), not `app.main:app`.

### Quick Start Commands

```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Download NLTK data (required for NLP features)
python -c "import nltk; nltk.download('vader_lexicon'); nltk.download('punkt')"

# 4. Start the server
uvicorn main:app --reload --port 8000
```

### Verify Installation

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

For more detailed setup instructions and troubleshooting, see `SETUP_GUIDE.md`.

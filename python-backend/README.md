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
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000`.

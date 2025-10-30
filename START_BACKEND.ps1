# Start Python Backend Script
# This script starts the Python backend with proper setup

$ErrorActionPreference = "Stop"

Write-Host "Starting Python Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "python-backend\main.py")) {
    Write-Host "❌ Error: python-backend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path "python-backend\venv")) {
    Write-Host "⚠️ Virtual environment not found. Running setup first..." -ForegroundColor Yellow
    & ".\EXECUTE_VERIFICATION.ps1" -SetupOnly
    Write-Host ""
}

# Navigate to python-backend
Set-Location python-backend

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
$activateScript = ".\venv\Scripts\Activate.ps1"

if (-not (Test-Path $activateScript)) {
    Write-Host "❌ Error: Virtual environment activation script not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv venv" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

# Activate and start server
Write-Host "Starting uvicorn server on port 8000..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Green
Write-Host "Health check: http://localhost:8000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "Press CTRL+C to stop the server" -ForegroundColor Yellow
Write-Host ""

& ".\venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000


# Python Backend Verification Execution Script
# This script helps you set up and test the Python backend

param(
    [switch]$SetupOnly,
    [switch]$TestOnly,
    [switch]$FullVerification
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Python Backend Verification Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "python-backend\main.py")) {
    Write-Host "❌ Error: python-backend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Project root verified`n" -ForegroundColor Green

# Step 1: Check Python
Write-Host "Step 1: Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  $pythonVersion" -ForegroundColor Green
    
    # Check if version is 3.10+
    $versionMatch = $pythonVersion -match "Python (\d+)\.(\d+)"
    if ($versionMatch) {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 10)) {
            Write-Host "  ⚠️ Warning: Python 3.10+ recommended (found $major.$minor)" -ForegroundColor Yellow
        } else {
            Write-Host "  ✓ Python version OK" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "  ❌ Python not found! Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

# Step 2: Setup Virtual Environment
Write-Host "`nStep 2: Setting up virtual environment..." -ForegroundColor Cyan
$venvPath = "python-backend\venv"

if (-not (Test-Path $venvPath)) {
    Write-Host "  Creating virtual environment..." -ForegroundColor Yellow
    Set-Location python-backend
    python -m venv venv
    Set-Location ..
    Write-Host "  ✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "  ✓ Virtual environment already exists" -ForegroundColor Green
}

# Step 3: Install Dependencies
Write-Host "`nStep 3: Installing dependencies..." -ForegroundColor Cyan
$activateScript = "python-backend\venv\Scripts\Activate.ps1"

if (Test-Path $activateScript) {
    Write-Host "  Activating virtual environment..." -ForegroundColor Yellow
    & $activateScript
    
    Write-Host "  Installing packages from requirements.txt..." -ForegroundColor Yellow
    Set-Location python-backend
    pip install --upgrade pip | Out-Null
    pip install -r requirements.txt
    Set-Location ..
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Virtual environment activation script not found" -ForegroundColor Yellow
    Write-Host "  Please manually activate: .\python-backend\venv\Scripts\activate" -ForegroundColor Yellow
}

# Step 4: Download NLTK Data
Write-Host "`nStep 4: Downloading NLTK data..." -ForegroundColor Cyan
if (Test-Path $activateScript) {
    Set-Location python-backend
    & ".\venv\Scripts\python.exe" -c "import nltk; nltk.download('vader_lexicon', quiet=True); nltk.download('punkt', quiet=True); print('NLTK data downloaded')" 2>&1 | Out-Null
    Set-Location ..
    Write-Host "  ✓ NLTK data ready" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Skipped (activate virtual environment first)" -ForegroundColor Yellow
}

# Step 5: Verify Setup
Write-Host "`nStep 5: Verifying setup..." -ForegroundColor Cyan
$checks = @{
    "main.py" = "python-backend\main.py"
    "requirements.txt" = "python-backend\requirements.txt"
    "venv" = "python-backend\venv"
    "verify-backend.ps1" = "verify-backend.ps1"
}

$allGood = $true
foreach ($check in $checks.GetEnumerator()) {
    if (Test-Path $check.Value) {
        Write-Host "  ✓ $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Key) - NOT FOUND" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "`n⚠️ Some checks failed. Please review above." -ForegroundColor Yellow
}

# Step 6: Instructions
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "TERMINAL 1 - Start Python Backend:" -ForegroundColor Yellow
Write-Host "  cd python-backend" -ForegroundColor White
Write-Host "  .\venv\Scripts\activate" -ForegroundColor White
Write-Host "  uvicorn main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 2 - Run Tests:" -ForegroundColor Yellow
Write-Host "  .\verify-backend.ps1" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 3 - Start Frontend (optional):" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""

if ($TestOnly) {
    Write-Host "Running tests now..." -ForegroundColor Cyan
    & ".\verify-backend.ps1"
}

Write-Host "`nFor detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  - QUICK_START_TESTING.md" -ForegroundColor White
Write-Host "  - VERIFICATION_CHECKLIST.md" -ForegroundColor White
Write-Host ""


# Quick Python Backend Verification Script
# Run this after starting the Python backend

param(
    [string]$BackendUrl = "http://localhost:8000"
)

$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Python Backend Quick Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl`n"

$passed = 0
$failed = 0
$skipped = 0

function Test-Health {
    Write-Host "1. Testing Health Endpoint... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/health" -Method Get -ErrorAction Stop
        if ($response.status -eq "OK" -and $response.backend -eq "python") {
            Write-Host "✓ PASSED" -ForegroundColor Green
            Write-Host "   Status: $($response.status), Version: $($response.version), Backend: $($response.backend)"
            $script:passed++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            Write-Host "   Unexpected response: $($response | ConvertTo-Json)"
            $script:failed++
            return $false
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        Write-Host "   Make sure backend is running: uvicorn main:app --reload --port 8000"
        $script:failed++
        return $false
    }
}

function Test-AIModels {
    Write-Host "`n2. Testing AI Models Endpoint... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/ai/models" -Method Get -ErrorAction Stop
        if ($response.models) {
            Write-Host "✓ PASSED" -ForegroundColor Green
            Write-Host "   Found providers: $($response.providers.PSObject.Properties.Name -join ', ')"
            $script:passed++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            $script:failed++
            return $false
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        $script:failed++
        return $false
    }
}

function Test-Grounding {
    Write-Host "`n3. Testing Grounding Statistics... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/grounding/stats" -Method Get -ErrorAction Stop
        Write-Host "✓ PASSED" -ForegroundColor Green
        $script:passed++
        return $true
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        $script:failed++
        return $false
    }
}

function Test-Monitoring {
    Write-Host "`n4. Testing Monitoring Metrics... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/monitoring/metrics" -Method Get -ErrorAction Stop
        Write-Host "✓ PASSED" -ForegroundColor Green
        $script:passed++
        return $true
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        $script:failed++
        return $false
    }
}

function Test-JiraStatus {
    Write-Host "`n5. Testing Jira Status... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/jira/status" -Method Get -ErrorAction Stop
        Write-Host "✓ PASSED" -ForegroundColor Green
        Write-Host "   Connected: $($response.connected)"
        $script:passed++
        return $true
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        $script:failed++
        return $false
    }
}

function Test-JiraAuth {
    Write-Host "`n6. Testing Jira Auth URL... " -NoNewline
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/jira/auth" -Method Get -ErrorAction Stop
        if ($response.auth_url) {
            Write-Host "✓ PASSED" -ForegroundColor Green
            Write-Host "   Auth URL generated successfully"
            $script:passed++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            $script:failed++
            return $false
        }
    } catch {
        Write-Host "⚠ SKIPPED" -ForegroundColor Yellow
        Write-Host "   Jira not configured (this is OK if not using Jira)"
        $script:skipped++
        return $false
    }
}

function Test-FileUpload {
    Write-Host "`n7. Testing File Upload... " -NoNewline
    $testFile = "docs\demo_simple.xlsx"
    if (-not (Test-Path $testFile)) {
        Write-Host "⚠ SKIPPED" -ForegroundColor Yellow
        Write-Host "   Test file not found: $testFile"
        $script:skipped++
        return $false
    }
    
    try {
        $form = @{
            file = Get-Item $testFile
        }
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/upload" -Method Post -Form $form -ErrorAction Stop
        if ($response.tickets) {
            Write-Host "✓ PASSED" -ForegroundColor Green
            Write-Host "   Generated $($response.tickets.Count) tickets"
            $script:passed++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            Write-Host "   No tickets in response"
            $script:failed++
            return $false
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)"
        $script:failed++
        return $false
    }
}

# Run all tests
$healthOk = Test-Health
if (-not $healthOk) {
    Write-Host "`n❌ Backend is not running or not accessible!" -ForegroundColor Red
    Write-Host "`nPlease start the backend first:" -ForegroundColor Yellow
    Write-Host "  cd python-backend" -ForegroundColor White
    Write-Host "  .\venv\Scripts\activate" -ForegroundColor White
    Write-Host "  uvicorn main:app --reload --port 8000" -ForegroundColor White
    exit 1
}

Test-AIModels
Test-Grounding
Test-Monitoring
Test-JiraStatus
Test-JiraAuth
Test-FileUpload

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed:  $passed" -ForegroundColor Green
Write-Host "Failed:  $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "Skipped: $skipped" -ForegroundColor Yellow
Write-Host "Total:   $($passed + $failed + $skipped)`n"

if ($failed -eq 0) {
    Write-Host "✅ All critical tests passed!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Test frontend integration (npm run dev)" -ForegroundColor White
    Write-Host "2. Complete manual verification checklist" -ForegroundColor White
    Write-Host "3. Document results in VERIFICATION_CHECKLIST.md" -ForegroundColor White
    exit 0
} else {
    Write-Host "❌ Some tests failed. Please review errors above." -ForegroundColor Red
    exit 1
}


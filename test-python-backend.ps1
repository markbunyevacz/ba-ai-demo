# Python Backend Testing Script (PowerShell)
# Tests all Python backend endpoints to verify functionality

$ErrorActionPreference = "Stop"

$BACKEND_URL = if ($env:BACKEND_URL) { $env:BACKEND_URL } else { "http://localhost:8000" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Python Backend Verification Tests" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend URL: $BACKEND_URL"
Write-Host ""

$TESTS_PASSED = 0
$TESTS_FAILED = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [string]$Data = $null
    )
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $uri = "$BACKEND_URL$Endpoint"
        
        if ($Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $uri -Method Get -UseBasicParsing -ErrorAction Stop
        } elseif ($Method -eq "POST") {
            if ($Data) {
                $response = Invoke-WebRequest -Uri $uri -Method Post -Body $Data `
                    -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
            } else {
                $response = Invoke-WebRequest -Uri $uri -Method Post -UseBasicParsing -ErrorAction Stop
            }
        }
        
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
            Write-Host "✓ PASSED" -ForegroundColor Green " (HTTP $($response.StatusCode))"
            $script:TESTS_PASSED++
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red " (HTTP $($response.StatusCode))"
            $script:TESTS_FAILED++
            return $false
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red " ($($_.Exception.Message))"
        $script:TESTS_FAILED++
        return $false
    }
}

# Check if backend is running
Write-Host "Checking if backend is running..."
try {
    $healthCheck = Invoke-WebRequest -Uri "$BACKEND_URL/api/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "Backend is running" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Backend is not running at $BACKEND_URL" -ForegroundColor Red
    Write-Host "Please start the backend:"
    Write-Host "  cd python-backend"
    Write-Host "  .\venv\Scripts\activate"
    Write-Host "  uvicorn main:app --reload --port 8000"
    exit 1
}
Write-Host ""

# Run tests
Test-Endpoint "Health Check" "GET" "/api/health"
Test-Endpoint "AI Models Endpoint" "GET" "/api/ai/models"
Test-Endpoint "Grounding Statistics" "GET" "/api/grounding/stats"
Test-Endpoint "Monitoring Metrics" "GET" "/api/monitoring/metrics"
Test-Endpoint "Jira Status" "GET" "/api/jira/status"
Test-Endpoint "Jira Auth URL" "GET" "/api/jira/auth"
Test-Endpoint "Compliance Validation" "POST" "/api/compliance/validate" `
    '{"tickets":[{"id":"TEST-1","summary":"Test"}],"standards":["pmi"]}'
Test-Endpoint "Diagram Generation" "POST" "/api/diagrams/generate" `
    '{"tickets":[{"id":"TEST-1","summary":"Test"}],"type":"bpmn","formats":["svg"]}'

# Test file upload if file exists
$testFile = "docs/demo_simple.xlsx"
if (Test-Path $testFile) {
    Write-Host "Testing File Upload... " -NoNewline
    try {
        $form = @{
            file = Get-Item $testFile
        }
        $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/upload" -Method Post `
            -Form $form -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ PASSED" -ForegroundColor Green " (HTTP $($response.StatusCode))"
            $TESTS_PASSED++
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red " (HTTP $($response.StatusCode))"
            $TESTS_FAILED++
        }
    } catch {
        Write-Host "✗ FAILED" -ForegroundColor Red " ($($_.Exception.Message))"
        $TESTS_FAILED++
    }
} else {
    Write-Host "⚠ SKIPPED" -ForegroundColor Yellow " File Upload (test file not found)"
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Passed: $TESTS_PASSED" -ForegroundColor Green
Write-Host "Failed: $TESTS_FAILED" -ForegroundColor Red
Write-Host "Total: $($TESTS_PASSED + $TESTS_FAILED)"

if ($TESTS_FAILED -eq 0) {
    Write-Host ""
    Write-Host "✓ All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "✗ Some tests failed" -ForegroundColor Red
    exit 1
}


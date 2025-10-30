#!/bin/bash
# Python Backend Testing Script
# Tests all Python backend endpoints to verify functionality

set -e  # Exit on error

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Python Backend Verification Tests"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL$endpoint" || echo "ERROR\n000")
    elif [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" || echo "ERROR\n000")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL$endpoint" || echo "ERROR\n000")
        fi
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "  Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Check if backend is running
echo "Checking if backend is running..."
if ! curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Backend is not running at $BACKEND_URL${NC}"
    echo "Please start the backend:"
    echo "  cd python-backend"
    echo "  source venv/bin/activate"
    echo "  uvicorn main:app --reload --port 8000"
    exit 1
fi
echo -e "${GREEN}Backend is running${NC}"
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/api/health"

# Test 2: AI Models
test_endpoint "AI Models Endpoint" "GET" "/api/ai/models"

# Test 3: Grounding Stats
test_endpoint "Grounding Statistics" "GET" "/api/grounding/stats"

# Test 4: Monitoring Metrics
test_endpoint "Monitoring Metrics" "GET" "/api/monitoring/metrics"

# Test 5: Jira Status
test_endpoint "Jira Status" "GET" "/api/jira/status"

# Test 6: Jira Auth URL
test_endpoint "Jira Auth URL" "GET" "/api/jira/auth"

# Test 7: Compliance Validation
test_endpoint "Compliance Validation" "POST" "/api/compliance/validate" \
    '{"tickets":[{"id":"TEST-1","summary":"Test"}],"standards":["pmi"]}'

# Test 8: Diagram Generation
test_endpoint "Diagram Generation" "POST" "/api/diagrams/generate" \
    '{"tickets":[{"id":"TEST-1","summary":"Test"}],"type":"bpmn","formats":["svg"]}'

# Test 9: File Upload (if test file exists)
if [ -f "docs/demo_simple.xlsx" ]; then
    echo -n "Testing File Upload... "
    upload_response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/upload" \
        -F "file=@docs/demo_simple.xlsx" || echo "ERROR\n000")
    upload_code=$(echo "$upload_response" | tail -n1)
    if [ "$upload_code" = "200" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $upload_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $upload_code)"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} File Upload (test file not found)"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "Total: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi


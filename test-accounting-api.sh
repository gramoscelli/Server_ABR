#!/bin/bash

# Test script for Accounting API
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
PASSED=0
FAILED=0

echo "=== ACCOUNTING API TEST SUITE ==="
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local token=$5

    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$data" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Authorization: Bearer $token" 2>&1)
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" 2>&1)
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" 2>&1)
        fi
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗${NC} $name (HTTP $http_code)"
        echo "  Response: $body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Step 1: Get CSRF Token
echo "1. Getting CSRF token..."
csrf_response=$(curl -s "$API_URL/api/csrf-token")
CSRF_TOKEN=$(echo $csrf_response | grep -o '"csrfToken":"[^"]*' | sed 's/"csrfToken":"//')

if [ -n "$CSRF_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Got CSRF token"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Failed to get CSRF token"
    FAILED=$((FAILED + 1))
    echo "Response: $csrf_response"
    exit 1
fi

# Step 2: Create test user
echo ""
echo "2. Creating test user..."
TIMESTAMP=$(date +%s)
USERNAME="test_acc_$TIMESTAMP"
EMAIL="test_acc_$TIMESTAMP@test.com"
PASSWORD="TestPass123!"

register_data=$(cat <<EOF
{
  "username": "$USERNAME",
  "email": "$EMAIL",
  "password": "$PASSWORD",
  "role": "root",
  "csrfToken": "$CSRF_TOKEN"
}
EOF
)

register_response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "$register_data")

register_code=$(echo "$register_response" | tail -n1)
if [ "$register_code" -ge 200 ] && [ "$register_code" -lt 300 ]; then
    echo -e "${GREEN}✓${NC} Created test user: $USERNAME"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Failed to create user (HTTP $register_code)"
    echo "$register_response" | sed '$d'
    FAILED=$((FAILED + 1))
fi

# Step 3: Login
echo ""
echo "3. Logging in..."
login_data=$(cat <<EOF
{
  "username": "$USERNAME",
  "password": "$PASSWORD",
  "csrfToken": "$CSRF_TOKEN"
}
EOF
)

login_response=$(curl -s -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "$login_data")

ACCESS_TOKEN=$(echo $login_response | grep -o '"accessToken":"[^"]*' | sed 's/"accessToken":"//')

if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Logged in successfully"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Failed to login"
    echo "Response: $login_response"
    FAILED=$((FAILED + 1))
    exit 1
fi

# Step 4-11: Test accounting endpoints
echo ""
echo "4. Testing Accounting endpoints..."

# Test accounts
echo ""
echo "  4.1. Get accounts..."
test_endpoint "Get accounts" "GET" "/api/accounting/accounts" "" "$ACCESS_TOKEN"

# Test expense categories
echo ""
echo "  4.2. Get expense categories..."
test_endpoint "Get expense categories" "GET" "/api/accounting/expense-categories" "" "$ACCESS_TOKEN"

# Test income categories
echo ""
echo "  4.3. Get income categories..."
test_endpoint "Get income categories" "GET" "/api/accounting/income-categories" "" "$ACCESS_TOKEN"

# Test transfer types
echo ""
echo "  4.4. Get transfer types..."
test_endpoint "Get transfer types" "GET" "/api/accounting/transfer-types" "" "$ACCESS_TOKEN"

# Test expenses
echo ""
echo "  4.5. Get expenses..."
test_endpoint "Get expenses" "GET" "/api/accounting/expenses" "" "$ACCESS_TOKEN"

# Test incomes
echo ""
echo "  4.6. Get incomes..."
test_endpoint "Get incomes" "GET" "/api/accounting/incomes" "" "$ACCESS_TOKEN"

# Test transfers
echo ""
echo "  4.7. Get transfers..."
test_endpoint "Get transfers" "GET" "/api/accounting/transfers" "" "$ACCESS_TOKEN"

# Test dashboard - THIS IS THE KEY ONE
echo ""
echo "  4.8. Get dashboard..."
echo -e "${YELLOW}>>> DASHBOARD DATA (for debugging NaN issue):${NC}"
dashboard_response=$(curl -s -X GET "$API_URL/api/accounting/dashboard" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$dashboard_response" | python3 -m json.tool 2>/dev/null || echo "$dashboard_response"

if echo "$dashboard_response" | grep -q "success"; then
    echo -e "${GREEN}✓${NC} Get dashboard"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Get dashboard"
    FAILED=$((FAILED + 1))
fi

# Test expense stats by category
echo ""
echo "  4.9. Get expense stats by category..."
test_endpoint "Get expense stats by category" "GET" "/api/accounting/expenses/stats/by-category" "" "$ACCESS_TOKEN"

# Summary
echo ""
echo "=== TEST SUMMARY ==="
echo "Total tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi

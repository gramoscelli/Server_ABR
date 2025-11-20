#!/bin/bash

# Verification Script for 3NF Role-Based Access Control System
# Tests all major features of the migrated RBAC system

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║  3NF RBAC System Verification                          ║"
echo "║  Testing: http://localhost:3000                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

API_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to print test result
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAILED++))
  fi
}

# Test 1: Check database schema
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TEST 1: Database Schema (3NF)${NC}"
echo -e "${BLUE}========================================${NC}"

TABLES=$(docker exec mysql mysql -uroot -pabr2005 -N -e "USE abr; SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='abr' AND table_name IN ('roles', 'resources', 'role_permissions');" 2>&1 | grep -v Warning)

if [ "$TABLES" -eq 3 ]; then
  test_result 0 "All 3NF tables exist (roles, resources, role_permissions)"
else
  test_result 1 "Missing 3NF tables (expected 3, found $TABLES)"
fi

# Test 2: Check permissions column removed
PERM_COL=$(docker exec mysql mysql -uroot -pabr2005 -N -e "USE abr; SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='abr' AND table_name='roles' AND column_name='permissions';" 2>&1 | grep -v Warning)

if [ "$PERM_COL" -eq 0 ]; then
  test_result 0 "Redundant permissions JSON column removed"
else
  test_result 1 "Permissions JSON column still exists (should be removed)"
fi

# Test 3: Check role count
ROLE_COUNT=$(docker exec mysql mysql -uroot -pabr2005 -N -e "USE abr; SELECT COUNT(*) FROM roles;" 2>&1 | grep -v Warning)

if [ "$ROLE_COUNT" -eq 6 ]; then
  test_result 0 "All 6 roles exist (root, library_employee, readonly, printer, new_user, admin_employee)"
else
  test_result 1 "Expected 6 roles, found $ROLE_COUNT"
fi

# Test 4: Check root role renamed
ROOT_EXISTS=$(docker exec mysql mysql -uroot -pabr2005 -N -e "USE abr; SELECT COUNT(*) FROM roles WHERE name='root';" 2>&1 | grep -v Warning)

if [ "$ROOT_EXISTS" -eq 1 ]; then
  test_result 0 "Role 'admin' renamed to 'root'"
else
  test_result 1 "Role 'root' not found (admin→root rename failed)"
fi

# Test 5: Check library_associateds resource
LIB_RESOURCE=$(docker exec mysql mysql -uroot -pabr2005 -N -e "USE abr; SELECT COUNT(*) FROM resources WHERE name='library_associateds';" 2>&1 | grep -v Warning)

if [ "$LIB_RESOURCE" -eq 1 ]; then
  test_result 0 "Unified 'library_associateds' resource exists"
else
  test_result 1 "library_associateds resource not found"
fi

# Test 6: Server health check
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TEST 2: Server Health${NC}"
echo -e "${BLUE}========================================${NC}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/csrf-token)

if [ "$HTTP_CODE" -eq 200 ]; then
  test_result 0 "Server responding to requests (HTTP 200)"
else
  test_result 1 "Server not responding correctly (HTTP $HTTP_CODE)"
fi

# Test 7: CSRF token generation
CSRF_RESPONSE=$(curl -s $API_URL/api/csrf-token)
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

if [ ! -z "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
  test_result 0 "CSRF token generation working"
else
  test_result 1 "CSRF token generation failed"
fi

# Test 8: Strong password validation (weak password should fail)
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TEST 3: Password Validation${NC}"
echo -e "${BLUE}========================================${NC}"

CSRF=$(curl -s $API_URL/api/csrf-token | jq -r '.csrfToken')
WEAK_PASS_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username": "weakuser123", "password": "weak", "email": "weak@test.com"}')

WEAK_ERROR=$(echo "$WEAK_PASS_RESPONSE" | jq -r '.error')

if [ "$WEAK_ERROR" == "Weak password" ]; then
  test_result 0 "Weak password correctly rejected"
else
  test_result 1 "Weak password not rejected properly"
fi

# Test 9: Strong password validation (strong password should work)
CSRF=$(curl -s $API_URL/api/csrf-token | jq -r '.csrfToken')
UNIQUE_USER="stronguser_$(date +%s)"
STRONG_PASS_RESPONSE=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"username\": \"$UNIQUE_USER\", \"password\": \"Strong@123\", \"email\": \"strong@test.com\"}")

STRONG_MESSAGE=$(echo "$STRONG_PASS_RESPONSE" | jq -r '.message')

if [ "$STRONG_MESSAGE" == "User created successfully" ]; then
  test_result 0 "Strong password accepted"
else
  test_result 1 "Strong password rejected (should be accepted)"
fi

# Test 10: New user gets new_user role
CSRF=$(curl -s $API_URL/api/csrf-token | jq -r '.csrfToken')
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"username\": \"$UNIQUE_USER\", \"password\": \"Strong@123\"}")

USER_ROLE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.role')

if [ "$USER_ROLE" == "new_user" ]; then
  test_result 0 "New registrations get 'new_user' role (no permissions)"
else
  test_result 1 "New user got role '$USER_ROLE' instead of 'new_user'"
fi

# Test 11: Printer role login and permissions
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TEST 4: Role Permissions (3NF)${NC}"
echo -e "${BLUE}========================================${NC}"

CSRF=$(curl -s $API_URL/api/csrf-token | jq -r '.csrfToken')
PRINTER_LOGIN=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username": "printer_client", "password": "printer123"}')

PRINTER_TOKEN=$(echo "$PRINTER_LOGIN" | jq -r '.accessToken')
PRINTER_ROLE=$(echo "$PRINTER_LOGIN" | jq -r '.user.role')

if [ "$PRINTER_ROLE" == "printer" ]; then
  test_result 0 "Printer role login successful"
else
  test_result 1 "Printer role login failed or wrong role"
fi

# Test 12: Printer can access library_associateds (read permission)
if [ ! -z "$PRINTER_TOKEN" ] && [ "$PRINTER_TOKEN" != "null" ]; then
  TIRADA_RESPONSE=$(curl -s $API_URL/api/tirada/start/1/end/5 \
    -H "Authorization: Bearer $PRINTER_TOKEN")

  TIRADA_ERROR=$(echo "$TIRADA_RESPONSE" | jq -r '.error')

  if [ "$TIRADA_ERROR" == "null" ]; then
    test_result 0 "Printer role can read library_associateds (tirada endpoint)"
  else
    test_result 1 "Printer role denied access to tirada endpoint"
  fi
fi

# Test 13: Check library_employee = printer permissions
LIBRARY_EMP_PERMS=$(docker exec mysql mysql -uroot -pabr2005 -N -e "
  USE abr;
  SELECT rp.actions
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  JOIN resources res ON rp.resource_id = res.id
  WHERE r.name='library_employee' AND res.name='library_associateds';
" 2>&1 | grep -v Warning)

PRINTER_PERMS=$(docker exec mysql mysql -uroot -pabr2005 -N -e "
  USE abr;
  SELECT rp.actions
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  JOIN resources res ON rp.resource_id = res.id
  WHERE r.name='printer' AND res.name='library_associateds';
" 2>&1 | grep -v Warning)

if [ "$LIBRARY_EMP_PERMS" == "$PRINTER_PERMS" ]; then
  test_result 0 "library_employee and printer have identical permissions"
else
  test_result 1 "library_employee and printer permissions differ"
fi

# Test 14: Check readonly role permissions
READONLY_PERMS=$(docker exec mysql mysql -uroot -pabr2005 -N -e "
  USE abr;
  SELECT COUNT(*)
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  WHERE r.name='readonly' AND rp.actions LIKE '%read%';
" 2>&1 | grep -v Warning)

if [ "$READONLY_PERMS" -eq 3 ]; then
  test_result 0 "Readonly role has read-only permissions (users, roles, library_associateds)"
else
  test_result 1 "Readonly role permissions incorrect (expected 3, found $READONLY_PERMS)"
fi

# Test 15: Check root wildcard permission
ROOT_WILDCARD=$(docker exec mysql mysql -uroot -pabr2005 -N -e "
  USE abr;
  SELECT COUNT(*)
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  JOIN resources res ON rp.resource_id = res.id
  WHERE r.name='root' AND res.name='*' AND rp.actions='[\"*\"]';
" 2>&1 | grep -v Warning)

if [ "$ROOT_WILDCARD" -eq 1 ]; then
  test_result 0 "Root role has wildcard permission (*:[\"*\"])"
else
  test_result 1 "Root role wildcard permission not found"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}   ALL TESTS PASSED ✓${NC}"
  echo -e "${GREEN}   3NF Migration Complete${NC}"
  echo -e "${GREEN}========================================${NC}"
  exit 0
else
  echo -e "${YELLOW}========================================${NC}"
  echo -e "${YELLOW}   SOME TESTS FAILED${NC}"
  echo -e "${YELLOW}========================================${NC}"
  exit 1
fi

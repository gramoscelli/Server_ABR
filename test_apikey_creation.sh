#!/bin/bash

# Test API Key Creation
# This script tests if the api_keys table fix allows creating API keys without user_id

echo "=== API Key Creation Test ==="

# Get CSRF token
echo "1. Getting CSRF token..."
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r ".csrfToken")
echo "   CSRF: $CSRF"

# Login as test_user (library_employee - role_id 2)
echo ""
echo "2. Logging in as test_user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username": "test_user", "password": "Test123456!"}')

echo "$LOGIN_RESPONSE" | jq .
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r ".accessToken // .token // empty")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo ""
  echo "❌ ERROR: Failed to get token"
  echo "Trying with gustavoramoscelli (root)..."

  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF" \
    -d '{"username": "gustavoramoscelli", "password": "password123"}')

  echo "$LOGIN_RESPONSE" | jq .
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r ".accessToken // .token // empty")

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ ERROR: Still failed to get token. Exiting."
    exit 1
  fi
fi

echo ""
echo "✓ Token obtained: ${TOKEN:0:50}..."

# Create API key without user_id
echo ""
echo "3. Creating API key without user_id..."
API_KEY_RESPONSE=$(curl -s -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"name": "Servicio de Backups Test", "expiresAt": "2025-12-31T23:59:59Z"}')

echo "$API_KEY_RESPONSE" | jq .

# Check if successful
if echo "$API_KEY_RESPONSE" | jq -e '.apiKey' > /dev/null 2>&1; then
  echo ""
  echo "✅ SUCCESS: API key created successfully!"
  echo "   API Key: $(echo "$API_KEY_RESPONSE" | jq -r '.apiKey')"
else
  echo ""
  echo "❌ ERROR: Failed to create API key"
  echo "   Error: $(echo "$API_KEY_RESPONSE" | jq -r '.error // .message')"
fi

echo ""
echo "4. Listing all API keys..."
LIST_RESPONSE=$(curl -s -X GET http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer $TOKEN")

echo "$LIST_RESPONSE" | jq .

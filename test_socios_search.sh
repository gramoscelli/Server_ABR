#!/bin/bash

# Test script para el endpoint de búsqueda de socios
API_URL="http://localhost:3000"

echo "======================================"
echo "Test: Búsqueda de Socios"
echo "======================================"
echo ""

# Step 1: Obtener CSRF token
echo "1. Obteniendo CSRF token..."
CSRF_RESPONSE=$(curl -s -c cookies.txt "${API_URL}/api/csrf-token")
CSRF_TOKEN=$(echo $CSRF_RESPONSE | jq -r '.csrfToken')
echo "   CSRF Token: ${CSRF_TOKEN:0:20}..."
echo ""

# Step 2: Login para obtener JWT (usar test_user)
echo "2. Iniciando sesión con test_user..."
LOGIN_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt \
  -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ${CSRF_TOKEN}" \
  -d '{"username":"test_user","password":"Test123456!"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "   ❌ ERROR: No se pudo obtener el access token"
  echo "   Response: $LOGIN_RESPONSE"
  echo ""
  echo "   Nota: Asegúrate de que el usuario test_user existe."
  echo "   Ejecuta: docker compose exec app node scripts/create_test_user.js"
  rm -f cookies.txt
  exit 1
fi

echo "   ✅ Access Token obtenido: ${ACCESS_TOKEN:0:30}..."
echo ""

# Step 3: Probar búsqueda de socios
echo "3. Probando búsqueda de socios con término 'm'..."
SEARCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${API_URL}/api/socios/search?q=m&limit=20" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$SEARCH_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | sed '/HTTP_STATUS/d')

echo "   HTTP Status: $HTTP_STATUS"
echo "   Response:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ TEST PASSED: Búsqueda exitosa"
  TOTAL=$(echo "$RESPONSE_BODY" | jq -r '.total // 0')
  echo "   Total de resultados: $TOTAL"
  
  # Mostrar primeros resultados
  if [ "$TOTAL" -gt 0 ]; then
    echo ""
    echo "   Primeros resultados:"
    echo "$RESPONSE_BODY" | jq -r '.data[0:3] | .[] | "   - \(.So_Apellido), \(.So_Nombre) (ID: \(.So_ID))"' 2>/dev/null
  fi
else
  echo "❌ TEST FAILED: Status code $HTTP_STATUS"
  
  # Diagnosticar el error
  if [ "$HTTP_STATUS" = "401" ]; then
    echo ""
    echo "Diagnóstico 401 Unauthorized:"
    echo "   - El token JWT no es válido o expiró"
    echo "   - El middleware authenticateToken rechazó la petición"
    echo "   - Verificar que el header Authorization esté presente"
  fi
fi

# Cleanup
rm -f cookies.txt

echo ""
echo "======================================"

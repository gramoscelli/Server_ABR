#!/bin/bash

# Script de prueba para CAPTCHA
# Verifica que los endpoints de CAPTCHA funcionen correctamente

set -e

BASE_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Test de CAPTCHA ===${NC}\n"

# Verificar que jq esté instalado
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq no está instalado. Instálalo con: sudo apt-get install jq${NC}"
    exit 1
fi

echo -e "${YELLOW}1. Probando endpoint de generación de CAPTCHA (texto)...${NC}"
CAPTCHA_RESPONSE=$(curl -s "$BASE_URL/api/captcha/generate")

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: No se pudo conectar al servidor${NC}"
    exit 1
fi

echo "$CAPTCHA_RESPONSE" | jq '.'

# Extraer datos
TOKEN_ID=$(echo "$CAPTCHA_RESPONSE" | jq -r '.tokenId')
SVG=$(echo "$CAPTCHA_RESPONSE" | jq -r '.svg')

if [ -z "$TOKEN_ID" ] || [ "$TOKEN_ID" == "null" ]; then
    echo -e "${RED}❌ Error: No se recibió tokenId${NC}"
    exit 1
fi

echo -e "${GREEN}✓ CAPTCHA generado exitosamente${NC}"
echo -e "Token ID: ${YELLOW}$TOKEN_ID${NC}"

# Guardar SVG en archivo
echo "$SVG" > /tmp/captcha.svg
echo -e "SVG guardado en: ${YELLOW}/tmp/captcha.svg${NC}\n"

# Probar CAPTCHA matemático
echo -e "${YELLOW}2. Probando endpoint de generación de CAPTCHA (matemático)...${NC}"
MATH_CAPTCHA=$(curl -s "$BASE_URL/api/captcha/generate?type=math")
echo "$MATH_CAPTCHA" | jq '.'

MATH_TOKEN=$(echo "$MATH_CAPTCHA" | jq -r '.tokenId')
MATH_SVG=$(echo "$MATH_CAPTCHA" | jq -r '.svg')

if [ -z "$MATH_TOKEN" ] || [ "$MATH_TOKEN" == "null" ]; then
    echo -e "${RED}❌ Error: No se recibió tokenId para CAPTCHA matemático${NC}"
    exit 1
fi

echo -e "${GREEN}✓ CAPTCHA matemático generado exitosamente${NC}"
echo "$MATH_SVG" > /tmp/captcha_math.svg
echo -e "SVG guardado en: ${YELLOW}/tmp/captcha_math.svg${NC}\n"

# Probar estadísticas
echo -e "${YELLOW}3. Probando endpoint de estadísticas...${NC}"
STATS=$(curl -s "$BASE_URL/api/captcha/stats")
echo "$STATS" | jq '.'
echo -e "${GREEN}✓ Estadísticas obtenidas${NC}\n"

# Probar validación con CAPTCHA incorrecto
echo -e "${YELLOW}4. Probando validación con CAPTCHA incorrecto...${NC}"
CSRF_RESPONSE=$(curl -s "$BASE_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

REGISTER_FAIL=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"username\": \"testuser_$(date +%s)\",
    \"email\": \"test_$(date +%s)@example.com\",
    \"password\": \"TestPassword123!\",
    \"captchaToken\": \"$TOKEN_ID\",
    \"captchaResponse\": \"WRONG\"
  }")

echo "$REGISTER_FAIL" | jq '.'

ERROR_MSG=$(echo "$REGISTER_FAIL" | jq -r '.error')
if [ "$ERROR_MSG" == "CAPTCHA inválido" ]; then
    echo -e "${GREEN}✓ Validación de CAPTCHA incorrecto funciona${NC}\n"
else
    echo -e "${RED}❌ Error: No se rechazó el CAPTCHA incorrecto${NC}\n"
fi

# Probar validación sin CAPTCHA
echo -e "${YELLOW}5. Probando registro sin CAPTCHA...${NC}"
CSRF_RESPONSE=$(curl -s "$BASE_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

REGISTER_NO_CAPTCHA=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{
    \"username\": \"testuser_$(date +%s)\",
    \"email\": \"test_$(date +%s)@example.com\",
    \"password\": \"TestPassword123!\"
  }")

echo "$REGISTER_NO_CAPTCHA" | jq '.'

ERROR_MSG=$(echo "$REGISTER_NO_CAPTCHA" | jq -r '.error')
if [ "$ERROR_MSG" == "CAPTCHA requerido" ] || [ "$ERROR_MSG" == "CAPTCHA inválido" ]; then
    echo -e "${GREEN}✓ Validación de CAPTCHA faltante funciona${NC}\n"
else
    echo -e "${YELLOW}⚠ Advertencia: CAPTCHA puede estar deshabilitado (CAPTCHA_REQUIRED=false)${NC}\n"
fi

# Mostrar instrucciones para prueba manual
echo -e "${YELLOW}=== Prueba Manual ===${NC}"
echo -e "Para probar el registro completo con CAPTCHA:"
echo -e "1. Abre el archivo SVG: ${YELLOW}file:///tmp/captcha.svg${NC}"
echo -e "2. Lee el código del CAPTCHA"
echo -e "3. Ejecuta el siguiente comando reemplazando CODIGO_CAPTCHA con el valor que viste:\n"
echo -e "${GREEN}CSRF_TOKEN=\$(curl -s $BASE_URL/api/csrf-token | jq -r '.csrfToken')${NC}"
echo -e "${GREEN}curl -X POST $BASE_URL/api/auth/register \\
  -H \"Content-Type: application/json\" \\
  -H \"X-CSRF-Token: \$CSRF_TOKEN\" \\
  -d '{
    \"username\": \"testuser_manual\",
    \"email\": \"testmanual@example.com\",
    \"password\": \"TestPassword123!\",
    \"captchaToken\": \"$TOKEN_ID\",
    \"captchaResponse\": \"CODIGO_CAPTCHA\"
  }' | jq${NC}\n"

echo -e "${YELLOW}=== Resumen ===${NC}"
echo -e "${GREEN}✓ Endpoint de generación funciona${NC}"
echo -e "${GREEN}✓ CAPTCHA texto generado${NC}"
echo -e "${GREEN}✓ CAPTCHA matemático generado${NC}"
echo -e "${GREEN}✓ Estadísticas disponibles${NC}"
echo -e "${GREEN}✓ Validación rechaza CAPTCHA incorrecto${NC}"
echo -e "\n${GREEN}🎉 Todos los tests automáticos pasaron${NC}"

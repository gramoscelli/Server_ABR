#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_URL="http://localhost:3000/api"
MYSQL_CONTAINER="server_abr-db-1"
APP_CONTAINER="server_abr-app-1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Script - Accounting System${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Paso 1: Generar hash de contraseña
echo -e "${YELLOW}[1/11] Generando hash de contraseña...${NC}"

PASSWORD_HASH=$(docker exec -i $APP_CONTAINER node -e "
const bcrypt = require('bcryptjs');
const password = 'Test123!';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
")

if [ -z "$PASSWORD_HASH" ]; then
    echo -e "${RED}✗ Error al generar hash${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Hash generado${NC}\n"

# Paso 2: Crear usuario de prueba directamente en MySQL
echo -e "${YELLOW}[2/11] Creando usuario de prueba en MySQL...${NC}"

docker exec -i $MYSQL_CONTAINER mysql -uroot -proot_password abr <<EOF
-- Eliminar usuario si existe
DELETE FROM users WHERE username = 'testuser';

-- Crear usuario de prueba
INSERT INTO users (username, password_hash, email, role, is_active, created_at, updated_at)
VALUES (
  'testuser',
  '$PASSWORD_HASH',
  'test@example.com',
  'root',
  1,
  NOW(),
  NOW()
);

SELECT id, username, role FROM users WHERE username = 'testuser';
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Usuario creado exitosamente${NC}\n"
else
    echo -e "${RED}✗ Error al crear usuario${NC}\n"
    exit 1
fi

# Paso 3: Login y obtener token
echo -e "${YELLOW}[3/11] Obteniendo token de autenticación...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}' \
  $API_URL/auth/login)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Error al obtener token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Token obtenido: ${TOKEN:0:20}...${NC}\n"

# Función helper para hacer peticiones
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${YELLOW}${description}${NC}"

    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
          -X GET \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          "${API_URL}${endpoint}")
    else
        RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
          -X $method \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d "$data" \
          "${API_URL}${endpoint}")
    fi

    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
        echo -e "${GREEN}✓ Success (HTTP $HTTP_STATUS)${NC}"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
        echo -e "${RED}✗ Failed (HTTP $HTTP_STATUS)${NC}"
        echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    fi
    echo ""
}

# Paso 4: Crear cuenta de efectivo
echo -e "${YELLOW}[4/11] Creando cuenta de efectivo...${NC}"
ACCOUNT_DATA='{
  "name": "Caja Principal",
  "type": "cash",
  "currency": "ARS",
  "initial_balance": 10000,
  "description": "Cuenta de efectivo principal"
}'

ACCOUNT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ACCOUNT_DATA" \
  "${API_URL}/accounting/accounts")

HTTP_STATUS=$(echo "$ACCOUNT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$ACCOUNT_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Cuenta creada (HTTP $HTTP_STATUS)${NC}"
    ACCOUNT_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Account ID: $ACCOUNT_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear cuenta (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
    exit 1
fi
echo ""

# Paso 5: Crear segunda cuenta para transferencias
echo -e "${YELLOW}[5/11] Creando segunda cuenta (banco)...${NC}"
BANK_ACCOUNT_DATA='{
  "name": "Banco Nación",
  "type": "bank",
  "currency": "ARS",
  "initial_balance": 50000,
  "description": "Cuenta bancaria"
}'

BANK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BANK_ACCOUNT_DATA" \
  "${API_URL}/accounting/accounts")

HTTP_STATUS=$(echo "$BANK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$BANK_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Cuenta bancaria creada (HTTP $HTTP_STATUS)${NC}"
    BANK_ACCOUNT_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Bank Account ID: $BANK_ACCOUNT_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear cuenta bancaria (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 6: Crear categoría de egreso
echo -e "${YELLOW}[6/11] Creando categoría de egreso...${NC}"
EXPENSE_CAT_DATA='{
  "name": "Gastos Operativos",
  "description": "Gastos del día a día",
  "color": "#FF5733"
}'

EXP_CAT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$EXPENSE_CAT_DATA" \
  "${API_URL}/accounting/expense-categories")

HTTP_STATUS=$(echo "$EXP_CAT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$EXP_CAT_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Categoría de egreso creada (HTTP $HTTP_STATUS)${NC}"
    EXPENSE_CAT_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Category ID: $EXPENSE_CAT_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear categoría (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 7: Crear categoría de ingreso
echo -e "${YELLOW}[7/11] Creando categoría de ingreso...${NC}"
INCOME_CAT_DATA='{
  "name": "Ventas",
  "description": "Ingresos por ventas",
  "color": "#28A745"
}'

INC_CAT_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INCOME_CAT_DATA" \
  "${API_URL}/accounting/income-categories")

HTTP_STATUS=$(echo "$INC_CAT_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$INC_CAT_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Categoría de ingreso creada (HTTP $HTTP_STATUS)${NC}"
    INCOME_CAT_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Category ID: $INCOME_CAT_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear categoría (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 8: Crear egreso
echo -e "${YELLOW}[8/11] Creando egreso...${NC}"
EXPENSE_DATA="{
  \"amount\": 1500.50,
  \"account_id\": $ACCOUNT_ID,
  \"category_id\": $EXPENSE_CAT_ID,
  \"date\": \"$(date +%Y-%m-%d)\",
  \"description\": \"Compra de materiales\"
}"

echo "Datos a enviar: $EXPENSE_DATA"

EXPENSE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$EXPENSE_DATA" \
  "${API_URL}/accounting/expenses")

HTTP_STATUS=$(echo "$EXPENSE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$EXPENSE_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Egreso creado (HTTP $HTTP_STATUS)${NC}"
    EXPENSE_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Expense ID: $EXPENSE_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear egreso (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 9: Crear ingreso
echo -e "${YELLOW}[9/11] Creando ingreso...${NC}"
INCOME_DATA="{
  \"amount\": 5000.00,
  \"account_id\": $ACCOUNT_ID,
  \"category_id\": $INCOME_CAT_ID,
  \"date\": \"$(date +%Y-%m-%d)\",
  \"description\": \"Venta de productos\"
}"

echo "Datos a enviar: $INCOME_DATA"

INCOME_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INCOME_DATA" \
  "${API_URL}/accounting/incomes")

HTTP_STATUS=$(echo "$INCOME_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$INCOME_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Ingreso creado (HTTP $HTTP_STATUS)${NC}"
    INCOME_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Income ID: $INCOME_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear ingreso (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 10: Crear transferencia
echo -e "${YELLOW}[10/11] Creando transferencia...${NC}"
TRANSFER_DATA="{
  \"amount\": 2000.00,
  \"from_account_id\": $ACCOUNT_ID,
  \"to_account_id\": $BANK_ACCOUNT_ID,
  \"date\": \"$(date +%Y-%m-%d)\",
  \"description\": \"Depósito en banco\"
}"

echo "Datos a enviar: $TRANSFER_DATA"

TRANSFER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TRANSFER_DATA" \
  "${API_URL}/accounting/transfers")

HTTP_STATUS=$(echo "$TRANSFER_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$TRANSFER_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Transferencia creada (HTTP $HTTP_STATUS)${NC}"
    TRANSFER_ID=$(echo "$BODY" | jq -r '.data.id' 2>/dev/null)
    echo "Transfer ID: $TRANSFER_ID"
    echo "$BODY" | jq '.' 2>/dev/null
else
    echo -e "${RED}✗ Error al crear transferencia (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Paso 11: Obtener dashboard
echo -e "${YELLOW}[11/11] Obteniendo dashboard...${NC}"

DASHBOARD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "${API_URL}/accounting/dashboard")

HTTP_STATUS=$(echo "$DASHBOARD_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$DASHBOARD_RESPONSE" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
    echo -e "${GREEN}✓ Dashboard obtenido (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ Error al obtener dashboard (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi
echo ""

# Resumen final
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumen de resultados${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Usuario:        testuser"
echo -e "Cuenta Caja:    ID $ACCOUNT_ID"
echo -e "Cuenta Banco:   ID $BANK_ACCOUNT_ID"
echo -e "Cat. Egreso:    ID $EXPENSE_CAT_ID"
echo -e "Cat. Ingreso:   ID $INCOME_CAT_ID"
echo -e "Egreso creado:  ID ${EXPENSE_ID:-'FAILED'}"
echo -e "Ingreso creado: ID ${INCOME_ID:-'FAILED'}"
echo -e "Transfer creada: ID ${TRANSFER_ID:-'FAILED'}"
echo ""
echo -e "${GREEN}Test completado!${NC}"

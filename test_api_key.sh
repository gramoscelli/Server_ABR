#!/bin/bash
#
# Script de Verificación de Claves API
#
# Verifica el funcionamiento de una clave API y muestra:
# - Estado de la clave (activa/inactiva/expirada)
# - Información de la clave
# - Alcance y permisos disponibles
# - Test de endpoints accesibles
#
# Uso:
#   ./test_api_key.sh <API_KEY>
#   ./test_api_key.sh                 # Modo interactivo
#   API_KEY=tu_clave ./test_api_key.sh
#
# Opciones:
#   -h, --host     Host del servidor (default: localhost)
#   -p, --port     Puerto del servidor (default: 3000)
#   -v, --verbose  Mostrar respuestas completas
#

set -e

# Configuración por defecto
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-3000}"
VERBOSE=false
BASE_URL="http://${API_HOST}:${API_PORT}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Contadores
ACCESSIBLE=0
RESTRICTED=0
ERRORS=0

# Función para mostrar ayuda
show_help() {
    echo ""
    echo "Uso: ./test_api_key.sh [opciones] <API_KEY>"
    echo ""
    echo "Opciones:"
    echo "  -h, --host <host>   Host del servidor (default: localhost)"
    echo "  -p, --port <port>   Puerto del servidor (default: 3000)"
    echo "  -v, --verbose       Mostrar respuestas completas"
    echo "  --help              Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./test_api_key.sh abr_live_abc123..."
    echo "  ./test_api_key.sh --host api.example.com --port 443 <API_KEY>"
    echo "  API_KEY=tu_clave ./test_api_key.sh"
    echo ""
    exit 0
}

# Función para imprimir secciones
print_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
}

# Función para imprimir resultados
print_result() {
    local label="$1"
    local value="$2"
    local status="$3"

    case "$status" in
        success) color="$GREEN" ;;
        error)   color="$RED" ;;
        warning) color="$YELLOW" ;;
        info)    color="$CYAN" ;;
        *)       color="$WHITE" ;;
    esac

    echo -e "  ${DIM}${label}:${NC} ${color}${value}${NC}"
}

# Función para probar un endpoint
test_endpoint() {
    local path="$1"
    local name="$2"
    local resource="$3"

    # Realizar la petición con curl
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: ${API_KEY}" \
        -H "Content-Type: application/json" \
        --connect-timeout 10 \
        --max-time 30 \
        "${BASE_URL}${path}" 2>/dev/null) || {
        echo -e "  ${RED}✗${NC} [ERR] ${name} (${path}) - Error de conexión"
        ((ERRORS++))
        return 1
    }

    # Separar el código HTTP del cuerpo
    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    # Determinar el icono y color según el código de estado
    local icon color
    case "$http_code" in
        200|201)
            icon="✓"
            color="$GREEN"
            ((ACCESSIBLE++))
            ;;
        401)
            icon="✗"
            color="$RED"
            ((RESTRICTED++))
            ;;
        403)
            icon="⊘"
            color="$YELLOW"
            ((RESTRICTED++))
            ;;
        404)
            icon="?"
            color="$DIM"
            ;;
        *)
            icon="!"
            color="$YELLOW"
            ;;
    esac

    echo -e "  ${color}${icon}${NC} [${http_code}] ${name} (${path})"

    # Mostrar respuesta en modo verbose
    if [ "$VERBOSE" = true ] && [ -n "$body" ]; then
        echo -e "      ${DIM}$(echo "$body" | head -c 200)${NC}"
    fi

    return 0
}

# Función para verificar la validez de la clave
verify_api_key() {
    print_section "VERIFICACIÓN DE CLAVE API"

    echo ""
    echo -e "  ${DIM}Servidor: ${BASE_URL}${NC}"
    echo ""

    # Probar con el endpoint de roles
    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: ${API_KEY}" \
        -H "Content-Type: application/json" \
        --connect-timeout 10 \
        --max-time 30 \
        "${BASE_URL}/api/roles" 2>/dev/null) || {
        print_result "Estado" "✗ ERROR DE CONEXIÓN" "error"
        print_result "Detalle" "No se pudo conectar con el servidor" "warning"
        return 1
    }

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    case "$http_code" in
        200)
            print_result "Estado" "✓ CLAVE VÁLIDA" "success"

            # Intentar extraer información de los roles
            local roles_count=$(echo "$body" | grep -o '"roles":\[' | wc -l)
            if [ "$roles_count" -gt 0 ]; then
                local total=$(echo "$body" | grep -oP '"roles":\[[^\]]*\]' | grep -o '{' | wc -l)
                print_result "Roles encontrados" "$total" "info"
            fi
            return 0
            ;;
        401)
            print_result "Estado" "✗ CLAVE INVÁLIDA O EXPIRADA" "error"
            local message=$(echo "$body" | grep -oP '"message"\s*:\s*"\K[^"]+' || echo "Sin mensaje")
            print_result "Mensaje" "$message" "warning"
            return 1
            ;;
        403)
            print_result "Estado" "✗ ACCESO DENEGADO" "error"
            local message=$(echo "$body" | grep -oP '"message"\s*:\s*"\K[^"]+' || echo "Sin permisos")
            print_result "Mensaje" "$message" "warning"
            return 1
            ;;
        *)
            print_result "Estado" "? RESPUESTA INESPERADA (${http_code})" "warning"
            return 1
            ;;
    esac
}

# Función para obtener información de las claves API
get_api_key_info() {
    print_section "INFORMACIÓN DE CLAVES API"

    local response
    local http_code

    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: ${API_KEY}" \
        -H "Content-Type: application/json" \
        --connect-timeout 10 \
        --max-time 30 \
        "${BASE_URL}/api/api-keys" 2>/dev/null) || {
        print_result "Info" "No se pudo obtener información" "warning"
        return 1
    }

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        # Parsear JSON básico con grep/sed (sin jq)
        echo ""

        # Contar claves
        local count=$(echo "$body" | grep -o '"id":' | wc -l)
        print_result "Claves registradas" "$count" "info"

        # Mostrar cada clave (parsing básico)
        echo "$body" | grep -oP '\{[^{}]*"name"\s*:\s*"[^"]*"[^{}]*\}' | while read -r key_json; do
            echo ""
            local name=$(echo "$key_json" | grep -oP '"name"\s*:\s*"\K[^"]+')
            local active=$(echo "$key_json" | grep -oP '"active"\s*:\s*\K(true|false)')
            local created=$(echo "$key_json" | grep -oP '"created_at"\s*:\s*"\K[^"]+')
            local expires=$(echo "$key_json" | grep -oP '"expires_at"\s*:\s*"\K[^"]+' || echo "")
            local last_used=$(echo "$key_json" | grep -oP '"last_used"\s*:\s*"\K[^"]+' || echo "")

            echo -e "  ${WHITE}Clave: ${name}${NC}"

            if [ "$active" = "true" ]; then
                print_result "    Estado" "Activa" "success"
            else
                print_result "    Estado" "Inactiva" "error"
            fi

            [ -n "$created" ] && print_result "    Creada" "$created" "neutral"

            if [ -n "$expires" ] && [ "$expires" != "null" ]; then
                print_result "    Expira" "$expires" "warning"
            else
                print_result "    Expira" "Sin expiración" "success"
            fi

            if [ -n "$last_used" ] && [ "$last_used" != "null" ]; then
                print_result "    Último uso" "$last_used" "neutral"
            else
                print_result "    Último uso" "Nunca" "dim"
            fi
        done
    else
        print_result "Info" "No se pudo obtener información de claves (HTTP $http_code)" "warning"
    fi
}

# Función para probar el alcance
test_scope() {
    print_section "ALCANCE Y PERMISOS"

    echo ""
    echo -e "  ${DIM}Probando acceso a endpoints...${NC}"
    echo ""

    # Lista de endpoints a probar
    test_endpoint "/api/roles" "Roles" "roles"
    test_endpoint "/api/roles/stats" "Estadísticas de Roles" "roles"
    test_endpoint "/api/admin/users" "Usuarios" "users"
    test_endpoint "/api/api-keys" "Claves API" "api_keys"
    test_endpoint "/api/socios/search?q=test" "Búsqueda de Socios" "socios"
    test_endpoint "/api/tirada/current" "Tirada Actual" "tirada"
    test_endpoint "/api/accounting/summary" "Resumen Contable" "accounting"

    # Resumen
    echo ""
    echo -e "  ${WHITE}Resumen de Alcance:${NC}"
    print_result "Endpoints accesibles" "$ACCESSIBLE" "success"
    print_result "Endpoints restringidos" "$RESTRICTED" "warning"
    print_result "Errores" "$ERRORS" "error"
}

# Función para mostrar la leyenda
show_legend() {
    print_section "LEYENDA"
    echo -e "  ${GREEN}✓${NC} Acceso permitido (200 OK)"
    echo -e "  ${RED}✗${NC} No autorizado (401 Unauthorized)"
    echo -e "  ${YELLOW}⊘${NC} Prohibido (403 Forbidden)"
    echo -e "  ${DIM}?${NC} No encontrado (404 Not Found)"
    echo -e "  ${YELLOW}!${NC} Otro código de estado"
}

# ============================================================
# MAIN
# ============================================================

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            API_HOST="$2"
            shift 2
            ;;
        -p|--port)
            API_PORT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            ;;
        -*)
            echo -e "${RED}Error: Opción desconocida: $1${NC}"
            show_help
            ;;
        *)
            API_KEY="$1"
            shift
            ;;
    esac
done

# Actualizar BASE_URL después de parsear argumentos
BASE_URL="http://${API_HOST}:${API_PORT}"

# Header
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       VERIFICADOR DE CLAVES API - Biblio-Server            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

# Obtener la clave API si no se proporcionó
if [ -z "$API_KEY" ]; then
    # Intentar desde variable de entorno
    API_KEY="${API_KEY:-}"

    if [ -z "$API_KEY" ]; then
        echo ""
        echo -e "${YELLOW}Ingresa la clave API a verificar:${NC}"
        read -r API_KEY
    fi
fi

if [ -z "$API_KEY" ]; then
    echo ""
    echo -e "${RED}Error: No se proporcionó una clave API${NC}"
    show_help
fi

# Mostrar clave parcialmente oculta
MASKED_KEY="${API_KEY:0:10}...${API_KEY: -4}"
echo ""
echo -e "  ${DIM}Clave a verificar: ${MASKED_KEY}${NC}"

# Ejecutar verificaciones
if verify_api_key; then
    get_api_key_info
    test_scope
fi

show_legend

echo ""
echo -e "  ${GREEN}Verificación completada.${NC}"
echo ""

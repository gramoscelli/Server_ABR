#!/bin/bash
#
# Script de Verificación de Claves API
#
# Uso:
#   ./test_api_key.sh <API_KEY>
#   ./test_api_key.sh                 # Modo interactivo
#
# El script ejecuta la verificación dentro del contenedor Docker
#

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      VERIFICADOR DE CLAVES API - Biblio-Server             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Obtener la clave API
API_KEY="$1"

if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}Ingresa la clave API a verificar:${NC}"
    read -r API_KEY
    echo ""
fi

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: No se proporcionó una clave API${NC}"
    echo ""
    echo "Uso:"
    echo "  ./test_api_key.sh <API_KEY>"
    echo "  ./test_api_key.sh              # Modo interactivo"
    echo ""
    exit 1
fi

# Verificar si el contenedor está corriendo
if ! docker ps --format '{{.Names}}' | grep -q "nodejs"; then
    echo -e "${RED}Error: El contenedor 'nodejs' no está corriendo${NC}"
    echo ""
    echo "Inicia los servicios con:"
    echo "  docker compose up -d"
    echo ""
    exit 1
fi

# Ejecutar el script dentro del contenedor
echo -e "${BLUE}Ejecutando verificación en el contenedor...${NC}"
echo ""

docker exec -it nodejs node scripts/test_api_key.js "$API_KEY"

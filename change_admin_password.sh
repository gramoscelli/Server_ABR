#!/bin/bash

# Script para cambiar la contraseña del usuario admin
# Uso: ./change_admin_password.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Cambio de Contraseña de Administrador ===${NC}"
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: Archivo .env no encontrado${NC}"
    exit 1
fi

# Solicitar nombre de usuario
echo -e "${YELLOW}Ingrese el nombre de usuario del administrador:${NC}"
read -p "Usuario: " USERNAME

if [ -z "$USERNAME" ]; then
    echo -e "${RED}Error: El nombre de usuario no puede estar vacío${NC}"
    exit 1
fi

# Verificar que el usuario existe
echo -e "${YELLOW}Verificando usuario...${NC}"
USER_EXISTS=$(docker exec mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -Nse "SELECT COUNT(*) FROM usuarios WHERE username = '$USERNAME'" 2>/dev/null)

if [ "$USER_EXISTS" -eq 0 ]; then
    echo -e "${RED}Error: El usuario '$USERNAME' no existe en la base de datos${NC}"
    exit 1
fi

# Mostrar información del usuario
echo -e "${GREEN}Usuario encontrado:${NC}"
docker exec mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "SELECT id, username, full_name, email FROM usuarios WHERE username = '$USERNAME'" 2>/dev/null

echo ""

# Solicitar nueva contraseña
echo -e "${YELLOW}Ingrese la nueva contraseña:${NC}"
read -s -p "Nueva contraseña: " NEW_PASSWORD
echo ""
read -s -p "Confirmar contraseña: " CONFIRM_PASSWORD
echo ""

if [ -z "$NEW_PASSWORD" ]; then
    echo -e "${RED}Error: La contraseña no puede estar vacía${NC}"
    exit 1
fi

if [ "$NEW_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
    echo -e "${RED}Error: Las contraseñas no coinciden${NC}"
    exit 1
fi

# Validar longitud mínima
if [ ${#NEW_PASSWORD} -lt 6 ]; then
    echo -e "${RED}Error: La contraseña debe tener al menos 6 caracteres${NC}"
    exit 1
fi

# Generar hash bcrypt usando Node.js dentro del contenedor backend
echo -e "${YELLOW}Generando hash de contraseña...${NC}"
HASHED_PASSWORD=$(docker exec backend node -e "
const bcrypt = require('bcryptjs');
const password = process.argv[1];
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);
" "$NEW_PASSWORD")

if [ -z "$HASHED_PASSWORD" ]; then
    echo -e "${RED}Error: No se pudo generar el hash de la contraseña${NC}"
    exit 1
fi

# Actualizar contraseña en la base de datos
echo -e "${YELLOW}Actualizando contraseña en la base de datos...${NC}"
docker exec mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "
UPDATE usuarios
SET password = '$HASHED_PASSWORD',
    updated_at = NOW()
WHERE username = '$USERNAME';
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Contraseña actualizada exitosamente${NC}"
    echo ""
    echo -e "${GREEN}Detalles de la actualización:${NC}"
    docker exec mysql mysql -u${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e "
    SELECT
        username as Usuario,
        full_name as 'Nombre Completo',
        email as Email,
        updated_at as 'Última Actualización'
    FROM usuarios
    WHERE username = '$USERNAME';
    " 2>/dev/null
    echo ""
    echo -e "${YELLOW}Nota: Todos los tokens de sesión activos siguen siendo válidos.${NC}"
    echo -e "${YELLOW}El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.${NC}"
else
    echo -e "${RED}Error: No se pudo actualizar la contraseña${NC}"
    exit 1
fi

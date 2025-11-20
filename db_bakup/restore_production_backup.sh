#!/bin/bash

# Script para restaurar el backup de producción en la base de datos MySQL
# Fecha del backup: 2025-11-20
# Tamaño: 444MB (descomprimido), 360MB (comprimido)

set -e  # Salir si hay algún error

echo "=============================================="
echo "Restauración de Backup de Producción"
echo "=============================================="
echo ""

# Nombre del contenedor MySQL (según docker-compose.yml)
MYSQL_CONTAINER="mysql"
BACKUP_FILE="backup_2025-11-20.sql"

# Verificar que el archivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: No se encuentra el archivo $BACKUP_FILE"
    echo "Por favor, asegúrate de estar en el directorio db_bakup"
    exit 1
fi

echo "✓ Archivo de backup encontrado: $BACKUP_FILE"
echo ""

# Verificar que el contenedor MySQL está corriendo
if ! docker ps | grep -q "$MYSQL_CONTAINER"; then
    echo "❌ Error: El contenedor MySQL no está corriendo"
    echo "Por favor, inicia los contenedores con: docker-compose up -d"
    exit 1
fi

echo "✓ Contenedor MySQL está corriendo"
echo ""

# Advertencia
echo "⚠️  ADVERTENCIA:"
echo "Este proceso eliminará TODOS los datos actuales de la base de datos"
echo "y los reemplazará con el backup de producción."
echo ""
read -p "¿Deseas continuar? (escribe 'SI' para confirmar): " confirmacion

if [ "$confirmacion" != "SI" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo ""
echo "Iniciando restauración..."
echo ""

# Opción 1: Restaurar copiando el archivo al contenedor
echo "📁 Copiando archivo de backup al contenedor..."
docker cp "$BACKUP_FILE" "$MYSQL_CONTAINER:/tmp/$BACKUP_FILE"

echo "🔄 Restaurando base de datos..."
docker exec -i "$MYSQL_CONTAINER" mysql -uroot -p"${MYSQL_ROOT_PASSWORD:-root}" < "/tmp/$BACKUP_FILE" 2>&1

# Verificar si la restauración fue exitosa
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Restauración completada exitosamente!"
    echo ""
    echo "Limpiando archivo temporal..."
    docker exec "$MYSQL_CONTAINER" rm "/tmp/$BACKUP_FILE"
    echo ""
    echo "✓ La base de datos ha sido actualizada con el backup de producción"
    echo "✓ Fecha del backup: 2025-11-20"
else
    echo ""
    echo "❌ Error durante la restauración"
    echo "Por favor, verifica los logs y el estado de la base de datos"
    exit 1
fi

echo ""
echo "=============================================="
echo "Restauración finalizada"
echo "=============================================="

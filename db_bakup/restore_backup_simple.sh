#!/bin/bash

# Script simple para restaurar el backup de producción
# Asume que los contenedores de Docker ya están corriendo

set -e

BACKUP_FILE="backup_2025-11-20.sql"

echo "Restaurando backup de producción..."

# Método directo: pipe del archivo SQL directamente al contenedor MySQL
cat "$BACKUP_FILE" | docker exec -i mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD:-root}"

echo "✅ Backup restaurado exitosamente"

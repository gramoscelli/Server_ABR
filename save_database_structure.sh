#!/bin/bash


# variable del archivo .env
# MYSQL_ROOT_PASSWORD
# MYSQL_USER
# MYSQL_PASSWORD
# MYSQL_DATABASE
# MYSQL_HOST
# MYSQL_PORT

if [[ -f .env ]]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ruta de destino para el archivo SQL
OUTPUT_FILE="estructura.sql"

# Comando mysqldump para generar el archivo SQL con la estructura de la base de datos
mysqldump --no-data --host="$MYSQL_HOST" --port="$MYSQL_PORT" --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" "$MYSQL_DATABASE" > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "La estructura de la base de datos ha sido descargada correctamente en el archivo $OUTPUT_FILE"
else
  echo "Ha ocurrido un error al descargar la estructura de la base de datos"
fi

# Backup de Base de Datos de Producción

## Información del Backup

- **Fecha del backup**: 2025-11-20 06:00:17
- **Base de datos**: `abr`
- **Servidor origen**: MySQL 8.0.33
- **Tamaño comprimido**: 360 MB (backup_2025-11-20.sql.bz2)
- **Tamaño descomprimido**: 444 MB (backup_2025-11-20.sql)
- **Líneas SQL**: 1,435 líneas

## Archivos Disponibles

```
db_bakup/
├── backup_2025-11-20.sql.bz2          # Backup comprimido (original)
├── backup_2025-11-20.sql              # Backup descomprimido (listo para restaurar)
├── restore_production_backup.sh       # Script de restauración con validaciones
├── restore_backup_simple.sh           # Script de restauración simple
└── README.md                          # Este archivo
```

## Métodos de Restauración

### Método 1: Script Automático con Validaciones (Recomendado)

Este script incluye validaciones de seguridad y confirmación antes de restaurar:

```bash
cd /home/user/Server_ABR/db_bakup
./restore_production_backup.sh
```

**Nota**: El script te pedirá confirmación antes de proceder ya que eliminará todos los datos actuales.

### Método 2: Script Simple

Para una restauración rápida sin confirmaciones interactivas:

```bash
cd /home/user/Server_ABR/db_bakup
./restore_backup_simple.sh
```

### Método 3: Comando Directo con Docker

Si prefieres ejecutar el comando directamente:

```bash
# Asegúrate de estar en el directorio db_bakup
cd /home/user/Server_ABR/db_bakup

# Restaurar usando docker exec
cat backup_2025-11-20.sql | docker exec -i mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD}"
```

### Método 4: Copiar al Contenedor y Restaurar

```bash
# Copiar el backup al contenedor
docker cp backup_2025-11-20.sql mysql:/tmp/

# Restaurar dentro del contenedor
docker exec -i mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < /tmp/backup_2025-11-20.sql

# Limpiar archivo temporal
docker exec mysql rm /tmp/backup_2025-11-20.sql
```

## Prerequisitos

Antes de restaurar el backup, asegúrate de:

1. **Los contenedores Docker están corriendo**:
   ```bash
   cd /home/user/Server_ABR
   docker-compose up -d
   ```

2. **Verificar que el contenedor MySQL está activo**:
   ```bash
   docker ps | grep mysql
   ```

3. **Tienes configurada la variable de entorno con la contraseña de MySQL**:
   - La contraseña debe estar en el archivo `.env` como `MYSQL_ROOT_PASSWORD`
   - O puedes exportarla temporalmente: `export MYSQL_ROOT_PASSWORD=tu_contraseña`

## Contenido del Backup

El backup incluye:

- Estructura completa de todas las tablas
- Todos los datos de la base de datos `abr`
- Vistas (views)
- Configuraciones de base de datos
- Foreign keys y constraints

Algunas de las tablas principales incluidas:
- `adicionales` - Carnets adicionales de socios
- `socios` - Información de socios
- `cobradores` - Datos de cobradores
- `users` - Sistema de autenticación
- Y todas las demás tablas del sistema

## Verificación Post-Restauración

Después de restaurar el backup, puedes verificar que todo está correcto:

```bash
# Acceder a MySQL
docker exec -it mysql mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" abr

# Verificar algunas tablas
SHOW TABLES;
SELECT COUNT(*) FROM socios;
SELECT COUNT(*) FROM users;
```

## Seguridad y Backup Local

**IMPORTANTE**: La restauración sobrescribirá TODOS los datos actuales en la base de datos.

Antes de restaurar, considera hacer un backup de tu base de datos actual:

```bash
# Crear backup de la base de datos actual
docker exec mysql mysqldump -uroot -p"${MYSQL_ROOT_PASSWORD}" abr > backup_local_$(date +%Y%m%d_%H%M%S).sql
```

## Troubleshooting

### Error: "El contenedor MySQL no está corriendo"

Solución:
```bash
cd /home/user/Server_ABR
docker-compose up -d db
```

### Error: "Access denied"

Verifica que la contraseña de root sea correcta:
```bash
# Ver la contraseña configurada en .env
cat /home/user/Server_ABR/.env | grep MYSQL_ROOT_PASSWORD
```

### Error: "No se encuentra el archivo"

Asegúrate de estar en el directorio correcto:
```bash
cd /home/user/Server_ABR/db_bakup
ls -lh backup_2025-11-20.sql
```

## Soporte

Si encuentras algún problema durante la restauración, verifica:
1. Los logs del contenedor MySQL: `docker logs mysql`
2. El estado de los contenedores: `docker-compose ps`
3. La conectividad a la base de datos desde otros contenedores

## Información Adicional

- El backup fue generado usando `mysqldump` / `MariaDB dump 10.19`
- Compatible con MySQL 8.0+ y MariaDB 10.5+
- El dump incluye `DROP TABLE IF EXISTS` por lo que sobrescribirá tablas existentes
- Foreign key checks están deshabilitados durante la restauración para evitar errores de dependencias

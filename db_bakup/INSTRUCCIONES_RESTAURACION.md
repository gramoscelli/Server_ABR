# Instrucciones para Restaurar Backup de Producción

## El backup ya está descargado y listo

El backup de producción está en: `db_bakup/backup_2025-11-20.sql`

## Pasos para restaurar en tu máquina local:

### 1. Asegúrate de tener los contenedores corriendo

```bash
cd /home/user/Server_ABR
docker compose up -d
```

### 2. Verifica que el contenedor MySQL está activo

```bash
docker ps | grep mysql
```

### 3. Restaura el backup usando el script simple

```bash
cd /home/user/Server_ABR/db_bakup
export MYSQL_ROOT_PASSWORD=abr2005
./restore_backup_simple.sh
```

### 4. O restaura manualmente con este comando directo:

```bash
cd /home/user/Server_ABR/db_bakup
cat backup_2025-11-20.sql | docker exec -i mysql mysql -uroot -pabr2005
```

## Verificación después de restaurar

```bash
# Conectarse a MySQL
docker exec -it mysql mysql -uroot -pabr2005 abr

# Dentro de MySQL, verificar las tablas
SHOW TABLES;
SELECT COUNT(*) FROM socios;
```

## Si prefieres usar Docker Compose v1

```bash
cd /home/user/Server_ABR
docker-compose up -d

cd db_bakup
cat backup_2025-11-20.sql | docker exec -i mysql mysql -uroot -pabr2005
```

---

**Nota**: El backup sobrescribirá todos los datos actuales en la base de datos `abr`.

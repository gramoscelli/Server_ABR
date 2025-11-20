# Test User Credentials

Este documento contiene las credenciales de los usuarios de prueba creados para desarrollo y testing.

## Usuario de Prueba Principal

### Credenciales
- **Username:** `test_user`
- **Password:** `Test123456!`
- **Email:** `test@example.com`
- **Role:** `library_employee` (ID: 2)

### Uso
Este usuario está diseñado para pruebas de desarrollo y testing de la API. Tiene verificación de email completada y está activo.

### Ejemplo de Login

```bash
# Get CSRF token
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r ".csrfToken")

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username": "test_user", "password": "Test123456!"}'
```

### Crear Nuevo Usuario de Prueba

Si necesitas crear otro usuario de prueba, usa el script:

```bash
docker compose exec app node scripts/create_test_user.js
```

Si el usuario ya existe, el script mostrará sus credenciales actuales.

## ⚠️ ADVERTENCIA

**ESTOS USUARIOS SON SOLO PARA DESARROLLO/TESTING**

- NO usar en producción
- NO compartir estas credenciales fuera del equipo de desarrollo
- Los usuarios de prueba tienen credenciales débiles y conocidas por diseño

## Scripts Disponibles

### create_test_user.js
Crea un usuario de prueba con credenciales conocidas para testing.

**Ubicación:** `/app/scripts/create_test_user.js`

**Uso:**
```bash
docker compose exec app node scripts/create_test_user.js
```

### create_admin_user.js
Crea un usuario administrador con credenciales personalizadas.

**Ubicación:** `/app/scripts/create_admin_user.js`

**Uso:**
```bash
docker compose exec app node scripts/create_admin_user.js <username> <password> [email]
```

**Nota:** Este script actualmente tiene un bug - usa `role` en lugar de `role_id`. Usa `create_test_user.js` para crear usuarios de prueba.

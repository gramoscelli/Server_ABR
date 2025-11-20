# Test Script para Accounting API

Este script prueba todos los endpoints del sistema contable para verificar su funcionamiento.

## Uso

### Opción 1: Ejecutar el script Node.js

```bash
# Desde el directorio raíz del proyecto
node test-accounting-endpoints.js
```

### Opción 2: Ejecutar desde Docker

```bash
# Si el backend está corriendo en Docker
docker compose exec app node /usr/src/app/../test-accounting-endpoints.js
```

## ¿Qué hace el script?

El script realiza las siguientes operaciones en orden:

1. **Obtiene CSRF token** - Necesario para autenticación
2. **Crea usuario de prueba** - Usuario con rol `root` para tener todos los permisos
3. **Inicia sesión** - Obtiene el JWT token de acceso
4. **Prueba endpoints de Accounts**:
   - Crear cuenta
   - Listar cuentas
   - Obtener cuenta por ID
5. **Prueba endpoints de Categories**:
   - Listar categorías de egresos
   - Listar categorías de ingresos
6. **Prueba endpoints de Transfer Types**:
   - Listar tipos de transferencia
7. **Prueba endpoints de Expenses**:
   - Crear egreso
   - Listar egresos
   - Obtener egreso por ID
   - Obtener estadísticas por categoría
8. **Prueba endpoints de Incomes**:
   - Crear ingreso
   - Listar ingresos
   - Obtener ingreso por ID
9. **Prueba endpoints de Transfers**:
   - Crear segunda cuenta
   - Crear transferencia entre cuentas
   - Listar transferencias
10. **Prueba endpoints de Dashboard**:
    - Obtener datos del dashboard
    - Obtener datos mensuales
11. **Prueba endpoints de Cash Reconciliations**:
    - Calcular balance esperado
    - Crear arqueo de caja
    - Listar arqueos

## Salida del script

El script mostrará:
- ✓ para pruebas exitosas (en verde)
- ✗ para pruebas fallidas (en rojo)
- Resumen al final con total de pruebas pasadas y fallidas
- Detalles de pruebas fallidas
- JSON completo de la respuesta del dashboard

## Ejemplo de salida exitosa

```
=== ACCOUNTING API TEST SUITE ===

1. Getting CSRF token...
✓ Get CSRF token

2. Creating test user...
✓ Create test user

3. Logging in...
✓ Login

4. Testing Account endpoints...
✓ Create account: ID: 1
✓ Get accounts: Count: 4
✓ Get account by ID

5. Testing Expense Category endpoints...
✓ Get expense categories: Count: 12

... más pruebas ...

=== TEST SUMMARY ===
Total tests: 24
Passed: 24
Failed: 0
```

## Troubleshooting

### Error: ECONNREFUSED
El backend no está corriendo. Asegúrate de que el servidor esté activo:
```bash
docker compose up
```

### Error: 401 Unauthorized
Problema con la autenticación. Verifica:
- Que el endpoint `/api/auth/login` esté funcionando
- Que el JWT esté configurado correctamente
- Que los secretos en `.env` estén correctos

### Error: 403 Forbidden
El usuario no tiene permisos. Verifica:
- Que el rol `root` tenga acceso a los endpoints de accounting
- Que los middlewares de autorización estén correctos

### Error: 404 Not Found
El endpoint no existe. Verifica:
- Que las rutas de accounting estén registradas en `app.js`
- Que el path del endpoint sea correcto

### Error: 500 Internal Server Error
Error en el servidor. Revisa los logs del backend:
```bash
docker compose logs app
```

## Verificar datos en la base de datos

Después de ejecutar el script, puedes verificar los datos creados:

```bash
# Conectarse a MySQL
docker compose exec db mysql -u root -p

# Dentro de MySQL:
USE accounting;
SELECT * FROM accounts;
SELECT * FROM expenses;
SELECT * FROM incomes;
SELECT * FROM transfers;
```

## Limpiar datos de prueba

Los usuarios de prueba se crean con el prefijo `test_accounting_` seguido de un timestamp.
Para limpiarlos:

```sql
-- En la base de datos abr
DELETE FROM usuarios WHERE username LIKE 'test_accounting_%';

-- En la base de datos accounting (los datos se limpian con CASCADE)
```

## Notas

- El script crea datos de prueba reales en la base de datos
- Los balances de las cuentas se actualizan automáticamente
- Cada ejecución crea un nuevo usuario de prueba para evitar conflictos

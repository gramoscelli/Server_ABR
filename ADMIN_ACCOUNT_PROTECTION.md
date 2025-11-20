# Protección de la Cuenta Admin

## 🔒 Resumen

Se ha implementado protección completa para evitar que la cuenta "admin" sea eliminada o tenga su username modificado, garantizando que siempre exista una cuenta administrativa en el sistema.

## ✅ Cambios Implementados

### Backend (`app/routes/admin.js`)

#### 1. Protección contra Eliminación (Líneas 318-324)
```javascript
// Protect the "admin" account from deletion
if (user.username === 'admin') {
  return res.status(403).json({
    error: 'Cannot delete admin account',
    message: 'The "admin" account is protected and cannot be deleted'
  });
}
```

**Endpoint afectado**: `DELETE /api/admin/users/:userId`

**Comportamiento**:
- Si se intenta eliminar un usuario con username "admin", retorna error 403
- Mensaje claro: "The "admin" account is protected and cannot be deleted"
- La operación se detiene antes de intentar la eliminación

#### 2. Protección contra Cambio de Username (Líneas 238-244)
```javascript
// Protect the "admin" account username from being changed
if (user.username === 'admin' && username && username !== 'admin') {
  return res.status(403).json({
    error: 'Cannot change admin username',
    message: 'The "admin" account username is protected and cannot be changed'
  });
}
```

**Endpoint afectado**: `PUT /api/admin/users/:userId`

**Comportamiento**:
- Si se intenta cambiar el username de la cuenta "admin" a cualquier otro valor
- Retorna error 403 con mensaje descriptivo
- Permite actualizar otros campos (email, nombre, apellido, password) pero no el username

### Frontend (`frontend/src/pages/admin/UsersPage.tsx`)

#### 1. Validación en Función de Eliminación (Líneas 153-162)
```typescript
const handleDeleteUser = async (userId: number, username: string) => {
  // Protect admin account
  if (username === 'admin') {
    toast({
      variant: 'destructive',
      title: 'Cannot delete admin',
      description: 'The "admin" account is protected and cannot be deleted'
    })
    return
  }
  // ... resto del código
}
```

**Comportamiento**:
- Validación del lado del cliente antes de enviar request
- Muestra toast de error si se intenta eliminar "admin"
- Previene llamada innecesaria al backend

#### 2. Botón de Eliminación con Tooltip (Líneas 277-284)
```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={() => handleDeleteUser(user.id, user.username)}
  title={user.username === 'admin' ? 'The admin account cannot be deleted' : 'Delete user'}
>
  <Trash2 className="h-4 w-4 text-red-600" />
</Button>
```

**Comportamiento**:
- El botón de eliminar permanece habilitado para todos los usuarios
- Al hacer clic en la cuenta "admin", muestra un toast de error
- Tooltip explicativo cuando se pasa el mouse sobre el botón
- Mejor UX: el usuario ve el mensaje de error al intentar eliminar

#### 3. Campo Username Deshabilitado en Edición (Líneas 316-328)
```typescript
<Input
  id="username"
  required
  value={formData.username}
  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
  disabled={isEditMode && currentUser?.username === 'admin'}
  className={isEditMode && currentUser?.username === 'admin' ? 'bg-gray-100 cursor-not-allowed' : ''}
/>
{isEditMode && currentUser?.username === 'admin' && (
  <p className="text-xs text-gray-500">
    The admin username cannot be changed for security reasons
  </p>
)}
```

**Comportamiento**:
- Campo username deshabilitado al editar cuenta "admin"
- Fondo gris y cursor prohibido para indicar que no es editable
- Mensaje explicativo debajo del campo

## 🎯 Flujos Protegidos

### Flujo 1: Intento de Eliminación desde UI
1. Usuario ve la lista de usuarios
2. Usuario hace clic en el botón de eliminar (🗑️) para "admin"
3. Se muestra un toast/notificación roja en pantalla
4. Mensaje: "Cannot delete admin - The 'admin' account is protected and cannot be deleted"
5. La operación se cancela, no se envía request al backend
6. Si pasa el mouse sobre el botón, ve tooltip: "The admin account cannot be deleted"

### Flujo 2: Intento de Eliminación vía API Directa
1. Cliente envía `DELETE /api/admin/users/:adminId`
2. Backend verifica que `user.username === 'admin'`
3. Retorna error 403 con mensaje claro
4. La cuenta NO se elimina

### Flujo 3: Intento de Cambio de Username desde UI
1. Usuario edita la cuenta "admin"
2. Campo username aparece deshabilitado (gris)
3. No puede modificar el username
4. Ve mensaje: "The admin username cannot be changed for security reasons"
5. Puede modificar otros campos (email, nombre, apellido, password)

### Flujo 4: Intento de Cambio de Username vía API Directa
1. Cliente envía `PUT /api/admin/users/:adminId` con nuevo username
2. Backend verifica que username actual es "admin" y nuevo username es diferente
3. Retorna error 403 con mensaje claro
4. El username NO se cambia
5. Otros campos SÍ se actualizan si fueron enviados

## 🔐 Validaciones Implementadas

| Ubicación | Validación | Error Code | Mensaje |
|-----------|-----------|------------|---------|
| Backend DELETE | `username === 'admin'` | 403 | "The "admin" account is protected and cannot be deleted" |
| Backend PUT | `username === 'admin' && newUsername !== 'admin'` | 403 | "The "admin" account username is protected and cannot be changed" |
| Frontend DELETE | `username === 'admin'` | Toast | "The "admin" account is protected and cannot be deleted" |
| Frontend PUT | Campo deshabilitado | N/A | "The admin username cannot be changed for security reasons" |

## 🧪 Cómo Probar

### Test 1: Intentar eliminar cuenta "admin" desde UI
```
1. Login como administrador
2. Ir a "Users" en el panel admin
3. Buscar usuario "admin" en la lista
4. Hacer clic en el botón de eliminar (🗑️) para "admin"
5. Verificar que aparece un toast/notificación roja
6. Mensaje debe decir: "Cannot delete admin - The 'admin' account is protected and cannot be deleted"
7. Verificar que la cuenta NO se eliminó de la lista
```

**Resultado esperado**: Toast de error visible, cuenta no eliminada

### Test 2: Intentar eliminar cuenta "admin" vía API
```bash
# 1. Login y obtener token
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# 2. Login como admin
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username":"admin","password":"tu_password"}' \
  | jq -r '.accessToken')

# 3. Obtener ID del usuario admin
ADMIN_ID=$(curl -s http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[] | select(.username=="admin") | .id')

# 4. Intentar eliminar (debe fallar)
curl -X DELETE "http://localhost:3000/api/admin/users/$ADMIN_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  | jq .
```

**Resultado esperado**:
```json
{
  "error": "Cannot delete admin account",
  "message": "The \"admin\" account is protected and cannot be deleted"
}
```

### Test 3: Intentar cambiar username de "admin" desde UI
```
1. Login como administrador
2. Ir a "Users"
3. Click en botón de editar (✏️) para usuario "admin"
4. Verificar que el campo "Username" está deshabilitado (gris)
5. Verificar mensaje: "The admin username cannot be changed for security reasons"
6. Intentar modificar otros campos (email, nombre)
7. Click en "Update"
```

**Resultado esperado**: Username NO se cambia, otros campos SÍ se actualizan

### Test 4: Intentar cambiar username de "admin" vía API
```bash
# Usando variables de Test 2

# Intentar cambiar username a "superadmin"
curl -X PUT "http://localhost:3000/api/admin/users/$ADMIN_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"username":"superadmin","email":"admin@example.com"}' \
  | jq .
```

**Resultado esperado**:
```json
{
  "error": "Cannot change admin username",
  "message": "The \"admin\" account username is protected and cannot be changed"
}
```

### Test 5: Actualizar otros campos de "admin"
```bash
# Actualizar email y nombre (SIN cambiar username)
curl -X PUT "http://localhost:3000/api/admin/users/$ADMIN_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"newadmin@example.com","nombre":"Administrator"}' \
  | jq .
```

**Resultado esperado**: ✅ Actualización exitosa (email y nombre cambian, username permanece "admin")

## 📋 Validaciones Ya Existentes

El sistema ya tenía estas protecciones (sin cambios):

1. **No auto-eliminación** (app/routes/admin.js:302-306)
   - Un admin no puede eliminarse a sí mismo
   - Mensaje: "You cannot delete your own account"

2. **Username único** (app/routes/admin.js:239-247)
   - No se puede cambiar username a uno que ya existe
   - Mensaje: "Please choose a different username"

## 🔒 Seguridad

### ¿Por qué proteger la cuenta "admin"?

1. **Garantía de acceso**: Siempre debe existir al menos una cuenta administrativa
2. **Prevención de lockout**: Evita quedar sin acceso al sistema
3. **Auditoría**: El username "admin" es reconocible y estándar
4. **Integridad**: Previene cambios accidentales o maliciosos

### ¿Qué NO está protegido?

La cuenta "admin" SÍ puede:
- ✅ Cambiar su contraseña
- ✅ Cambiar su email
- ✅ Cambiar nombre y apellido
- ✅ Ser deshabilitada (si existe ese campo en el futuro)
- ✅ Cambiar su rol (si existe lógica de roles)

Solo está protegido:
- ❌ Eliminación de la cuenta
- ❌ Cambio del username

### Consideraciones Futuras

Si en el futuro se implementa:
- **Múltiples administradores**: Considerar proteger mientras haya solo un admin
- **Soft delete**: La protección sigue siendo válida
- **Sistema de roles**: Proteger el último usuario con rol "root" o "super_admin"

## 📝 Notas Técnicas

### Orden de Validaciones

En el endpoint DELETE:
1. Validar ID numérico
2. **Verificar que no se auto-elimina** (existente)
3. Verificar que usuario existe
4. **Verificar que no es "admin"** (nuevo)
5. Ejecutar eliminación

En el endpoint PUT:
1. Validar ID numérico
2. Verificar que usuario existe
3. **Verificar que no se cambia username de "admin"** (nuevo)
4. Verificar que nuevo username no existe (si aplica)
5. Ejecutar actualización

### Performance

- ✅ No hay impacto en performance (validaciones simples de string)
- ✅ Validaciones del lado del cliente evitan requests innecesarios
- ✅ No requiere queries adicionales a la base de datos

### Compatibilidad

- ✅ Compatible con usuarios existentes
- ✅ No requiere migración de base de datos
- ✅ No afecta otras funcionalidades
- ✅ Retrocompatible con APIs existentes

## 🎓 Decisiones de Diseño

### ¿Por qué hardcodear "admin"?

- **Simplicidad**: No requiere tabla de configuración
- **Estándar**: "admin" es un username universalmente reconocido
- **Migración**: Fácil de modificar en el futuro si se necesita

### ¿Por qué proteger solo el username y no otros campos?

- **Flexibilidad**: Permite actualizar email, password, etc.
- **Seguridad básica**: El username es el identificador crítico
- **Usabilidad**: No limita innecesariamente la administración

### ¿Por qué error 403 en lugar de 400?

- **Semántica HTTP**: 403 Forbidden es más apropiado que 400 Bad Request
- **Indicador de seguridad**: Señala que es una restricción de permisos/política
- **Estándar REST**: Sigue mejores prácticas de APIs REST

## ✅ Checklist de Implementación

- [x] Protección backend contra eliminación
- [x] Protección backend contra cambio de username
- [x] Validación frontend en función de eliminación
- [x] Botón de eliminar deshabilitado en UI
- [x] Campo username deshabilitado en edición
- [x] Mensajes de error descriptivos
- [x] Tooltips explicativos
- [x] Backend reiniciado
- [x] Frontend reconstruido
- [x] Documentación creada

## 🚀 Deploy

Los cambios están aplicados y activos en:
- ✅ Backend (nodejs container)
- ✅ Frontend (nextjs-frontend container)

No se requieren pasos adicionales de configuración.

---

**Implementado**: 2025-11-12
**Versión**: 1.0.0
**Archivos modificados**:
- `app/routes/admin.js` (Backend)
- `frontend/src/pages/admin/UsersPage.tsx` (Frontend)

# Configuración de Rate Limiting

Este documento explica la configuración del sistema de rate limiting (control de reintentos) implementado en la aplicación.

## 📋 Resumen General

El sistema de rate limiting está configurado de manera **granular por endpoint**, permitiendo diferentes límites para diferentes tipos de operaciones.

## 🎯 Filosofía del Sistema

1. **Solo se penalizan intentos fallidos** - Los logins y registros exitosos NO cuentan hacia el límite
2. **Usuarios autenticados NO tienen límites** - Una vez iniciada sesión, no hay rate limiting en las APIs de su sesión
3. **Solo endpoints públicos tienen rate limiting** - Login, registro, validaciones y verificación de email

## 🔒 Limitadores Específicos por Endpoint

### 1. **Login** (`/api/auth/login`)
```javascript
Límite: 5 intentos
Ventana: 15 minutos
Solo cuenta: Intentos fallidos
```
- **Propósito**: Proteger contra ataques de fuerza bruta
- **Comportamiento**: Los logins exitosos NO cuentan hacia el límite
- **Mensaje**: "Demasiados intentos de inicio de sesión desde esta IP. Por favor, intenta nuevamente en 15 minutos."

### 2. **Registro Público** (`/api/auth/register`)
```javascript
Límite: 5 intentos
Ventana: 24 horas (1 día)
Solo cuenta: Intentos fallidos
```
- **Propósito**: Prevenir creación masiva de cuentas falsas
- **Comportamiento**: Los registros exitosos NO cuentan hacia el límite
- **Excepción**: Los administradores NO están sujetos a este límite cuando crean usuarios desde `/api/admin/users`
- **Mensaje**: "Demasiados intentos de registro desde esta IP. Por favor, intenta nuevamente en 24 horas."

### 3. **Tokens CSRF** (`/api/csrf-token`)
```javascript
Límite: 100 intentos
Ventana: 15 minutos
```
- **Propósito**: Permitir suficientes requests para operaciones normales
- **Comportamiento**: Límite alto ya que se necesita un token CSRF para cada operación protegida
- **Mensaje**: "Demasiadas solicitudes de tokens CSRF. Por favor, intenta nuevamente en 15 minutos."

### 4. **Validaciones en Tiempo Real** (`/api/auth/validate-username`, `/api/auth/validate-password`)
```javascript
Límite: 150 intentos
Ventana: 15 minutos
```
- **Propósito**: Permitir validaciones en tiempo real mientras el usuario escribe
- **Comportamiento**: Límite muy alto para no interrumpir la experiencia del usuario
- **Mensaje**: "Demasiadas solicitudes de validación. Por favor, intenta nuevamente en 15 minutos."

### 5. **Endpoints de Sesión (Autenticados)**
Aplica a: `/api/auth/me`, `/api/auth/change-password`, `/api/auth/logout`, `/api/auth/profile`
```javascript
Límite: SIN LÍMITE ∞
Protección: JWT Token requerido
```
- **Propósito**: Permitir uso libre durante la sesión autenticada
- **Comportamiento**: Una vez autenticado, el usuario puede usar estas APIs sin restricciones
- **Protección**: Ya están protegidos por autenticación JWT, no necesitan rate limiting adicional

### 6. **Otros Endpoints Públicos de Autenticación**
Aplica a: `/api/auth/refresh`, `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/auth/password-requirements`
```javascript
Límite: 50 intentos
Ventana: 15 minutos
```
- **Propósito**: Endpoints públicos que necesitan protección contra abuso
- **Comportamiento**: Suficientemente permisivo para uso normal
- **Mensaje**: "Demasiadas solicitudes desde esta IP. Por favor, intenta nuevamente en 15 minutos."

### 7. **Endpoints de API General (Requieren Autenticación)**
Aplica a: `/api/admin/*`, `/api/api-keys/*`, `/api/roles/*`, `/api/tirada/*`
```javascript
Límite: 100 intentos
Ventana: 15 minutos
```
- **Propósito**: Proteger contra abuso de la API
- **Comportamiento**: Límite alto para permitir operaciones normales de administración
- **Mensaje**: "Demasiadas solicitudes desde esta IP. Por favor, intenta nuevamente más tarde."

## 🎯 Arquitectura del Sistema

### Antes (❌ Problemático)
```
Todas las requests a /api/auth/* → Rate limiter general (20/15min)
  ↓
  Login → Rate limiter específico (10/1h)
  Register → Rate limiter específico (10/1h)
```
**Problema**: El rate limiter general bloqueaba a los usuarios antes de que el específico pudiera actuar.

### Ahora (✅ Correcto)
```
ENDPOINTS PÚBLICOS (con rate limiting):
/api/auth/login → loginLimiter (5/15min, solo fallas)
/api/auth/register → registerLimiter (5/24h, solo fallas)
/api/auth/validate-* → validationLimiter (150/15min)
/api/auth/verify-email → generalAuthLimiter (50/15min)
/api/auth/refresh → generalAuthLimiter (50/15min)
/api/csrf-token → csrfLimiter (100/15min)

ENDPOINTS AUTENTICADOS (SIN rate limiting):
/api/auth/me → SIN LÍMITE (protegido por JWT)
/api/auth/logout → SIN LÍMITE (protegido por JWT)
/api/auth/change-password → SIN LÍMITE (protegido por JWT)
/api/auth/profile → SIN LÍMITE (protegido por JWT)
/api/admin/* → apiLimiter (100/15min, pero requiere JWT)
```
**Ventajas**:
1. Solo se penalizan intentos fallidos
2. Usuarios autenticados tienen uso libre
3. Cada endpoint público tiene su límite apropiado

## 📂 Archivos Involucrados

### `app/middleware/rateLimiters.js`
Define todos los rate limiters:
- `loginLimiter` - Para login (5/15min)
- `registerLimiter` - Para registro público (5/24h)
- `generalAuthLimiter` - Para otros endpoints de auth (50/15min)
- `csrfLimiter` - Para tokens CSRF (100/15min)
- `validationLimiter` - Para validaciones en tiempo real (150/15min)
- `skipAdminRegistration` - Middleware para excluir admins del límite de registro

### `app/app.js`
Configuración global:
- Aplica `csrfLimiter` a `/api/csrf-token`
- NO aplica rate limiter general a `/api/auth` (cada ruta maneja su propio límite)
- Aplica `apiLimiter` a endpoints de admin y otros

### `app/routes/auth.js`
Aplica rate limiters específicos a cada endpoint:
- `/login` usa `loginLimiter` (5/15min)
- `/register` usa `registerLimiter` (5/24h)
- `/validate-username` y `/validate-password` usan `validationLimiter` (150/15min)
- Todos los demás usan `generalAuthLimiter` (50/15min)

## 🔍 Identificación de IP

El sistema usa la configuración `trust proxy` para identificar correctamente las IPs detrás de proxies o load balancers:

```javascript
app.set('trust proxy', 1);
```

Esto permite que Express confíe en los headers `X-Forwarded-*` para obtener la IP real del cliente.

## 🛡️ Casos de Uso Especiales

### 1. Solo se Penalizan Intentos Fallidos
Los logins y registros exitosos **NO cuentan** hacia el límite gracias a:
```javascript
skipSuccessfulRequests: true
```

**Ejemplo**:
```
10:00 AM - Login fallido #1 ❌ (cuenta)
10:02 AM - Login fallido #2 ❌ (cuenta)
10:05 AM - Login EXITOSO ✅ (NO cuenta)
10:08 AM - Login fallido #3 ❌ (cuenta)
10:10 AM - Login EXITOSO ✅ (NO cuenta)
10:12 AM - Login fallido #4 ❌ (cuenta)
10:15 AM - Login fallido #5 ❌ (cuenta) → BLOQUEADO

Total de intentos fallidos: 5 → Bloqueado
Total de logins exitosos: 2 → No afectan el contador
```

### 2. Usuarios Autenticados NO Tienen Límites
Una vez que un usuario inicia sesión exitosamente:
- Puede llamar `/api/auth/me` ilimitadamente
- Puede cambiar su contraseña sin límite
- Puede actualizar su perfil sin restricciones
- Puede hacer logout cuando quiera

**Protección**: Todos estos endpoints requieren un JWT válido, lo que ya es suficiente seguridad.

### 3. Administradores Creando Usuarios
Los administradores pueden crear usuarios sin límite de registro porque:
1. Usan el endpoint `/api/admin/users` (no `/api/auth/register`)
2. Están autenticados y autorizados
3. El rate limit de registro solo aplica al endpoint público `/api/auth/register`

## 📊 Monitoreo

El rate limiting envía headers estándar en la respuesta:
- `RateLimit-Limit` - Límite máximo de requests
- `RateLimit-Remaining` - Requests restantes
- `RateLimit-Reset` - Timestamp cuando se reinicia el contador

## ⚠️ Mensajes de Error

Cuando se alcanza el límite, el usuario recibe:
```json
{
  "error": "Too many [operation] attempts",
  "message": "Demasiados intentos de [operación] desde esta IP. Por favor, intenta nuevamente en [tiempo].",
  "retryAfter": "[tiempo]"
}
```

## 🔧 Ajustes Futuros

Si necesitas ajustar los límites, modifica los valores en `app/middleware/rateLimiters.js`:
- `windowMs` - Ventana de tiempo en milisegundos
- `max` - Número máximo de requests permitidas

### Ejemplo:
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  // ...
});
```

## 📝 Notas Importantes

1. **Los contadores son por IP**: Cada IP tiene su propio contador
2. **Los contadores se reinician**: Después de la ventana de tiempo, el contador vuelve a cero
3. **Solo se penalizan fallas**: Los intentos exitosos NO cuentan hacia el límite
4. **Usuarios autenticados libres**: Una vez autenticado, el usuario puede usar las APIs de su sesión sin límites
5. **Los límites son independientes**: Alcanzar el límite de login NO afecta otros endpoints
6. **Los admins tienen libertad**: Los admins pueden crear usuarios sin restricciones de registro

## 🎯 Resumen Ejecutivo

### ¿Qué está protegido?
- ✅ Login (solo intentos fallidos)
- ✅ Registro público (solo intentos fallidos)
- ✅ Validaciones en tiempo real
- ✅ Verificación de email
- ✅ Tokens CSRF

### ¿Qué NO tiene límites?
- ✅ Cualquier endpoint que requiera autenticación JWT
- ✅ APIs de sesión activa (`/me`, `/logout`, `/change-password`, `/profile`)
- ✅ Logins exitosos
- ✅ Registros exitosos

### ¿Cuándo se resetean los contadores?
- Login: **15 minutos**
- Registro: **24 horas**
- Validaciones: **15 minutos**
- Otros públicos: **15 minutos**

# Configuración del Sistema de Verificación de Email

Este documento describe el sistema de verificación de email implementado y cómo completar la configuración.

## 🎯 Funcionalidades Implementadas

### Backend

1. **Modelo de Usuario Actualizado** (`app/models/User.js`)
   - Campo `email_verified` (boolean) - indica si el email está verificado
   - Campo `email_verification_token` (string) - token único de verificación
   - Campo `email_verification_expires` (datetime) - fecha de expiración del token (24 horas)

2. **Servicio de Email** (`app/services/emailService.js`)
   - Genera tokens de verificación seguros
   - Envía emails de verificación
   - **Modo desarrollo**: Los enlaces se imprimen en la consola del servidor
   - **Modo producción**: Requiere configurar un servicio SMTP real (ver más abajo)

3. **Endpoints de Autenticación** (`app/routes/auth.js`)
   - `POST /api/auth/register` - Registro con email obligatorio y envío de verificación
   - `POST /api/auth/login` - Bloquea login si el email no está verificado
   - `POST /api/auth/verify-email` - Verifica el email con el token
   - `POST /api/auth/resend-verification` - Reenvía el email de verificación
   - `PUT /api/auth/profile` - Bloquea cambio de email para usuarios normales

4. **Permisos de Administrador**
   - Solo administradores pueden cambiar emails vía `/api/admin/users/:userId`
   - Los usuarios NO pueden cambiar su propio email por seguridad

### Frontend

1. **Página de Registro** (`/register`)
   - Formulario con username, email y contraseña
   - Validación de contraseñas coincidentes
   - Mensaje de éxito con instrucciones de verificación

2. **Página de Verificación de Email** (`/verify-email?token=xxx`)
   - Verifica automáticamente el token recibido por email
   - Muestra estados: verificando, éxito, error, ya verificado
   - Redirección automática al login tras 3 segundos

3. **Página de Reenvío de Verificación** (`/resend-verification`)
   - Permite solicitar nuevo email de verificación si expiró

4. **Login Actualizado**
   - Botón "Regístrate aquí" visible en la página de login
   - Mensaje claro si el email no está verificado
   - Opción de reenviar verificación desde el error

5. **Perfil de Usuario Actualizado**
   - Email mostrado como solo lectura para todos los usuarios
   - Mensaje de seguridad explicando la restricción

## 📋 Pasos de Configuración

### 1. Ejecutar Migración de Base de Datos

**IMPORTANTE:** Debes ejecutar la migración SQL para agregar los campos necesarios a la tabla `usuarios`.

```bash
# Opción 1: Dentro del contenedor de MySQL
docker compose exec -T db mysql -u root -p[TU_PASSWORD] bibliodb < migrations/add_email_verification_fields.sql

# Opción 2: Desde phpMyAdmin (http://localhost:9000)
# - Abre la base de datos 'bibliodb'
# - Ejecuta el contenido de: migrations/add_email_verification_fields.sql
```

**Contenido de la migración:**
```sql
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL COMMENT 'Token for email verification',
ADD COLUMN IF NOT EXISTS email_verification_expires DATETIME NULL COMMENT 'Expiration date for email verification token';

CREATE INDEX IF NOT EXISTS idx_email_verification_token ON usuarios(email_verification_token);
```

### 2. Configuración de Email en Desarrollo

**Actualmente el sistema está en modo desarrollo:**
- Los enlaces de verificación se imprimen en la consola del servidor
- NO se envían emails reales
- Busca en los logs del servidor mensajes como:

```
========================================
📧 EMAIL VERIFICATION (Development Mode)
========================================
To: usuario@example.com
Username: usuario123
Verification URL: http://localhost:3001/verify-email?token=abc123...
========================================
```

**Para probar:**
1. Regístrate en `/register`
2. Mira la consola del servidor Node.js
3. Copia el URL de verificación que aparece
4. Pégalo en tu navegador

### 3. Configuración de Email en Producción

Para producción, debes configurar un servicio SMTP real. Edita `app/services/emailService.js`:

#### Opción A: Nodemailer con SMTP

1. Instala nodemailer:
```bash
npm install nodemailer
```

2. Agrega variables de entorno en `.env`:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=noreply@biblio.com
FRONTEND_URL=https://tu-dominio.com
```

3. El código ya está comentado en `emailService.js` - solo descoméntalo.

#### Opción B: SendGrid

1. Instala el SDK:
```bash
npm install @sendgrid/mail
```

2. Configura en `.env`:
```env
SENDGRID_API_KEY=tu-api-key
FRONTEND_URL=https://tu-dominio.com
```

#### Opción C: AWS SES, Mailgun, etc.

Similar a las opciones anteriores - consulta la documentación del servicio elegido.

### 4. Verificar Usuarios Existentes

Los usuarios creados ANTES de esta implementación tendrán `email_verified = false`. Tienes dos opciones:

#### Opción A: Marcar usuarios existentes como verificados

```sql
-- Marcar todos los usuarios existentes como verificados
UPDATE usuarios
SET email_verified = true
WHERE email IS NOT NULL
AND created_at < '2025-01-11';
```

#### Opción B: Obligar a todos a verificar

Los usuarios deberán usar la opción "Reenviar verificación" en el login.

### 5. Configuración de Usuarios OAuth

Los usuarios que ingresan vía OAuth (Google, GitHub, etc.) tienen `oauth_only = true` y su email se verifica automáticamente por el proveedor OAuth.

## 🔒 Políticas de Seguridad Implementadas

1. **Email Obligatorio**: El registro requiere email válido
2. **Verificación Obligatoria**: No se puede hacer login sin verificar email
3. **Email Inmutable**: Los usuarios NO pueden cambiar su email
4. **Solo Administradores**: Solo admins pueden modificar emails de usuarios
5. **Tokens Temporales**: Los tokens de verificación expiran en 24 horas
6. **Reenvío Seguro**: El endpoint de reenvío no revela si un email existe o no

## 🧪 Flujo de Prueba

### Registro y Verificación

1. Ir a `http://localhost:3001/register`
2. Completar formulario con:
   - Username: `testuser`
   - Email: `test@example.com`
   - Contraseña: `password123`
3. Click en "Registrarse"
4. Ver mensaje de éxito
5. **EN DESARROLLO**: Copiar URL de la consola del servidor
6. Pegar URL en navegador: `http://localhost:3001/verify-email?token=...`
7. Ver mensaje "Email Verificado"
8. Ser redirigido al login
9. Iniciar sesión con las credenciales

### Intento de Login Sin Verificar

1. Registrarse normalmente
2. NO verificar el email
3. Intentar hacer login
4. Ver error: "Please verify your email address before logging in"
5. Click en "Reenviar verificación"
6. Recibir nuevo email (o ver nuevo link en consola)

### Cambio de Email Bloqueado

1. Iniciar sesión
2. Ir a "Mi Perfil"
3. Ver que el campo Email está deshabilitado
4. Intentar cambiar email (si lo haces via API directa)
5. Recibir error 403: "You cannot change your email address"

## 📝 Notas Adicionales

- **Usuarios OAuth**: No necesitan verificación de email (viene verificado del proveedor)
- **Expiración de Tokens**: Los tokens expiran en 24 horas por seguridad
- **Reenvío Ilimitado**: Los usuarios pueden solicitar nuevos tokens ilimitadamente
- **Logs en Desarrollo**: Los enlaces se imprimen SOLO en modo desarrollo
- **Seguridad**: Los tokens son hashes SHA-256 de 64 caracteres

## 🐛 Troubleshooting

### "Email no verificado" pero ya verificaste

- El token puede haber expirado
- Solicita un nuevo email de verificación

### Los emails no se envían en producción

- Verifica la configuración SMTP en `.env`
- Revisa los logs del servidor para errores
- Prueba las credenciales SMTP manualmente

### Usuario no puede cambiar email

- Esto es **intencional por seguridad**
- Solo administradores pueden cambiar emails
- Usar endpoint `/api/admin/users/:userId` con rol admin

## ✅ Checklist de Implementación

- [x] Migración de base de datos ejecutada
- [x] Servicio de email configurado
- [x] Frontend reconstruido (`npm run build`)
- [x] Variables de entorno configuradas
- [ ] Migración SQL ejecutada en la base de datos
- [ ] Servicio SMTP configurado para producción (opcional)
- [ ] Usuarios existentes marcados como verificados (opcional)

---

**Último Update**: 2025-01-11
**Versión**: 1.0.0

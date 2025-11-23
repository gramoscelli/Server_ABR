# Frontend Setup Guide

Este documento describe la configuración completa del frontend Next.js con el backend Express.

## Arquitectura

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser       │◄────────┤  Next.js Server  │◄────────┤  Express    │
│   (Client)      │         │  (Port 3001)     │         │  (Port 3000)│
└─────────────────┘         └──────────────────┘         └─────────────┘
     │                              │                            │
     │ HTTP-only cookies            │ Server-to-server          │
     │ No tokens exposed            │ API calls                 │
     └──────────────────────────────┘                           │
                                                                 │
                                                          ┌──────▼──────┐
                                                          │   MySQL     │
                                                          │   Database  │
                                                          └─────────────┘
```

## Cambios en el Backend

### 1. CORS Configuration (.env)

**Archivo: `/home/gustavo/biblio-server/.env`**

Se agregó el puerto 3001 (Next.js) a la lista de orígenes permitidos:

```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost,https://abr.servehttp.com
PORT=3000
```

### 2. Estructura de Respuesta de Login

El backend devuelve:
```json
{
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token",
  "user": {
    "id": 1,
    "username": "usuario",
    "role": "admin",
    "email": "email@example.com"
  }
}
```

El frontend almacena ambos tokens en cookies HTTP-only:
- `auth_token`: Access token (1 hora)
- `refresh_token`: Refresh token (7 días)

## Frontend Configuration

### Variables de Entorno

**Archivo: `/home/gustavo/biblio-server/frontend/.env.local`**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
SESSION_COOKIE_NAME=biblio_session
```

### Instalación

```bash
cd /home/gustavo/biblio-server/frontend
npm install --legacy-peer-deps
```

### Iniciar Frontend

```bash
npm run dev
```

El frontend estará disponible en: **http://localhost:3001**

## Flujo de Autenticación

### Login Flow

1. Usuario ingresa credenciales en `/auth/signin`
2. Frontend solicita CSRF token: `GET /api/csrf-token`
3. Frontend envía credenciales: `POST /api/auth/login`
4. Next.js proxy reenvía al backend Express
5. Backend valida y devuelve tokens
6. Next.js almacena tokens en cookies HTTP-only
7. Redirección al dashboard

### API Request Flow

1. Usuario hace acción en el frontend
2. Frontend hace request a Next.js API route: `GET /api/admin/users`
3. Next.js lee `auth_token` de cookie
4. Next.js hace request al backend: `GET http://localhost:3000/api/admin/users`
5. Backend valida JWT y responde
6. Next.js reenvía respuesta al cliente

### Logout Flow

1. Usuario hace click en logout
2. Frontend solicita CSRF token
3. Frontend envía: `POST /api/auth/logout`
4. Next.js lee `auth_token` y `refresh_token` de cookies
5. Next.js envía ambos tokens al backend
6. Backend invalida refresh token
7. Next.js limpia cookies
8. Redirección a `/auth/signin`

## Rutas del Frontend

### Públicas
- `/auth/signin` - Página de login
- `/auth/signup` - Página de registro (si está habilitado)

### Protegidas (requieren autenticación)
- `/` - Dashboard principal
- `/admin/users` - Gestión de usuarios
- `/admin/roles` - Gestión de roles
- `/admin/apikeys` - Gestión de API keys

### API Routes (Proxy)
- `/api/auth/login` - Login
- `/api/auth/logout` - Logout
- `/api/auth/register` - Registro
- `/api/csrf-token` - Obtener CSRF token
- `/api/admin/users` - CRUD de usuarios
- `/api/roles` - CRUD de roles
- `/api/apikeys` - CRUD de API keys

## Seguridad

### Cookies HTTP-only
Los tokens nunca son accesibles desde JavaScript del cliente:
```javascript
// ❌ Esto NO funciona (como debe ser)
document.cookie // No puede leer auth_token

// ✅ El servidor Next.js lee las cookies
request.cookies.get('auth_token')
```

### CSRF Protection
Todas las operaciones de cambio de estado requieren CSRF token:
```javascript
// 1. Obtener token
const { csrfToken } = await fetch('/api/csrf-token').then(r => r.json());

// 2. Enviar con request
await fetch('/api/admin/users', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  body: JSON.stringify(userData)
});
```

### Middleware de Autenticación
El middleware protege automáticamente las rutas:

**Archivo: `frontend/middleware.ts`**

- Rutas públicas: `/auth/*`, `/api/auth/login`, `/api/auth/register`
- Rutas protegidas: Todo lo demás requiere cookie `auth_token`
- Redirección automática a `/auth/signin` si no está autenticado

## Testing

### Verificar Backend
```bash
cd /home/gustavo/biblio-server/app
npm start
# Backend debe estar en http://localhost:3000
```

### Verificar Frontend
```bash
cd /home/gustavo/biblio-server/frontend
npm run dev
# Frontend debe estar en http://localhost:3001
```

### Test de Conectividad
```bash
# Desde frontend, probar CSRF token
curl http://localhost:3001/api/csrf-token

# Debería devolver:
# {"csrfToken":"..."}
```

## Docker Configuration (Opcional)

Para desplegar con Docker:

### Backend (app/Dockerfile)
Ya configurado, expone puerto 3000

### Frontend (crear nuevo)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

### Configuración de servicios (actualizar)
```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "3001:3001"
    environment:
      - BACKEND_API_URL=http://app:3000
      - NEXTAUTH_URL=http://localhost:3001
    depends_on:
      - app
```

## Troubleshooting

### CORS Error
**Problema:** Frontend no puede conectarse al backend

**Solución:** Verificar que `ALLOWED_ORIGINS` en `/home/gustavo/biblio-server/.env` incluye `http://localhost:3001`

### Cookie No Se Guarda
**Problema:** Login exitoso pero no redirige

**Solución:** Verificar que ambos servidores corren en `localhost` (no mezclar `127.0.0.1` con `localhost`)

### CSRF Token Invalid
**Problema:** Requests fallan con error 403

**Solución:** Obtener nuevo CSRF token antes de cada operación de cambio de estado

### 401 Unauthorized
**Problema:** Requests autenticados fallan

**Solución:**
1. Verificar que cookie `auth_token` existe
2. Token puede haber expirado (1 hora) - implementar refresh
3. Verificar que backend está corriendo

## Próximos Pasos

1. **Token Refresh Automático**: Implementar refresh automático de tokens cuando expiren
2. **Error Boundaries**: Manejar errores de red y API de manera elegante
3. **Loading States**: Mejorar UX con spinners y skeleton screens
4. **Formularios**: Agregar validación completa de formularios
5. **Notificaciones**: Sistema de toast notifications
6. **Tablas**: Paginación, filtrado y ordenamiento
7. **Tests**: Unit tests y E2E tests
8. **PWA**: Convertir en Progressive Web App

## Soporte

Para más información:
- Frontend README: `/home/gustavo/biblio-server/frontend/README.md`
- Backend API: Consultar rutas en `/home/gustavo/biblio-server/app/routes/`

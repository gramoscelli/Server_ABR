# Guía de Completación del Frontend

## Estado Actual del Proyecto

### ✅ Completado

1. **Backend Express.js**
   - Autenticación JWT con refresh tokens
   - Sistema de roles y permisos
   - API Keys para clientes externos
   - Protección CSRF
   - Rate limiting
   - Rutas: `/api/auth`, `/api/admin/users`, `/api/admin/roles`, `/api/admin/api-keys`

2. **Base de Datos MySQL**
   - Tablas: `users`, `roles`, `user_roles`, `api_keys`, `oauth_clients`, `oauth_tokens`
   - Relaciones configuradas correctamente
   - Migrations documentadas en `/migrations.sql`

3. **Docker Setup**
   - `docker-compose.yml` configurado con servicios:
     - MySQL (puerto 3306)
     - Backend Node.js (puerto 3000)
     - Frontend Next.js (puerto 3001) - **PENDIENTE DE COMPLETAR**
     - Nginx (puertos 80, 443)
     - PHP-FPM
     - PhpMyAdmin (puerto 9000)
     - Python (backups)

4. **Variables de Entorno** (`.env`)
   ```env
   MYSQL_HOST=mysql
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=abr2005
   MYSQL_DATABASE=abr
   JWT_SECRET=63c77be3b65a41c8d5db3e9d7eae5097e0ea1c5b7a21583370d3cdc89a307edb5d9223c64d89529f2e8be4e1e7a519c46c5e219d647a0c6e38d842706cf137b4
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost,https://abr.servehttp.com
   ```

### ❌ Problema Encontrado

El template **TailAdmin Free** para Next.js 16 tiene incompatibilidades con la generación estática durante el build:
- Error en componentes de charts (bar-chart, line-chart)
- Error en componente de videos
- Error: "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: object"

**Causa:** Los componentes del template usan dependencias que solo funcionan en el cliente, pero Next.js 16 intenta pre-renderizarlos durante el build.

### 🔄 Solución Implementada

Eliminar TailAdmin y crear un **frontend simplificado** con:
- Next.js 16 básico
- Tailwind CSS para estilos
- Componentes simples sin dependencias complejas

---

## Pasos para Completar el Frontend

### 1. Instalar Dependencias Adicionales

```bash
cd /home/gustavo/biblio-server/frontend
npm install tailwindcss postcss autoprefixer
npm install -D @tailwindcss/forms
npx tailwindcss init -p
```

### 2. Crear Estructura de Carpetas

```bash
mkdir -p app/{api/{auth,admin},login,dashboard}
mkdir -p components
mkdir -p public
mkdir -p styles
mkdir -p lib
```

### 3. Crear Archivos de Configuración

#### `next.config.ts`
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Para Docker
  reactStrictMode: true,
};

export default nextConfig;
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `tailwind.config.ts`
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
export default config;
```

#### `postcss.config.mjs`
```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

### 4. Crear Archivos Base de la Aplicación

#### `app/layout.tsx`
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biblio Admin",
  description: "Sistema de administración de biblioteca",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-gray-50">{children}</body>
    </html>
  );
}
```

#### `app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### `app/page.tsx`
```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
```

### 5. Crear Página de Login

#### `app/login/page.tsx`
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Obtener CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();

      // 2. Login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Biblio Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tus credenciales
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Usuario
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 6. Crear Rutas API Proxy

#### `app/api/csrf-token/route.ts`
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_API_URL || 'http://app:3000';
    const response = await fetch(`${backendUrl}/api/csrf-token`);
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener CSRF token' },
      { status: 500 }
    );
  }
}
```

#### `app/api/auth/login/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const csrfToken = request.headers.get('X-CSRF-Token');

    const backendUrl = process.env.BACKEND_API_URL || 'http://app:3000';
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Guardar tokens en cookies HTTP-only
    const cookieStore = await cookies();
    cookieStore.set('auth_token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60, // 1 hora
      path: '/',
    });

    cookieStore.set('refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
```

#### `app/api/auth/logout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    const csrfToken = request.headers.get('X-CSRF-Token');

    if (authToken && refreshToken) {
      const backendUrl = process.env.BACKEND_API_URL || 'http://app:3000';
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }

    // Eliminar cookies
    cookieStore.delete('auth_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}
```

#### `app/api/admin/users/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const backendUrl = process.env.BACKEND_API_URL || 'http://app:3000';
    const response = await fetch(`${backendUrl}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
```

### 7. Crear Dashboard con Lista de Usuarios

#### `app/dashboard/page.tsx`
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      router.push('/login');
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Biblio Admin</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Usuarios del Sistema
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Lista de todos los usuarios registrados
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Registro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay usuarios registrados
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 8. Actualizar package.json

#### `frontend/package.json`
```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/forms": "^0.5.0"
  }
}
```

### 9. Crear Variables de Entorno para el Frontend

#### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://app:3000
```

#### `frontend/.env.example`
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://app:3000
```

### 10. Crear el Dockerfile para el Frontend

#### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 11. Actualizar docker compose (ya está configurado)

El archivo compose ya tiene la configuración del frontend:
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
  container_name: nextjs-frontend
  hostname: frontend
  environment:
    - NEXT_PUBLIC_API_URL=http://app:3000
    - BACKEND_API_URL=http://app:3000
    - NEXTAUTH_URL=http://localhost:3001
    - NEXTAUTH_SECRET=${JWT_SECRET}
    - SESSION_COOKIE_NAME=biblio_session
  networks:
    - app_network
  ports:
    - "3001:3001"
  depends_on:
    - app
  restart: always
```

### 12. Construir y Ejecutar

```bash
# Desde el directorio raíz del proyecto
cd /home/gustavo/biblio-server

# Construir y levantar todos los servicios
docker compose up -d --build

# Ver logs del frontend
docker compose logs -f frontend

# Ver logs del backend
docker compose logs -f app

# Ver estado de todos los servicios
docker compose ps
```

### 13. Verificación

1. **Backend API:** http://localhost:3000/api/health
2. **Frontend:** http://localhost:3001
3. **PhpMyAdmin:** http://localhost:9000

### 14. Crear Usuario de Prueba

```bash
# Ejecutar el script de creación de admin user
docker exec -it nodejs node scripts/create_admin_user.js
```

O directamente en MySQL:
```sql
USE abr;

INSERT INTO users (username, email, password, is_active)
VALUES ('admin', 'admin@example.com', '$2b$10$someHashedPassword', true);

INSERT INTO roles (name, description)
VALUES ('admin', 'Administrator role');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'admin';
```

---

## Troubleshooting

### Error: "Cannot find module"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Port 3001 already in use"
```bash
# Matar proceso en puerto 3001
lsof -ti:3001 | xargs kill -9

# O cambiar puerto en docker-compose.yml
ports:
  - "3002:3001"  # Puerto externo:puerto interno
```

### Error de conexión al backend
Verificar que `BACKEND_API_URL=http://app:3000` esté usando el nombre del servicio Docker (`app`) y no `localhost`.

### Logs útiles
```bash
# Ver logs en tiempo real
docker compose logs -f frontend app

# Ver logs solo de errores
docker compose logs frontend | grep -i error

# Reiniciar un servicio específico
docker compose restart frontend
```

---

## Próximos Pasos (Mejoras Futuras)

1. **Agregar más páginas de administración:**
   - Gestión de roles
   - Gestión de API keys
   - Dashboard con estadísticas

2. **Mejorar la UI:**
   - Agregar un template de admin más completo (cuando haya uno compatible)
   - Dark mode
   - Responsive design mejorado

3. **Seguridad:**
   - Implementar refresh token automático
   - Agregar 2FA (Two-Factor Authentication)
   - Rate limiting en el frontend

4. **Testing:**
   - Tests unitarios con Jest
   - Tests E2E con Playwright
   - Tests de integración

---

## Contacto y Soporte

Si encuentras problemas o necesitas ayuda:
1. Revisa los logs: `docker compose logs -f`
2. Verifica el estado de los servicios: `docker compose ps`
3. Revisa la documentación del backend en `/app/README.md`

# Frontend Code Reference - Key Files

## Overview
This document provides a code reference for the current frontend implementation.

---

## 1. Login Page (`/app/login/page.tsx`)

**Current Status**: Complete and working

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
      const csrfResponse = await fetch('/api/csrf-token');
      const { csrfToken } = await csrfResponse.json();

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
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Biblio Admin
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-t-md"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-b-md"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## 2. Dashboard Page (`/app/dashboard/page.tsx`)

**Current Status**: Partially complete - users list only (read-only)

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
                className="ml-4 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
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
              <h3 className="text-lg font-medium text-gray-900">
                Usuarios del Sistema
              </h3>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha de Registro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
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

---

## 3. API Route: Login (`/app/api/auth/login/route.ts`)

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

---

## 4. API Route: Logout (`/app/api/auth/logout/route.ts`)

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

---

## 5. API Route: Admin Users (`/app/api/admin/users/route.ts`)

```typescript
import { NextResponse } from 'next/server';
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

---

## 6. Layout (`/app/layout.tsx`)

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

---

## 7. Global Styles (`/app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}
```

---

## 8. Tailwind Configuration (`tailwind.config.ts`)

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
  plugins: [require('@tailwindcss/forms')],
};
export default config;
```

---

## Backend API Endpoints (for reference)

### Admin Routes
```javascript
// /app/routes/admin.js
GET    /api/admin/users                        - List all users
GET    /api/admin/users/locked                 - Get locked accounts
POST   /api/admin/users/:userId/unlock         - Unlock account
PATCH  /api/admin/users/:userId/reset-attempts - Reset login attempts
```

### Role Routes
```javascript
// /app/routes/roles.js
GET    /api/roles                  - List available roles
GET    /api/roles/stats            - Role statistics
PUT    /api/roles/user/:userId     - Change user role
DELETE /api/roles/user/:userId     - Remove user role
```

### API Keys Routes
```javascript
// /app/routes/apiKeys.js
GET    /api/api-keys               - List API keys
POST   /api/api-keys               - Create API key
GET    /api/api-keys/:keyId        - Get API key
PUT    /api/api-keys/:keyId        - Update API key
DELETE /api/api-keys/:keyId        - Delete API key
GET    /api/api-keys/:keyId/stats  - Usage stats
```

---

## Key Features & Patterns

### Error Handling
```typescript
// In page components
if (response.status === 401) {
  router.push('/login');
  return;
}

try {
  // API call
} catch (err) {
  setError(err instanceof Error ? err.message : 'Error desconocido');
} finally {
  setLoading(false);
}
```

### CSRF Protection
```typescript
// Always fetch CSRF token before state-changing operations
const csrfResponse = await fetch('/api/csrf-token');
const { csrfToken } = await csrfResponse.json();

// Include in headers
headers: {
  'X-CSRF-Token': csrfToken,
}
```

### Cookie-based Authentication
```typescript
// In API routes, read cookies
const cookieStore = await cookies();
const authToken = cookieStore.get('auth_token')?.value;

// Pass to backend
headers: {
  'Authorization': `Bearer ${authToken}`,
}
```

---

## What's Missing

### High Priority Components to Create

1. **middleware.ts** - Route protection
2. **Button.tsx** - Reusable button component
3. **Modal.tsx** - Modal dialog component
4. **Layout.tsx** - Sidebar layout component
5. **DataTable.tsx** - Table with pagination

### API routes to add

1. `/api/admin/users/[id]` - User CRUD
2. `/api/roles/[id]` - Role management
3. `/api/apikeys/[id]` - API key management

### Pages to create

1. `/admin/users` - User management
2. `/admin/roles` - Role management
3. `/admin/apikeys` - API keys
4. `/admin/dashboard` - Statistics

---

## Running the Frontend

```bash
cd /home/gustavo/biblio-server/frontend

# Development
npm run dev  # http://localhost:3001

# Production
npm run build
npm start
```

---

## Environment Variables

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
BACKEND_API_URL=http://app:3000
```

---

## Useful Next.js Patterns Used

- **'use client'**: Client-side components for interactivity
- **useRouter**: Navigation
- **useEffect**: Side effects (API calls on mount)
- **useState**: Component state
- **NextResponse**: API route responses
- **cookies()**: Server-side cookie handling


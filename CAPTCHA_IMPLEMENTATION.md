# Implementación de CAPTCHA

Este documento describe la implementación de CAPTCHA en el sistema de autenticación usando la biblioteca `svg-captcha`.

## 📋 Características

- ✅ CAPTCHA generado en el servidor usando SVG
- ✅ Dos tipos de CAPTCHA: texto y matemático
- ✅ Validación automática con expiración de 5 minutos
- ✅ Tokens de un solo uso (se eliminan después de la validación)
- ✅ Integrado en el endpoint de registro
- ✅ Configurable mediante variables de entorno
- ✅ Limpieza automática de tokens expirados

## 🚀 Endpoints Disponibles

### 1. Generar CAPTCHA

**GET** `/api/captcha/generate`

Genera un nuevo desafío CAPTCHA.

**Query Parameters:**
- `type` (opcional): `'text'` o `'math'` (por defecto: `'text'`)
- `size` (opcional): número de caracteres (4-8, por defecto: 6, solo para tipo texto)

**Respuesta:**
```json
{
  "tokenId": "a1b2c3d4...",
  "svg": "<svg>...</svg>",
  "expiresAt": "2025-11-17T13:00:00.000Z",
  "type": "text"
}
```

**Ejemplos:**
```bash
# CAPTCHA de texto (por defecto)
curl http://localhost:3000/api/captcha/generate

# CAPTCHA de texto con 8 caracteres
curl http://localhost:3000/api/captcha/generate?size=8

# CAPTCHA matemático
curl http://localhost:3000/api/captcha/generate?type=math
```

### 2. Registro con CAPTCHA

**POST** `/api/auth/register`

Registra un nuevo usuario con validación de CAPTCHA.

**Body:**
```json
{
  "username": "usuario123",
  "password": "MiPassword123!",
  "email": "usuario@example.com",
  "captchaToken": "a1b2c3d4...",
  "captchaResponse": "ABC123"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Usuario creado exitosamente. Por favor revisa tu email para verificar tu cuenta.",
  "userId": 123,
  "emailSent": true
}
```

**Errores posibles:**
```json
// CAPTCHA faltante
{
  "error": "CAPTCHA requerido",
  "message": "Se requiere CAPTCHA para esta operación",
  "captchaRequired": true
}

// CAPTCHA incorrecto
{
  "error": "CAPTCHA inválido",
  "message": "CAPTCHA incorrecto",
  "captchaRequired": true
}

// CAPTCHA expirado
{
  "error": "CAPTCHA inválido",
  "message": "CAPTCHA expirado",
  "captchaRequired": true
}
```

### 3. Estadísticas de CAPTCHA

**GET** `/api/captcha/stats`

Obtiene estadísticas sobre el almacenamiento de CAPTCHA (útil para monitoreo).

**Respuesta:**
```json
{
  "totalStored": 15,
  "expired": 2
}
```

## 🔧 Configuración

### Variables de Entorno

Puedes agregar estas variables en tu archivo `.env`:

```bash
# Habilitar/deshabilitar CAPTCHA (por defecto: habilitado)
CAPTCHA_REQUIRED=true

# Para desarrollo, puedes deshabilitar el CAPTCHA
# CAPTCHA_REQUIRED=false
```

## 💻 Flujo de Implementación Frontend

### Ejemplo HTML/JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Registro</title>
</head>
<body>
  <form id="registerForm">
    <input type="text" id="username" placeholder="Usuario" required>
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Contraseña" required>

    <!-- CAPTCHA -->
    <div id="captchaContainer"></div>
    <input type="text" id="captchaResponse" placeholder="Ingresa el código CAPTCHA" required>
    <button type="button" onclick="loadCaptcha()">🔄 Recargar CAPTCHA</button>

    <button type="submit">Registrar</button>
  </form>

  <script>
    let captchaToken = null;

    // Cargar CAPTCHA al iniciar
    window.onload = loadCaptcha;

    async function loadCaptcha() {
      try {
        const response = await fetch('http://localhost:3000/api/captcha/generate');
        const data = await response.json();

        captchaToken = data.tokenId;
        document.getElementById('captchaContainer').innerHTML = data.svg;
        document.getElementById('captchaResponse').value = '';
      } catch (error) {
        console.error('Error cargando CAPTCHA:', error);
      }
    }

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        captchaToken: captchaToken,
        captchaResponse: document.getElementById('captchaResponse').value
      };

      try {
        // Obtener CSRF token
        const csrfResponse = await fetch('http://localhost:3000/api/csrf-token');
        const csrfData = await csrfResponse.json();

        // Registrar usuario
        const response = await fetch('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfData.csrfToken
          },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
          alert('¡Registro exitoso! Revisa tu email.');
          window.location.href = '/login.html';
        } else {
          alert(result.message || 'Error en el registro');
          // Recargar CAPTCHA en caso de error
          loadCaptcha();
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar usuario');
        loadCaptcha();
      }
    });
  </script>
</body>
</html>
```

### Ejemplo React

```jsx
import React, { useState, useEffect } from 'react';

function RegisterForm() {
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    captchaResponse: ''
  });

  useEffect(() => {
    loadCaptcha();
  }, []);

  const loadCaptcha = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/captcha/generate');
      const data = await response.json();
      setCaptchaToken(data.tokenId);
      setCaptchaSvg(data.svg);
      setFormData(prev => ({ ...prev, captchaResponse: '' }));
    } catch (error) {
      console.error('Error cargando CAPTCHA:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Obtener CSRF token
      const csrfResponse = await fetch('http://localhost:3000/api/csrf-token');
      const csrfData = await csrfResponse.json();

      // Registrar usuario
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrfToken
        },
        body: JSON.stringify({
          ...formData,
          captchaToken
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert('¡Registro exitoso! Revisa tu email.');
      } else {
        alert(result.message || 'Error en el registro');
        loadCaptcha(); // Recargar CAPTCHA
      }
    } catch (error) {
      console.error('Error:', error);
      loadCaptcha();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Usuario"
        value={formData.username}
        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      {/* CAPTCHA */}
      <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
      <input
        type="text"
        placeholder="Ingresa el código CAPTCHA"
        value={formData.captchaResponse}
        onChange={(e) => setFormData({ ...formData, captchaResponse: e.target.value })}
        required
      />
      <button type="button" onClick={loadCaptcha}>🔄 Recargar CAPTCHA</button>

      <button type="submit">Registrar</button>
    </form>
  );
}

export default RegisterForm;
```

## 🧪 Pruebas

### Test Manual con cURL

```bash
#!/bin/bash

# 1. Generar CAPTCHA
echo "1. Generando CAPTCHA..."
CAPTCHA_RESPONSE=$(curl -s http://localhost:3000/api/captcha/generate)
echo "$CAPTCHA_RESPONSE"

# Extraer tokenId (requiere jq)
TOKEN_ID=$(echo "$CAPTCHA_RESPONSE" | jq -r '.tokenId')
echo "Token ID: $TOKEN_ID"

# Guardar SVG en archivo para visualizar
echo "$CAPTCHA_RESPONSE" | jq -r '.svg' > captcha.svg
echo "CAPTCHA guardado en captcha.svg"

# 2. Obtener CSRF token
echo -e "\n2. Obteniendo CSRF token..."
CSRF_RESPONSE=$(curl -s http://localhost:3000/api/csrf-token)
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')
echo "CSRF Token: $CSRF_TOKEN"

# 3. Registrar usuario (debes ingresar manualmente el código del CAPTCHA)
read -p "Ingresa el código CAPTCHA que ves en captcha.svg: " CAPTCHA_CODE

echo -e "\n3. Registrando usuario..."
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "captchaToken": "'$TOKEN_ID'",
    "captchaResponse": "'$CAPTCHA_CODE'"
  }' | jq
```

## 📊 Arquitectura

### Flujo de Datos

```
1. Frontend solicita CAPTCHA
   ↓
2. Backend genera CAPTCHA con svg-captcha
   ↓
3. Backend guarda respuesta correcta en memoria con tokenId
   ↓
4. Backend envía SVG y tokenId al frontend
   ↓
5. Usuario ve CAPTCHA y escribe respuesta
   ↓
6. Frontend envía registro con tokenId y respuesta
   ↓
7. Backend valida respuesta contra token almacenado
   ↓
8. Si es correcto, procesa registro
   ↓
9. Token se elimina (un solo uso)
```

### Almacenamiento

Actualmente, los tokens CAPTCHA se almacenan en memoria usando un `Map`:

```javascript
captchaStore: Map<tokenId, { text: string, expiresAt: number }>
```

**Nota para producción:** Para un entorno de producción con múltiples instancias, considera usar Redis:

```javascript
// Ejemplo con Redis
const redis = require('redis');
const client = redis.createClient();

// Guardar CAPTCHA
await client.setEx(`captcha:${tokenId}`, 300, captchaText); // 5 min TTL

// Validar CAPTCHA
const stored = await client.get(`captcha:${tokenId}`);
```

## 🔒 Seguridad

- ✅ Tokens aleatorios de 64 caracteres (32 bytes hex)
- ✅ Expiración automática de 5 minutos
- ✅ Un solo uso (token eliminado después de validación)
- ✅ Validación case-insensitive
- ✅ Caracteres confusos excluidos (0oO1ilI)
- ✅ Rate limiting en endpoint de generación (50 req/15min)
- ✅ Limpieza automática de tokens expirados

## 📝 Notas Importantes

1. **Desarrollo vs Producción:** Usa `CAPTCHA_REQUIRED=false` en desarrollo si necesitas hacer pruebas rápidas.

2. **Almacenamiento:** En producción con múltiples servidores, implementa Redis para compartir tokens entre instancias.

3. **Accesibilidad:** Considera ofrecer CAPTCHA de audio o alternativas para usuarios con discapacidades visuales.

4. **UX:** Siempre recarga el CAPTCHA después de un intento fallido de registro.

5. **Timeout:** Los CAPTCHA expiran en 5 minutos. Considera mostrar un temporizador al usuario.

## 🔗 Biblioteca Usada

- **svg-captcha:** https://github.com/lepture/captcha
- Versión: Instalada en el proyecto
- Licencia: MIT

## 🛠️ Próximas Mejoras

- [ ] Implementar CAPTCHA de audio para accesibilidad
- [ ] Migrar almacenamiento a Redis para escalabilidad
- [ ] Agregar métricas y monitoreo de tasas de éxito/fallo
- [ ] Implementar CAPTCHA adaptativo (más difícil después de fallos)
- [ ] Agregar soporte para reCAPTCHA como alternativa

# Validación de Contraseñas - Guía Rápida

## 🎯 Requisitos de Contraseña

```
✅ Mínimo 8 caracteres
✅ Máximo 128 caracteres
✅ Sin espacios
✅ Al menos 1 mayúscula (A-Z)
✅ Al menos 1 minúscula (a-z)
✅ Al menos 2 números (0-9)
✅ Al menos 1 carácter especial (!@#$%^&*...)
```

## 📊 Niveles de Fortaleza

| Score | Fortaleza | Color |
|-------|-----------|-------|
| 90-100 | Excellent | 🟢 Verde |
| 70-89 | Strong | 🔵 Azul |
| 50-69 | Good | 🟡 Amarillo |
| 30-49 | Fair | 🟠 Naranja |
| 0-29 | Weak | 🔴 Rojo |

## 🔌 API Endpoints

### 1. Obtener Requisitos

```bash
GET /api/auth/password-requirements
```

**Respuesta:**
```json
{
  "requirements": {
    "minLength": 8,
    "maxLength": 128,
    "minNumbers": 2,
    "minUppercase": 1,
    "minLowercase": 1,
    "minSpecialChars": 1,
    "allowSpaces": false
  }
}
```

### 2. Validar Contraseña

```bash
POST /api/auth/validate-password
Content-Type: application/json
X-CSRF-Token: <token>

{
  "password": "MyPassword123!"
}
```

**Respuesta:**
```json
{
  "valid": true,
  "score": 85,
  "strength": "strong",
  "message": "Password is strong (85/100)",
  "requirements": [...],
  "feedback": []
}
```

## 💻 Ejemplos de Uso

### JavaScript/TypeScript

```typescript
// Validar contraseña en tiempo real
async function validatePassword(password: string) {
  // 1. Obtener CSRF token
  const csrfRes = await fetch('/api/csrf-token');
  const { csrfToken } = await csrfRes.json();

  // 2. Validar contraseña
  const response = await fetch('/api/auth/validate-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ password })
  });

  return await response.json();
}

// Uso
const result = await validatePassword('MyPassword123!');
console.log(result.valid);      // true
console.log(result.score);      // 85
console.log(result.strength);   // "strong"
console.log(result.requirements); // Array con detalles
console.log(result.feedback);   // Array con sugerencias
```

### React Component

```tsx
import { useState, useEffect } from 'react';

function PasswordInput() {
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');

  // Obtener CSRF token al montar
  useEffect(() => {
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setCsrfToken(data.csrfToken));
  }, []);

  // Validar cuando cambia la contraseña
  const handlePasswordChange = async (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    if (newPassword.length > 0) {
      const response = await fetch('/api/auth/validate-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ password: newPassword })
      });

      const result = await response.json();
      setValidation(result);
    } else {
      setValidation(null);
    }
  };

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="Ingresa tu contraseña"
      />

      {validation && (
        <div>
          {/* Barra de fortaleza */}
          <div className="strength-bar">
            <div
              className={`strength-fill strength-${validation.strength}`}
              style={{ width: `${validation.score}%` }}
            />
          </div>

          <p>Fortaleza: {validation.strength} ({validation.score}/100)</p>

          {/* Lista de requisitos */}
          <ul>
            {validation.requirements.map(req => (
              <li key={req.name} className={req.met ? 'met' : 'unmet'}>
                {req.met ? '✅' : '❌'} {req.label}
              </li>
            ))}
          </ul>

          {/* Sugerencias */}
          {validation.feedback.length > 0 && (
            <div className="feedback">
              <p>Sugerencias:</p>
              <ul>
                {validation.feedback.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### CSS para el Componente

```css
.strength-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin: 8px 0;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.strength-weak { background-color: #ef4444; }
.strength-fair { background-color: #f97316; }
.strength-good { background-color: #eab308; }
.strength-strong { background-color: #3b82f6; }
.strength-excellent { background-color: #22c55e; }

.met { color: #22c55e; }
.unmet { color: #ef4444; }
```

## 🧪 Testing Rápido

```bash
# Test 1: Contraseña débil
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')" \
  -d '{"password":"weak"}' | jq .

# Test 2: Contraseña fuerte
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')" \
  -d '{"password":"MySecurePass123@"}' | jq .

# Test 3: Obtener requisitos
curl http://localhost:3000/api/auth/password-requirements | jq .
```

## 📋 Checklist para Implementar en Frontend

- [ ] Obtener requisitos de contraseña al cargar la página
- [ ] Agregar input de contraseña con validación en tiempo real
- [ ] Mostrar barra de fortaleza visual (score/100)
- [ ] Listar requisitos con checkmarks (✅/❌)
- [ ] Mostrar feedback/sugerencias cuando hay errores
- [ ] Deshabilitar botón de submit si `valid: false`
- [ ] Agregar tooltip con ejemplo de contraseña válida
- [ ] Mostrar caracteres especiales permitidos
- [ ] Implementar debounce para evitar validaciones excesivas

## 🎨 Mensaje de Error Sugerido

Cuando `valid: false`:

```
❌ La contraseña no cumple con los requisitos de seguridad

Requisitos faltantes:
• Add 4 more character(s)
• Add uppercase letter (A-Z)
• Add 2 more number(s)

Ejemplo de contraseña válida: Welcome2024@
```

## ⚡ Optimizaciones

### Debounce para Validación

```typescript
import { debounce } from 'lodash';

const validatePasswordDebounced = debounce(async (password: string) => {
  // ... validación
}, 500); // Esperar 500ms después del último cambio
```

### Cache de CSRF Token

```typescript
let cachedCsrfToken = null;

async function getCsrfToken() {
  if (!cachedCsrfToken) {
    const res = await fetch('/api/csrf-token');
    const data = await res.json();
    cachedCsrfToken = data.csrfToken;
  }
  return cachedCsrfToken;
}
```

## 📝 Notas Importantes

- ✅ Los endpoints de validación requieren CSRF token
- ✅ La validación es en tiempo real, no requiere autenticación
- ✅ El score es de 0-100 (más alto = más seguro)
- ✅ Los requisitos son configurables en `app/utils/passwordValidator.js`
- ✅ La validación backend siempre prevalece sobre la del frontend

## 🔗 Documentación Completa

Ver `PASSWORD_VALIDATION.md` para detalles completos sobre:
- Sistema de puntuación detallado
- Todos los patrones detectados
- Bonificaciones y penalizaciones
- Configuración avanzada
- Ejemplos de integración

---

**Versión**: 1.0.0
**Última actualización**: 2025-11-12

# Sistema de Validación de Contraseñas

## 📋 Resumen

Se ha implementado un sistema completo de validación de contraseñas que proporciona feedback detallado sobre la fortaleza de las contraseñas, incluyendo:

- Validación de requisitos individuales
- Puntuación de fortaleza (0-100)
- Clasificación de fortaleza (weak, fair, good, strong, excellent)
- Feedback específico sobre qué mejorar
- Endpoints API para validación en tiempo real

## ✅ Requisitos de Contraseña

### Requisitos Obligatorios

| Requisito | Descripción | Ejemplo |
|-----------|-------------|---------|
| **Longitud mínima** | Al menos 8 caracteres | `MyPass12!` (9 chars) |
| **Longitud máxima** | Menos de 128 caracteres | - |
| **Sin espacios** | No puede contener espacios | ❌ `My Pass123!` ✅ `MyPass123!` |
| **Mayúsculas** | Al menos 1 letra mayúscula | `MyPass123!` (M) |
| **Minúsculas** | Al menos 1 letra minúscula | `MyPass123!` (yass) |
| **Números** | Al menos 2 números | `MyPass123!` (1,2,3) |
| **Caracteres especiales** | Al menos 1 carácter especial | `MyPass123!` (!) |

### Caracteres Especiales Permitidos

```
!@#$%^&*()_+-=[]{};\':"|,.<>/?~`
```

### Ejemplos

#### ✅ Contraseñas Válidas

- `MyPassword123!` - Strong (cumple todos los requisitos)
- `Welcome2024@Home` - Excellent (larga y compleja)
- `Admin@2024!!` - Good (cumple requisitos básicos)
- `Test1234!` - Fair (cumple mínimos)

#### ❌ Contraseñas Inválidas

- `password` - No mayúsculas, no números, no especiales
- `PASSWORD` - No minúsculas, no números, no especiales
- `Password1` - Solo 1 número (requiere 2), no especiales
- `Pass 123!` - Contiene espacios
- `Pass1!` - Menos de 8 caracteres

## 🎯 Sistema de Puntuación

### Puntos Base (70 puntos máximo)

| Requisito Cumplido | Puntos |
|--------------------|--------|
| Longitud mínima (8 chars) | 15 |
| Longitud máxima (128 chars) | 5 |
| Sin espacios | 5 |
| 1+ mayúscula | 15 |
| 1+ minúscula | 15 |
| 2+ números | 20 |
| 1+ carácter especial | 20 |

### Bonificaciones (30 puntos máximo)

| Bonificación | Puntos |
|--------------|--------|
| Más de 2 mayúsculas | +5 |
| Más de 4 minúsculas | +5 |
| Más de 3 números | +5 |
| Más de 2 caracteres especiales | +5 |
| 12+ caracteres | +5 |
| 16+ caracteres | +5 |
| 20+ caracteres | +5 |

### Penalizaciones

| Patrón Detectado | Penalización |
|------------------|--------------|
| Solo letras | -10 |
| Solo números | -10 |
| Caracteres repetidos (aaa, 111) | -10 |
| Números secuenciales (123, 456) | -10 |
| Letras secuenciales (abc, def) | -10 |
| Palabras comunes (password, admin, qwerty) | -10 |

### Clasificación de Fortaleza

| Score | Fortaleza | Descripción |
|-------|-----------|-------------|
| 90-100 | **Excellent** | Contraseña muy segura |
| 70-89 | **Strong** | Contraseña segura |
| 50-69 | **Good** | Contraseña aceptable |
| 30-49 | **Fair** | Contraseña débil |
| 0-29 | **Weak** | Contraseña muy débil |

## 🔌 API Endpoints

### 1. Obtener Requisitos de Contraseña

```http
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
    "specialCharsExamples": "!@#$%^&*()_+-=[]{};\':"|,.<>/?~`",
    "allowSpaces": false
  },
  "description": "Password must meet all of the following requirements"
}
```

### 2. Validar Contraseña

```http
POST /api/auth/validate-password
Content-Type: application/json

{
  "password": "MyPassword123!"
}
```

**Respuesta Exitosa:**
```json
{
  "valid": true,
  "score": 85,
  "strength": "strong",
  "message": "Password is strong (85/100)",
  "requirements": [
    {
      "name": "minLength",
      "label": "At least 8 characters",
      "met": true,
      "required": true,
      "current": 15,
      "expected": 8
    },
    {
      "name": "maxLength",
      "label": "Less than 128 characters",
      "met": true,
      "required": true,
      "current": 15,
      "expected": 128
    },
    {
      "name": "noSpaces",
      "label": "No spaces",
      "met": true,
      "required": true
    },
    {
      "name": "uppercase",
      "label": "At least 1 uppercase letter",
      "met": true,
      "required": true,
      "current": 2,
      "expected": 1
    },
    {
      "name": "lowercase",
      "label": "At least 1 lowercase letter",
      "met": true,
      "required": true,
      "current": 10,
      "expected": 1
    },
    {
      "name": "numbers",
      "label": "At least 2 numbers",
      "met": true,
      "required": true,
      "current": 3,
      "expected": 2
    },
    {
      "name": "specialChars",
      "label": "At least 1 special character",
      "met": true,
      "required": true,
      "current": 1,
      "expected": 1,
      "examples": "!@#$%^&*()_+-=[]{};\':"|,.<>/?~`"
    }
  ],
  "feedback": []
}
```

**Respuesta con Errores:**
```json
{
  "valid": false,
  "score": 25,
  "strength": "weak",
  "message": "Password does not meet requirements (3 requirement(s) not met)",
  "requirements": [
    {
      "name": "minLength",
      "label": "At least 8 characters",
      "met": false,
      "required": true,
      "current": 6,
      "expected": 8
    },
    {
      "name": "uppercase",
      "label": "At least 1 uppercase letter",
      "met": false,
      "required": true,
      "current": 0,
      "expected": 1
    },
    {
      "name": "numbers",
      "label": "At least 2 numbers",
      "met": false,
      "required": true,
      "current": 1,
      "expected": 2
    },
    // ... otros requisitos
  ],
  "feedback": [
    "Add 2 more character(s)",
    "Add uppercase letter (A-Z)",
    "Add 1 more number(s)"
  ]
}
```

## 💻 Uso en el Código

### Backend

#### Validación Simple (existente)

```javascript
const { validatePassword } = require('./middleware/sanitize');

const result = validatePassword('MyPassword123!');
// { valid: true, message: 'Password meets all requirements' }

if (!result.valid) {
  return res.status(400).json({
    error: 'Weak password',
    message: result.message
  });
}
```

#### Validación Detallada (nueva)

```javascript
const { validatePasswordStrength } = require('./utils/passwordValidator');

const validation = validatePasswordStrength('MyPassword123!');

console.log(validation.valid);       // true
console.log(validation.score);       // 85
console.log(validation.strength);    // 'strong'
console.log(validation.requirements); // Array de requisitos
console.log(validation.feedback);     // Array de sugerencias
```

#### Obtener Configuración

```javascript
const { getPasswordRequirements } = require('./utils/passwordValidator');

const config = getPasswordRequirements();
console.log(config.minLength);        // 8
console.log(config.minNumbers);       // 2
console.log(config.specialCharsExamples); // '!@#$%^&*()...'
```

### Frontend

#### Obtener Requisitos

```typescript
const response = await fetch('/api/auth/password-requirements');
const { requirements } = await response.json();

console.log(requirements.minLength); // 8
console.log(requirements.minNumbers); // 2
```

#### Validar en Tiempo Real

```typescript
const validatePassword = async (password: string) => {
  const response = await fetch('/api/auth/validate-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  const validation = await response.json();

  // validation.valid - ¿Cumple todos los requisitos?
  // validation.score - Puntuación 0-100
  // validation.strength - 'weak' | 'fair' | 'good' | 'strong' | 'excellent'
  // validation.requirements - Array de requisitos con estado
  // validation.feedback - Array de sugerencias

  return validation;
};
```

#### Ejemplo de Componente React

```tsx
const [password, setPassword] = useState('');
const [validation, setValidation] = useState(null);

const handlePasswordChange = async (e) => {
  const newPassword = e.target.value;
  setPassword(newPassword);

  if (newPassword) {
    const result = await validatePassword(newPassword);
    setValidation(result);
  }
};

return (
  <div>
    <input
      type="password"
      value={password}
      onChange={handlePasswordChange}
    />

    {validation && (
      <div>
        <p>Fortaleza: {validation.strength}</p>
        <p>Puntuación: {validation.score}/100</p>

        <ul>
          {validation.requirements.map(req => (
            <li key={req.name}>
              {req.met ? '✅' : '❌'} {req.label}
            </li>
          ))}
        </ul>

        {validation.feedback.length > 0 && (
          <div>
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
```

## 📂 Archivos Modificados/Creados

### Nuevos Archivos

1. **`app/utils/passwordValidator.js`**
   - Función `validatePasswordStrength()` - Validación detallada
   - Función `validatePassword()` - Validación simple (compatible)
   - Función `getPasswordRequirements()` - Obtener configuración
   - Constante `PASSWORD_RULES` - Reglas configurables

### Archivos Modificados

2. **`app/middleware/sanitize.js`**
   - Función `validatePassword()` actualizada para usar `passwordValidator.js`
   - Mantiene compatibilidad hacia atrás

3. **`app/routes/auth.js`**
   - Nuevo endpoint `GET /api/auth/password-requirements`
   - Nuevo endpoint `POST /api/auth/validate-password`
   - Los endpoints de registro y cambio de contraseña siguen usando la validación

## 🧪 Testing

### Test 1: Contraseña que Cumple Todos los Requisitos

```bash
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password":"MySecurePass123!"}' \
  | jq .
```

**Resultado esperado:**
- `valid: true`
- `score: 80-90`
- `strength: "strong"` o `"excellent"`
- Todos los requisitos con `met: true`

### Test 2: Contraseña Débil

```bash
curl -X POST http://localhost:3000/api/auth/validate-password \
  -H "Content-Type: application/json" \
  -d '{"password":"pass1"}' \
  | jq .
```

**Resultado esperado:**
- `valid: false`
- `score: < 30`
- `strength: "weak"`
- Múltiples requisitos con `met: false`
- Array `feedback` con sugerencias

### Test 3: Obtener Requisitos

```bash
curl http://localhost:3000/api/auth/password-requirements | jq .
```

**Resultado esperado:**
```json
{
  "requirements": {
    "minLength": 8,
    "maxLength": 128,
    "minNumbers": 2,
    "minUppercase": 1,
    "minLowercase": 1,
    "minSpecialChars": 1,
    "specialCharsExamples": "!@#$%^&*()_+-=[]{};\':"|,.<>/?~`",
    "allowSpaces": false
  },
  "description": "Password must meet all of the following requirements"
}
```

### Test 4: Registro con Contraseña Inválida

```bash
CSRF=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "username":"testuser",
    "email":"test@example.com",
    "password":"weak"
  }' \
  | jq .
```

**Resultado esperado:**
- Status: 400
- Error: "Weak password"
- Message con requisito no cumplido

## 🔒 Seguridad

### Buenas Prácticas Implementadas

✅ **Validación del lado del servidor**: La validación siempre ocurre en el backend
✅ **Sin revelación de información**: No se revelan usuarios existentes
✅ **Prevención de ataques de diccionario**: Requisitos de complejidad
✅ **Prevención de patrones comunes**: Detección de palabras comunes
✅ **Longitud razonable**: Límite de 128 caracteres previene DoS
✅ **No almacenar contraseñas**: Solo se validan, nunca se almacenan en logs

### Consideraciones

- Las contraseñas NUNCA se logean en producción
- La validación es solo una capa, el hash bcrypt es la protección real
- Los endpoints de validación son públicos (no requieren autenticación)
- El endpoint de validación puede ser usado por atacantes, pero solo revela los requisitos públicos

## 🎨 Recomendaciones para UI

### Indicador de Fortaleza Visual

```tsx
const getStrengthColor = (strength: string) => {
  switch (strength) {
    case 'excellent': return 'bg-green-500';
    case 'strong': return 'bg-blue-500';
    case 'good': return 'bg-yellow-500';
    case 'fair': return 'bg-orange-500';
    case 'weak': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

<div className="w-full bg-gray-200 rounded-full h-2">
  <div
    className={`h-2 rounded-full ${getStrengthColor(validation.strength)}`}
    style={{ width: `${validation.score}%` }}
  />
</div>
```

### Lista de Requisitos

```tsx
{validation.requirements.map(req => (
  <div key={req.name} className="flex items-center gap-2">
    {req.met ? (
      <CheckCircle className="text-green-500" />
    ) : (
      <XCircle className="text-red-500" />
    )}
    <span className={req.met ? 'text-gray-600' : 'text-gray-900'}>
      {req.label}
    </span>
  </div>
))}
```

## 📊 Métricas y Análisis

El sistema proporciona datos útiles para análisis:

- **Score promedio** de contraseñas creadas
- **Requisitos más fallados**
- **Patrones comunes** detectados
- **Tiempo hasta cumplir requisitos**

Estos datos pueden ayudar a ajustar los requisitos en el futuro.

## ⚙️ Configuración

Para modificar los requisitos, edita `app/utils/passwordValidator.js`:

```javascript
const PASSWORD_RULES = {
  minLength: 8,          // Cambiar longitud mínima
  maxLength: 128,        // Cambiar longitud máxima
  minNumbers: 2,         // Cambiar números requeridos
  minUppercase: 1,       // Cambiar mayúsculas requeridas
  minLowercase: 1,       // Cambiar minúsculas requeridas
  minSpecialChars: 1,    // Cambiar caracteres especiales requeridos
  allowSpaces: false     // Permitir/prohibir espacios
};
```

---

**Implementado**: 2025-11-12
**Versión**: 1.0.0
**Compatibilidad**: Retrocompatible con sistema existente

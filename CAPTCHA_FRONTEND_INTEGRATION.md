# Integración de CAPTCHA en el Frontend

Este documento describe cómo se integró el CAPTCHA en el frontend de React/TypeScript.

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`frontend/src/components/Captcha.tsx`** - Componente reutilizable de CAPTCHA
   - Carga automática del CAPTCHA al montar el componente
   - Botón de recarga para generar nuevo CAPTCHA
   - Manejo de estados: loading, error
   - Validación en tiempo real
   - Interfaz limpia con Tailwind CSS

### Archivos Modificados

1. **`frontend/src/pages/RegisterPage.tsx`** - Página de registro
   - Importación del componente Captcha
   - Estados agregados: `captchaToken`, `captchaResponse`, `captchaError`
   - Validación de CAPTCHA antes de enviar el formulario
   - Manejo de errores específicos de CAPTCHA

## 🎨 Componente Captcha

### Propiedades (Props)

```typescript
interface CaptchaProps {
  onCaptchaChange: (tokenId: string | null, response: string) => void;
  error?: string;
}
```

### Características

- ✅ **Carga automática**: Se carga el CAPTCHA al montar el componente
- ✅ **Botón de recarga**: Icono de refresh para generar nuevo CAPTCHA
- ✅ **Estados visuales**: Loading spinner, mensajes de error
- ✅ **Validación en tiempo real**: Feedback inmediato al usuario
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla
- ✅ **Accesible**: Labels y mensajes de ayuda apropiados

### Uso del Componente

```tsx
import { Captcha } from '@/components/Captcha';

function MyForm() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResponse, setCaptchaResponse] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  const handleCaptchaChange = (tokenId: string | null, response: string) => {
    setCaptchaToken(tokenId);
    setCaptchaResponse(response);
    setCaptchaError('');
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Otros campos del formulario */}

      <Captcha
        onCaptchaChange={handleCaptchaChange}
        error={captchaError}
      />

      <button type="submit">Enviar</button>
    </form>
  );
}
```

## 🔄 Flujo de Usuario

### 1. Carga Inicial
```
Usuario visita /register
  ↓
Componente Captcha se monta
  ↓
Fetch a /api/captcha/generate
  ↓
SVG se muestra en el formulario
```

### 2. Llenado del Formulario
```
Usuario completa campos
  ↓
Usuario escribe código CAPTCHA
  ↓
onCaptchaChange actualiza estados
```

### 3. Recarga de CAPTCHA (opcional)
```
Usuario hace clic en botón refresh
  ↓
Nuevo fetch a /api/captcha/generate
  ↓
Nuevo SVG reemplaza el anterior
  ↓
Input de CAPTCHA se limpia
```

### 4. Envío del Formulario
```
Usuario hace clic en "Registrarse"
  ↓
Validaciones frontend (username, password, etc.)
  ↓
Validación de CAPTCHA (token y response)
  ↓
Fetch a /api/csrf-token
  ↓
POST a /api/auth/register con:
  - username
  - email
  - password
  - captchaToken
  - captchaResponse
  ↓
Si CAPTCHA inválido: mostrar error y mantener formulario
Si éxito: mostrar mensaje de verificación de email
```

## 🎯 Validación en el Frontend

### Validaciones Implementadas

```typescript
// 1. CAPTCHA debe estar cargado
if (!captchaToken || !captchaResponse) {
  setCaptchaError('Por favor completa el CAPTCHA');
  return;
}

// 2. Manejo de errores del servidor
if (data.captchaRequired ||
    data.error === 'CAPTCHA inválido' ||
    data.error === 'CAPTCHA requerido') {
  setCaptchaError(data.message || 'CAPTCHA incorrecto');
  // No resetear el formulario, solo mostrar error
  return;
}
```

## 📱 Interfaz de Usuario

### Estados Visuales

#### Loading
```
┌─────────────────────────────────┐
│ Verificación CAPTCHA            │
├─────────────────────────────────┤
│                                 │
│         ⟳ (spinning)            │
│                                 │
└─────────────────────────────────┘
```

#### Loaded
```
┌─────────────────────────────────┐
│ Verificación CAPTCHA        🔄  │
├─────────────────────────────────┤
│                                 │
│    [CAPTCHA SVG Image]          │
│                                 │
└─────────────────────────────────┘
│ [Ingresa el código...]          │
└─────────────────────────────────┘
  El CAPTCHA expira en 5 minutos
```

#### Error
```
┌─────────────────────────────────┐
│ Verificación CAPTCHA        🔄  │
├─────────────────────────────────┤
│                                 │
│     ⚠️ Error al cargar          │
│        CAPTCHA                  │
│                                 │
└─────────────────────────────────┘
```

#### Con Error de Validación
```
┌─────────────────────────────────┐
│ Verificación CAPTCHA        🔄  │
├─────────────────────────────────┤
│    [CAPTCHA SVG Image]          │
└─────────────────────────────────┘
│ [ABCD12] ← input con borde rojo │
└─────────────────────────────────┘
⚠️ CAPTCHA incorrecto
```

## 🎨 Estilos y Diseño

### Tailwind Classes Usadas

```css
/* Contenedor principal */
.space-y-3           /* Espaciado vertical */

/* Contenedor del CAPTCHA */
.border.border-gray-300.rounded-lg.p-4.bg-gray-50
.relative            /* Para posicionar el botón refresh */

/* Botón de recarga */
.absolute.top-2.right-2
.p-2.text-gray-500.hover:text-indigo-600
.hover:bg-white.rounded-md.transition-colors

/* Input */
.appearance-none.relative.block.w-full.px-3.py-2
.border.border-gray-300
.placeholder-gray-500.text-gray-900.rounded-md
.focus:outline-none.focus:ring-indigo-500.focus:border-indigo-500

/* Estados de error */
.border-red-300      /* Input con error */
.text-red-600        /* Texto de error */
```

### Personalización

Para personalizar los colores, modifica las clases en `Captcha.tsx`:

```tsx
// Cambiar color del botón refresh
className="... hover:text-indigo-600"  // → hover:text-blue-600

// Cambiar color del borde de error
className={`... ${error ? 'border-red-300' : 'border-gray-300'}`}
// → border-orange-300

// Cambiar tamaño del CAPTCHA
// Modifica el parámetro 'size' en la llamada a /api/captcha/generate
```

## 🧪 Testing Manual

### Escenario 1: Registro Exitoso
1. Ir a http://localhost:3001/register
2. Completar todos los campos
3. Ver el CAPTCHA cargado
4. Escribir el código correctamente
5. Click en "Registrarse"
6. **Esperado**: Mensaje de éxito y email enviado

### Escenario 2: CAPTCHA Incorrecto
1. Completar formulario
2. Escribir código CAPTCHA incorrecto
3. Click en "Registrarse"
4. **Esperado**:
   - Error: "CAPTCHA incorrecto"
   - Formulario no se limpia
   - Nuevo CAPTCHA NO se carga (usuario puede intentar de nuevo)

### Escenario 3: Recargar CAPTCHA
1. Ver CAPTCHA inicial
2. Click en icono 🔄
3. **Esperado**:
   - Loading spinner
   - Nuevo CAPTCHA diferente
   - Input se limpia

### Escenario 4: CAPTCHA Expirado
1. Cargar CAPTCHA
2. Esperar más de 5 minutos
3. Completar formulario y enviar
4. **Esperado**: Error "CAPTCHA expirado"

## 🔧 Configuración Avanzada

### Cambiar Tipo de CAPTCHA

Para usar CAPTCHA matemático en lugar de texto:

```tsx
// En Captcha.tsx, línea ~27
const response = await fetch('/api/captcha/generate?type=math', {
  credentials: 'include'
});
```

### Cambiar Tamaño de CAPTCHA

```tsx
// En Captcha.tsx, línea ~27
const response = await fetch('/api/captcha/generate?size=8', {
  credentials: 'include'
});
```

### Deshabilitar CAPTCHA (solo desarrollo)

En el archivo `.env` del backend:
```bash
CAPTCHA_REQUIRED=false
```

El frontend seguirá mostrando el componente, pero el backend no validará.

## 🐛 Solución de Problemas

### Problema: CAPTCHA no se muestra
**Solución**:
- Verificar que el backend esté corriendo en http://localhost:3000
- Abrir DevTools → Network → verificar llamada a `/api/captcha/generate`
- Verificar CORS en el backend

### Problema: Error "CAPTCHA requerido" incluso con CAPTCHA
**Solución**:
- Verificar que `captchaToken` y `captchaResponse` se estén enviando
- Revisar el payload en DevTools → Network → Request Body

### Problema: SVG no se renderiza correctamente
**Solución**:
- El SVG usa `dangerouslySetInnerHTML`
- Verificar que el contenido del SVG sea válido
- Comprobar que no haya políticas CSP bloqueando

### Problema: CAPTCHA siempre dice "incorrecto"
**Solución**:
- Verificar que la respuesta sea case-insensitive (el backend ya lo maneja)
- Revisar logs del backend para ver el error específico
- Verificar que el token no haya expirado

## 📊 Métricas y Monitoreo

Para monitorear el uso de CAPTCHA:

```typescript
// Agregar tracking en Captcha.tsx
const loadCaptcha = async () => {
  // ... código existente

  // Track CAPTCHA generation
  analytics.track('captcha_generated', {
    type: data.type,
    timestamp: new Date()
  });
};

// Track CAPTCHA success/failure en RegisterPage.tsx
if (!response.ok && data.captchaRequired) {
  analytics.track('captcha_failed', {
    error: data.error
  });
}
```

## 🚀 Próximas Mejoras

- [ ] Agregar CAPTCHA de audio para accesibilidad
- [ ] Implementar retry automático en caso de error de red
- [ ] Agregar animación de transición al cambiar CAPTCHA
- [ ] Mostrar temporizador de expiración
- [ ] Agregar CAPTCHA en otros formularios (login, reset password)
- [ ] Tests unitarios para el componente Captcha
- [ ] Tests E2E con Playwright/Cypress

## 📝 Notas Importantes

1. **No almacenar la respuesta del CAPTCHA**: Solo almacenar el token y la respuesta del usuario
2. **Regenerar CAPTCHA después de error**: Considerar recargar automáticamente
3. **Accesibilidad**: Planear alternativas para usuarios con discapacidades visuales
4. **UX**: El CAPTCHA agrega fricción, considerar solo en registro y no en login
5. **Rate Limiting**: El backend tiene rate limiting en generación de CAPTCHA (50 req/15min)

## 🔗 Referencias

- Componente: `frontend/src/components/Captcha.tsx`
- Página de registro: `frontend/src/pages/RegisterPage.tsx`
- Documentación backend: `CAPTCHA_IMPLEMENTATION.md`
- API endpoints: `app/routes/captcha.js`

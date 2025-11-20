# 🤖 CAPTCHA Implementation - Quick Start

Implementación completa de CAPTCHA usando `svg-captcha` para proteger el registro de usuarios.

## 📁 Archivos del Sistema

### Backend
```
app/
├── services/captchaService.js    ← Lógica principal
├── routes/captcha.js             ← API endpoints
├── middleware/captcha.js         ← Validación
└── routes/auth.js                ← Integrado en registro
```

### Frontend
```
frontend/src/
├── components/Captcha.tsx        ← Componente React
└── pages/RegisterPage.tsx        ← Página con CAPTCHA
```

### Documentación
```
├── CAPTCHA_IMPLEMENTATION.md           ← 📖 Backend detallado
├── CAPTCHA_FRONTEND_INTEGRATION.md     ← 📖 Frontend detallado
├── CAPTCHA_COMPLETE_GUIDE.md           ← 📖 Guía completa
├── CAPTCHA_README.md                   ← 📖 Este archivo (inicio rápido)
└── test_captcha.sh                     ← 🧪 Script de pruebas
```

## 🚀 Inicio Rápido (5 minutos)

### 1. Verificar que todo funciona

```bash
# Probar backend
./test_captcha.sh

# Probar frontend
# Abrir http://localhost:3001/register
```

### 2. Usar en tu código

**Backend (agregar a otro endpoint):**
```javascript
const { validateCaptchaMiddleware } = require('./middleware/captcha');

router.post('/mi-endpoint', validateCaptchaMiddleware, async (req, res) => {
  // Tu código aquí
});
```

**Frontend (agregar a otro formulario):**
```tsx
import { Captcha } from '@/components/Captcha';

function MiFormulario() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResponse, setCaptchaResponse] = useState('');

  const handleCaptchaChange = (tokenId: string | null, response: string) => {
    setCaptchaToken(tokenId);
    setCaptchaResponse(response);
  };

  return (
    <form>
      {/* Otros campos */}
      <Captcha onCaptchaChange={handleCaptchaChange} />
      <button type="submit">Enviar</button>
    </form>
  );
}
```

## 📖 ¿Qué debo leer?

| Rol | Lee este archivo | Tiempo |
|-----|------------------|--------|
| **Quick Start** | `CAPTCHA_README.md` (este) | 5 min |
| **Backend Dev** | `CAPTCHA_IMPLEMENTATION.md` | 15 min |
| **Frontend Dev** | `CAPTCHA_FRONTEND_INTEGRATION.md` | 15 min |
| **Full Overview** | `CAPTCHA_COMPLETE_GUIDE.md` | 30 min |

## 🎯 API Endpoints

```bash
# Generar CAPTCHA (texto)
GET /api/captcha/generate

# Generar CAPTCHA (matemático)
GET /api/captcha/generate?type=math

# Estadísticas
GET /api/captcha/stats

# Registro con CAPTCHA
POST /api/auth/register
Body: {
  username, email, password,
  captchaToken, captchaResponse
}
```

## 🧪 Testing Rápido

```bash
# Test automático
./test_captcha.sh

# Test manual
curl http://localhost:3000/api/captcha/generate | jq

# Test de registro completo
# 1. Abrir http://localhost:3001/register
# 2. Llenar formulario
# 3. Completar CAPTCHA
# 4. Submit
```

## ⚙️ Configuración

```bash
# En .env
CAPTCHA_REQUIRED=true     # Producción
# CAPTCHA_REQUIRED=false  # Desarrollo (deshabilitar)
```

## 🎨 Características

- ✅ **Backend**: Generación SVG, validación, rate limiting
- ✅ **Frontend**: Componente React reutilizable, recarga manual
- ✅ **Seguridad**: Tokens únicos, expiración 5 min, case-insensitive
- ✅ **UX**: Carga automática, feedback inmediato, diseño moderno
- ✅ **Testing**: Script automatizado, tests manuales documentados

## 🐛 Problemas Comunes

### CAPTCHA no se muestra
```bash
# Verificar backend
curl http://localhost:3000/api/captcha/generate
# Verificar CORS en app/app.js
```

### Error "CAPTCHA requerido"
```javascript
// Verificar que se envíen ambos campos
console.log({captchaToken, captchaResponse});
```

### CAPTCHA siempre incorrecto
```bash
# Ver logs del backend
docker logs nodejs --tail 20
# Verificar que no haya expirado (5 min)
```

## 📞 Ayuda

- **Bugs**: Revisar `docker logs nodejs`
- **Frontend**: Abrir DevTools → Network → ver requests
- **Backend**: Ver `test_captcha.sh` para ejemplos
- **Dudas**: Leer documentación completa en archivos MD

## 🔗 Links Útiles

- [svg-captcha GitHub](https://github.com/lepture/captcha)
- [OWASP CAPTCHA Guide](https://cheatsheetseries.owasp.org/cheatsheets/CAPTCHA_Cheat_Sheet.html)

---

**Status**: ✅ Implementación Completa
**Versión**: 1.0.0
**Fecha**: Noviembre 2025

¿Necesitas más detalles? → Lee `CAPTCHA_COMPLETE_GUIDE.md`

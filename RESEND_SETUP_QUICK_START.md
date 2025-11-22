# Resend Setup - Quick Start Guide

## 🚀 Configuración Rápida de Resend

Esta guía te ayudará a configurar Resend para el envío de emails de verificación en menos de 15 minutos.

## ¿Por qué Resend?

- ✅ **Gratis**: 3,000 emails/mes (100/día) sin tarjeta de crédito
- ✅ **Fácil**: API moderna y simple
- ✅ **Confiable**: Excelente deliverability, no van a spam
- ✅ **Automático**: SPF/DKIM configurados automáticamente
- ✅ **Rápido**: Setup en minutos

## Paso 1: Crear Cuenta en Resend

1. Ve a https://resend.com
2. Click en "Sign Up"
3. Registra tu email
4. Verifica tu email (revisa inbox)
5. Inicia sesión

**Total: 2 minutos**

## Paso 2: Obtener API Key

1. En el dashboard de Resend, ve a la sección **API Keys**
2. Click en **"Create API Key"**
3. Dale un nombre descriptivo: "Biblio Admin Development"
4. Selecciona permisos: **"Sending access"**
5. Click en **"Create"**
6. **IMPORTANTE**: Copia el API key (empieza con `re_`)
   - Solo lo verás una vez
   - Guárdalo en un lugar seguro

**Total: 1 minuto**

## Paso 3: Instalar Resend en el Backend

```bash
cd app
npm install resend
```

**Total: 30 segundos**

## Paso 4: Configurar Variables de Entorno

Edita tu archivo `.env` (si no existe, cópialo de `.env.example`):

```bash
# En /home/gustavo/biblio-server/.env
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=onboarding@resend.dev
FRONTEND_URL=http://localhost:3001
```

**Notas:**
- Usa `onboarding@resend.dev` como remitente mientras haces pruebas
- NO necesitas verificar dominio para empezar
- Los emails llegarán desde `onboarding@resend.dev`

**Total: 1 minuto**

## Paso 5: Reiniciar Backend

```bash
# Desde /home/gustavo/biblio-server
docker compose restart backend
```

**Total: 10 segundos**

## Paso 6: Probar

1. Ve a http://localhost:3001/register
2. Crea una cuenta de prueba:
   - Username: testuser
   - Email: **tu email real** (Gmail, Hotmail, etc.)
   - Password: password123
3. Revisa tu bandeja de entrada
4. **Deberías recibir un email bonito con botón de verificación** 📧

**Total: 2 minutos**

## ✅ ¡Listo!

Si recibiste el email, ¡ya está funcionando! Los emails:
- ✅ Llegarán al inbox (no a spam)
- ✅ Se verán profesionales
- ✅ Tendrán un botón de verificación
- ✅ Funcionarán en Gmail, Hotmail, Yahoo, etc.

---

## 🔧 Opcional: Verificar Tu Dominio Propio

Si quieres que los emails vengan de `noreply@tudominio.com` en lugar de `onboarding@resend.dev`:

### 1. Agregar Dominio en Resend

1. En Resend Dashboard → **Domains**
2. Click en **"Add Domain"**
3. Ingresa tu dominio: `tudominio.com`
4. Click en **"Add"**

### 2. Configurar DNS

Resend te mostrará los registros DNS que necesitas agregar:

#### SPF Record
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

#### DKIM Records (3 registros)
```
Type: TXT
Name: resend._domainkey
Value: [copiado de Resend]
TTL: 3600

Type: TXT
Name: resend2._domainkey
Value: [copiado de Resend]
TTL: 3600

Type: TXT
Name: resend3._domainkey
Value: [copiado de Resend]
TTL: 3600
```

### 3. Agregar Registros a tu DNS

**En Cloudflare:**
1. Ve a tu dominio → DNS → Records
2. Click "Add record"
3. Copia cada registro de Resend
4. Guarda

**En GoDaddy:**
1. Ve a "DNS Management"
2. Agrega cada registro TXT
3. Guarda

**En otros providers:** Similar

### 4. Esperar Verificación

- DNS propaga en 15 minutos - 24 horas
- Resend verificará automáticamente
- Te notificará cuando esté listo

### 5. Actualizar .env

```bash
EMAIL_FROM=noreply@tudominio.com
```

### 6. Reiniciar

```bash
docker compose restart backend
```

---

## 🧪 Testing en Gmail/Hotmail

### Verificar que NO va a spam:

1. Registra una cuenta con tu email de Gmail/Hotmail
2. Revisa **Inbox** (no Spam)
3. Abre el email
4. Click derecho → "Show original" (Gmail) o "View message source" (Outlook)
5. Busca:
   ```
   spf=pass
   dkim=pass
   dmarc=pass
   ```

Si todos dicen **"pass"**, ¡perfecto! Tus emails NO irán a spam.

---

## 📊 Monitoreo

### Dashboard de Resend

En https://resend.com/emails puedes ver:
- ✅ Emails enviados
- ✅ Tasa de entrega (delivery rate)
- ✅ Tasa de rebote (bounce rate)
- ✅ Tasa de quejas de spam
- ✅ Logs de cada email

### Alertas

Resend te avisará si:
- ⚠️  Bounce rate > 5%
- ⚠️  Spam complaint rate > 0.3%
- ⚠️  Alcanzas 80% del límite mensual

---

## 💰 Límites del Tier Gratuito

| Métrica | Límite Gratis |
|---------|---------------|
| Emails/mes | 3,000 |
| Emails/día | 100 |
| Destinatarios/email | 1 (transaccional) |
| Dominios verificados | 1 |
| API keys | Ilimitadas |

**¿Qué pasa si supero el límite?**
- Los emails adicionales NO se enviarán
- Recibirás notificación por email
- Puedes upgrade a plan Pro ($20/mes por 50k emails)

---

## 🐛 Troubleshooting

### "Email no llega"

1. **Revisa logs del backend:**
   ```bash
   docker logs nodejs
   ```

2. **Verifica que está en producción:**
   - En desarrollo, los links se imprimen en consola
   - En producción, se envían emails

3. **Revisa Resend Dashboard:**
   - Ve a https://resend.com/emails
   - Busca el email enviado
   - Revisa si fue "delivered" o "bounced"

4. **Revisa spam folder:**
   - Algunos providers pueden marcar como spam la primera vez
   - Si está en spam, márcalo como "Not spam"

### "API Key inválido"

```
Error: Invalid API key
```

- Verifica que copiaste el key completo (empieza con `re_`)
- Verifica que no tiene espacios al inicio/final
- Verifica que está en el archivo `.env` correcto

### "Rate limit exceeded"

```
Error: Rate limit exceeded
```

- Alcanzaste el límite diario (100 emails/día)
- Espera hasta mañana o upgrade a plan Pro

### "Domain not verified"

```
Error: Domain not verified
```

- Si usas tu propio dominio, verifica que esté verificado en Resend
- Mientras tanto, usa `onboarding@resend.dev`

---

## 📚 Recursos Adicionales

- **Documentación Resend**: https://resend.com/docs
- **API Reference**: https://resend.com/docs/api-reference
- **Email Deliverability Guide**: Ver `EMAIL_DELIVERABILITY_GUIDE.md`
- **Status de Resend**: https://status.resend.com

---

## 🎯 Checklist de Setup

- [ ] Cuenta de Resend creada
- [ ] API key obtenida y copiada
- [ ] `npm install resend` ejecutado
- [ ] `.env` actualizado con `RESEND_API_KEY` y `EMAIL_FROM`
- [ ] Backend reiniciado
- [ ] Email de prueba enviado y recibido
- [ ] Email llegó a inbox (NO a spam)
- [ ] (Opcional) Dominio verificado en Resend
- [ ] (Opcional) Registros DNS configurados

---

**Última actualización**: 2025-11-12
**Tiempo total de setup**: ~10 minutos

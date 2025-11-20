# Guía de Entregabilidad de Emails - Evitar Spam en Gmail, Hotmail, etc.

## 🚨 El Problema

Los servicios de email como Gmail, Hotmail/Outlook, Yahoo, etc. están rechazando o marcando como spam los emails que no cumplen con los nuevos estándares de autenticación de 2025.

### Nuevos Requisitos 2025

**Microsoft Outlook/Hotmail (Desde Mayo 5, 2025):**
- Rechazará emails de remitentes que envíen más de 5,000 emails/día sin SPF, DKIM y DMARC
- Los emails no conformes irán directamente a la carpeta de Spam

**Gmail y Yahoo:**
- Requieren SPF, DKIM y DMARC para remitentes que envíen más de 5,000 emails/día
- Tasa de spam complaints debe ser < 0.3% (idealmente < 0.1%)
- Tasa de rebote (bounce rate) debe ser < 2%

## 🔐 Protocolos de Autenticación Requeridos

### 1. SPF (Sender Policy Framework)
- Especifica qué servidores pueden enviar emails en nombre de tu dominio
- Se configura como registro TXT en tu DNS

### 2. DKIM (DomainKeys Identified Mail)
- Firma criptográfica que verifica que el email no fue alterado
- También se configura como registro TXT en tu DNS

### 3. DMARC (Domain-based Message Authentication)
- Política que indica qué hacer con emails que fallan SPF/DKIM
- **Obligatorio desde 2024** para Gmail y Yahoo
- Se configura como registro TXT en tu DNS

## ✅ Soluciones Recomendadas

### Opción 1: Resend (RECOMENDADO) ⭐

**Ventajas:**
- ✅ Moderno, diseñado para desarrolladores
- ✅ Configura SPF/DKIM automáticamente
- ✅ Tier gratuito: 3,000 emails/mes (100/día)
- ✅ API simple y fácil de integrar
- ✅ Excelente deliverability
- ✅ Templates con React Email (opcional)
- ✅ No requiere tarjeta de crédito para el tier gratuito

**Precio:**
- Gratis: 3,000 emails/mes
- Pro: $20/mes por 50,000 emails
- Escala: Precios personalizados

**Cuándo usar:**
- Proyectos pequeños a medianos
- Necesitas emails transaccionales (verificación, reset password)
- Quieres setup rápido sin configuración compleja
- No planeas enviar más de 3,000 emails/mes inicialmente

**Setup:**
1. Crear cuenta en https://resend.com
2. Verificar tu dominio
3. Copiar API key
4. Instalar: `npm install resend`

### Opción 2: SendGrid

**Ventajas:**
- ✅ Líder de la industria, muy confiable
- ✅ Excelente deliverability
- ✅ Analytics completo
- ✅ Tier gratuito: 100 emails/día (3,000/mes)
- ✅ Soporte para marketing y transaccional

**Desventajas:**
- ❌ Interfaz más compleja
- ❌ Requiere tarjeta de crédito incluso para tier gratuito
- ❌ Puede suspender cuentas sin previo aviso

**Precio:**
- Gratis: 100 emails/día
- Essentials: $19.95/mes por 50,000 emails
- Pro: $89.95/mes por 100,000 emails

**Cuándo usar:**
- Necesitas analytics avanzado
- Planeas hacer email marketing además de transaccional
- Necesitas A/B testing
- Empresa mediana/grande

### Opción 3: AWS SES

**Ventajas:**
- ✅ Más económico: $0.10 por 1,000 emails
- ✅ Altamente escalable
- ✅ Integrado con ecosistema AWS
- ✅ Excelente para alto volumen

**Desventajas:**
- ❌ Configuración más compleja
- ❌ Requiere experiencia con AWS
- ❌ Proceso de aprobación manual (salir del sandbox)
- ❌ No incluye logs ni analytics por defecto

**Precio:**
- $0.10 por 1,000 emails enviados
- $0.12 por GB de datos adjuntos
- Sin costos fijos

**Cuándo usar:**
- Ya usas AWS
- Vas a enviar millones de emails
- Tienes experiencia configurando AWS
- Necesitas el precio más bajo posible

### Opción 4: Mailgun

**Ventajas:**
- ✅ Enfocado en desarrolladores
- ✅ Control granular
- ✅ Tier gratuito: 100 emails/día durante 3 meses
- ✅ API potente y flexible
- ✅ Usado por Lyft, American Express, Wikipedia

**Desventajas:**
- ❌ Solo 3 meses gratis, luego requiere pago
- ❌ Interfaz menos moderna

**Precio:**
- Trial: 100 emails/día por 3 meses
- Foundation: $35/mes por 50,000 emails
- Growth: $80/mes por 100,000 emails

**Cuándo usar:**
- Necesitas control avanzado sobre el envío
- Requieres webhooks complejos
- Quieres validación de emails incorporada

### Opción 5: Postmark

**Ventajas:**
- ✅ Especializado en emails transaccionales
- ✅ Deliverability excepcional (98%+)
- ✅ Entrega ultrarrápida (ideal para 2FA, verificación)
- ✅ Excelente reputación

**Desventajas:**
- ❌ No tiene tier gratuito
- ❌ Solo transaccional (no marketing)

**Precio:**
- $15/mes por 10,000 emails
- $50/mes por 50,000 emails

**Cuándo usar:**
- Emails críticos (verificación, 2FA, reset password)
- Necesitas entrega garantizada y rápida
- Dispuesto a pagar por calidad premium

## 📊 Comparación Rápida

| Servicio | Gratis/Mes | Precio 50k | Setup | Deliverability | Mejor Para |
|----------|-----------|------------|-------|----------------|------------|
| **Resend** | 3,000 | $20 | ⭐⭐⭐⭐⭐ Fácil | ⭐⭐⭐⭐ Excelente | Startups, devs |
| **SendGrid** | 3,000 | $19.95 | ⭐⭐⭐ Moderado | ⭐⭐⭐⭐⭐ Líder | Empresas, marketing |
| **AWS SES** | No | $5 | ⭐⭐ Complejo | ⭐⭐⭐⭐ Muy bueno | Alto volumen, AWS |
| **Mailgun** | 3,000* | $35 | ⭐⭐⭐⭐ Fácil | ⭐⭐⭐⭐ Excelente | Devs avanzados |
| **Postmark** | No | $50 | ⭐⭐⭐⭐ Fácil | ⭐⭐⭐⭐⭐ Premium | Emails críticos |

*Solo 3 meses

## 🎯 Recomendación para Este Proyecto

**Para Biblio Admin, recomiendo usar Resend porque:**

1. ✅ **Tier gratuito generoso**: 3,000 emails/mes es más que suficiente para verificación de usuarios
2. ✅ **Setup simple**: Integración en < 15 minutos
3. ✅ **No requiere tarjeta**: Puedes empezar inmediatamente
4. ✅ **SPF/DKIM automático**: No necesitas configurar DNS manualmente al inicio
5. ✅ **Excelente deliverability**: Los emails llegan a inbox, no a spam
6. ✅ **API moderna**: Diseñada para Node.js/JavaScript
7. ✅ **Templates con React**: Puedes crear emails bonitos fácilmente

## 🚀 Plan de Implementación

### Paso 1: Crear cuenta en Resend
1. Ir a https://resend.com
2. Registrarse con email (gratis, sin tarjeta)
3. Verificar email

### Paso 2: Configurar dominio (Opcional al inicio)
Para máxima deliverability, verifica tu dominio:
1. En Resend Dashboard → Domains → Add Domain
2. Copiar registros DNS (SPF, DKIM)
3. Agregarlos a tu proveedor DNS (GoDaddy, Cloudflare, etc.)
4. Esperar verificación (15 min - 24 hrs)

**Nota:** Puedes empezar sin dominio usando `onboarding@resend.dev` como remitente

### Paso 3: Obtener API Key
1. En Resend Dashboard → API Keys
2. Create API Key
3. Copiar la key (empieza con `re_`)

### Paso 4: Instalar y configurar
```bash
cd app
npm install resend
```

### Paso 5: Actualizar `.env`
```env
# Email Service (Resend)
RESEND_API_KEY=re_tu_api_key_aqui
EMAIL_FROM=noreply@tudominio.com
# O usa el dominio de prueba: onboarding@resend.dev
FRONTEND_URL=http://localhost:3001
```

### Paso 6: Actualizar `app/services/emailService.js`
Usar la implementación con Resend (ver abajo)

## 📝 Mejores Prácticas Adicionales

### 1. Warming up de dominio nuevo
Si tienes un dominio nuevo:
- Día 1-2: Envía 50-100 emails a usuarios comprometidos
- Día 3-4: Aumenta a 200-500 emails
- Día 5-7: Aumenta a 1,000 emails
- Semana 2+: Dobla el volumen cada 2-3 días si bounce rate < 2%

### 2. Content de emails
✅ **Hacer:**
- Usar nombre de remitente reconocible
- Subject line claro y descriptivo
- Texto plano + HTML
- Link de unsubscribe visible
- Dominio verificado

❌ **Evitar:**
- MAYÚSCULAS en subject
- Muchos signos de exclamación!!!
- Palabras spam: "gratis", "urgente", "ganar dinero"
- Links acortados (bit.ly)
- Solo imágenes, sin texto

### 3. Monitoreo
Revisar regularmente:
- Bounce rate (debe ser < 2%)
- Spam complaint rate (debe ser < 0.1%)
- Open rate (transaccional típico: 20-40%)
- Delivery rate (debe ser > 98%)

### 4. Validación de emails
Antes de enviar, validar que:
- Email tiene formato válido
- Dominio existe (MX record)
- No está en blacklist

## 🔧 Configuración DNS (Para dominio propio)

Cuando configures tu dominio en Resend (o cualquier servicio), necesitarás agregar estos registros DNS:

### SPF Record
```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:_spf.resend.com ~all
```

### DKIM Record
```
Tipo: TXT
Nombre: resend._domainkey
Valor: [proporcionado por Resend]
```

### DMARC Record (Importante para 2025)
```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:dmarc@tudominio.com
```

**Notas:**
- `p=none` al inicio (solo monitoreo)
- Después de 2 semanas, cambiar a `p=quarantine`
- Después de 1 mes, cambiar a `p=reject` (máxima seguridad)

## 📚 Recursos Adicionales

- [Resend Documentation](https://resend.com/docs)
- [SPF Record Checker](https://mxtoolbox.com/spf.aspx)
- [DKIM Validator](https://mxtoolbox.com/dkim.aspx)
- [DMARC Analyzer](https://dmarcian.com/dmarc-inspector/)
- [Email Spam Tester](https://www.mail-tester.com/)

## 🎓 Testing de Deliverability

Antes de lanzar en producción:

1. **Mail Tester**: Envía email de prueba a https://www.mail-tester.com
   - Debe dar score de 8/10 o superior

2. **Crear cuentas de prueba**: Gmail, Hotmail, Yahoo
   - Verifica que lleguen a Inbox, no a Spam

3. **Revisar headers**: Ver que SPF, DKIM y DMARC pasen
   - En Gmail: Ver → Show Original

## ⚠️ Troubleshooting Común

### "Emails van a spam"
- Verifica SPF/DKIM/DMARC
- Revisa content (evita palabras spam)
- Verifica IP/dominio no esté en blacklist
- Warm up el dominio gradualmente

### "Bounce rate alto"
- Valida emails antes de enviar
- Limpia lista de emails inactivos
- Implementa double opt-in

### "Dominio no verifica"
- DNS puede tardar 24-48 hrs
- Verifica que los registros sean exactos
- Contacta soporte de tu DNS provider

---

**Última actualización**: 2025-11-12
**Próxima revisión**: Revisar cuando lancemos a producción

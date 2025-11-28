# Guía de Uso del Módulo de Compras

## 📋 Tabla de Contenidos
1. [Introducción](#introducción)
2. [Conceptos Clave](#conceptos-clave)
3. [Tipos de Compra](#tipos-de-compra)
4. [Flujos de Trabajo](#flujos-de-trabajo)
5. [Procedimientos Paso a Paso](#procedimientos-paso-a-paso)
   - 1️⃣ Crear Solicitud
   - 2️⃣ Aprobar Solicitud
   - 3️⃣ Solicitar Cotizaciones
   - 4️⃣ Agregar Cotizaciones
   - 5️⃣ Evaluar Cotizaciones
   - 6️⃣ Crear Orden de Compra
   - 7️⃣ Rechazar Solicitud
   - 8️⃣ [Administrar Estados de Orden](#8️⃣-administrar-estados-de-orden-de-compra-miembro-de-junta) ⭐ **NUEVO**
6. [Gestión de Proveedores](#gestión-de-proveedores)
7. [Filtros y Búsquedas](#filtros-y-búsquedas)
8. [Panel de Control](#panel-de-control-dashboard)
9. [Preguntas Frecuentes](#preguntas-frecuentes)
10. [Mejores Prácticas](#consejos-y-mejores-prácticas)

---

## Introducción

El módulo de Compras de Biblio-Server permite gestionar de manera eficiente todo el proceso de adquisiciones de la Asociación Bernardino Rivadavia (ABR), desde la solicitud inicial hasta la orden de compra y recepción de productos.

**Usuarios del sistema:**
- **Empleados de Biblioteca**: Pueden crear solicitudes de compra
- **Miembros de la Junta Directiva**: Aprueban solicitudes y seleccionan proveedores
- **Administrador**: Gestiona proveedores, categorías y configuración

---

## Conceptos Clave

### 📌 Solicitud de Compra (Purchase Request)
Es el documento inicial donde se especifica qué se necesita comprar, cuánto cuesta aproximadamente y con qué urgencia.

**Estados posibles:**
- **Borrador**: La solicitud está en proceso de creación
- **Pendiente de Aprobación**: Enviada para que la junta la revise
- **Aprobada**: La junta autorizó la compra
- **Rechazada**: La junta decidió no aprobar la compra
- **Completada**: Se finalizó toda la compra y se recibió el producto

### 💰 Tipo de Compra
Define cómo se selecciona el proveedor:

1. **Compra Directa**: Se compra directamente a un proveedor sin solicitar cotizaciones
   - Usado para compras menores o proveedores ya conocidos
   - Estados: Aprobada → Orden Creada → Completada

2. **Competencia de Precios**: Se solicitan cotizaciones a varios proveedores y se elige la mejor
   - Usado para compras mayores o cuando hay múltiples opciones
   - Estados: Aprobada → En Cotización → Cotizaciones Recibidas → En Evaluación → Orden Creada → Completada

### 🏢 Proveedor
Es la empresa o persona de la cual compramos. Incluye:
- Nombre legal y comercial
- CUIT
- Datos de contacto (teléfono, email)
- Condición fiscal
- Categoría (para clasificar)

### 📝 Cotización
Es la propuesta de precio que hace un proveedor. Incluye:
- Precio unitario y total
- Plazos de entrega
- Condiciones de pago

### 📦 Orden de Compra
Es el documento oficial que confirma la compra a un proveedor específico. Se crea después de elegir qué cotización usar.

**Estados de una Orden de Compra:**
- **Borrador**: Creada pero no enviada
- **Enviada**: Se envió al proveedor
- **Confirmada**: Proveedor confirmó (estado más común)
- **Parcialmente Recibida**: Parte del producto llegó
- **Recibida**: Producto completo en manos ✓
- **Facturada**: Se recibió factura
- **Pagada**: Pago completado ✓
- **Cancelada**: Orden fue cancelada

*Para detalles sobre cómo cambiar estados, ver sección [8️⃣ Administrar Estados de Orden](#8️⃣-administrar-estados-de-orden-de-compra-miembro-de-junta)*

---

## Tipos de Compra

### 1. Compra Directa
**Cuándo usarla:**
- Compras menores (< $10,000)
- Productos de consumo regular
- Proveedores exclusivos o conocidos

**Ejemplo:**
- Compra de papel para fotocopiadoras
- Mantenimiento de equipos con técnico específico
- Servicios de limpieza

**Flujo:** Aprobada → Orden Creada → Completada

### 2. Competencia de Precios
**Cuándo usarla:**
- Compras mayores (> $10,000)
- Nuevos proveedores o productos
- Cuando hay múltiples opciones disponibles

**Ejemplo:**
- Compra de nuevos libros para la biblioteca
- Renovación de equipos de cómputo
- Servicios de mantenimiento anual

**Flujo:** Aprobada → En Cotización → Cotizaciones Recibidas → En Evaluación → Orden Creada → Completada

---

## Flujos de Trabajo

### 🔄 Flujo Completo de una Compra por Competencia de Precios

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EMPLEADO crea SOLICITUD DE COMPRA (Borrador)             │
│    ├─ Describe qué necesita                                 │
│    ├─ Indica cantidad y presupuesto estimado                │
│    └─ Envía a aprobación                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. JUNTA DIRECTIVA revisa solicitud (Pendiente Aprobación)  │
│    ├─ Valida presupuesto y necesidad                        │
│    └─ Aprueba o rechaza                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ (Aprobada)
┌─────────────────────────────────────────────────────────────┐
│ 3. JUNTA solicita COTIZACIONES a proveedores (En Cotización)│
│    ├─ Selecciona proveedores interesados                    │
│    └─ Sistema envía solicitud de cotización                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PROVEEDORES responden con cotizaciones                   │
│    ├─ Ingresan precio y condiciones                         │
│    └─ Sistema registra (Cotizaciones Recibidas)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. JUNTA DIRECTIVA evalúa y elige proveedor (En Evaluación) │
│    ├─ Compara precios y condiciones                         │
│    ├─ Selecciona mejor cotización                           │
│    └─ Genera orden de compra                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Se genera ORDEN DE COMPRA                                │
│    └─ Se envía al proveedor                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Se recibe el producto y se completa                      │
│    └─ Estado: Completada                                    │
└─────────────────────────────────────────────────────────────┘
```

### 🚀 Flujo Simple de una Compra Directa

```
┌──────────────────────────────┐
│ EMPLEADO crea solicitud      │
│ (Tipo: Compra Directa)       │
└──────────────────────────────┘
            ↓
┌──────────────────────────────┐
│ JUNTA aprueba solicitud      │
│ (Estado: Aprobada)           │
└──────────────────────────────┘
            ↓
┌──────────────────────────────┐
│ JUNTA crea orden directamente│
│ (sin solicitar cotizaciones) │
└──────────────────────────────┘
            ↓
┌──────────────────────────────┐
│ Compra completada            │
└──────────────────────────────┘
```

---

## Procedimientos Paso a Paso

### 1️⃣ Crear una Solicitud de Compra (Empleado)

**Paso 1: Acceder al módulo**
- Click en **"Compras"** en el menú principal
- Click en **"Solicitudes de Compra"**

**Paso 2: Crear nueva solicitud**
- Click en botón azul **"+ Nueva Solicitud"**
- Se abre el formulario

**Paso 3: Completar información básica**

```
Tipo de Compra: [Compra Directa / Competencia de Precios]
Título: "Compra de libros de Historia Argentina"
Descripción: Necesitamos 50 libros de historia argentina para
            la sección de adultos. Preferentemente edición 2023.
Categoría: [Libros y Materiales]
Prioridad: [Normal / Alta / Urgente]
```

**Paso 4: Agregar items**
- Click en **"+ Agregar Item"**
- Especificar cada artículo:
  - Descripción: "Libro Historia Argentina - Edición 2023"
  - Cantidad: 50
  - Unidad: "Unidades"
  - Precio estimado: $500 c/u
  - Especificaciones: "Tapa dura, más de 400 páginas"

**Paso 5: Presupuesto estimado**
- Sistema calcula automáticamente: 50 × $500 = **$25,000**

**Paso 6: Justificación (opcional)**
```
Justificación: "Los libros enriquecerán nuestra colección de
historia local y responden a solicitudes de usuarios adultos
que se preparan para exámenes de historia."
```

**Paso 7: Enviar para aprobación**
- Click en **"Enviar para Aprobación"**
- Estado cambia a "Pendiente de Aprobación"
- La Junta Directiva recibe notificación

---

### 2️⃣ Aprobar una Solicitud (Miembro de Junta)

**Paso 1: Ver solicitudes pendientes**
- En el Dashboard de Compras, verá **"3 Pendientes de Aprobación"**
- Click para ver la lista

**Paso 2: Revisar solicitud**
- Click en la solicitud para ver detalles completos
- Revise:
  - ¿Es necesaria la compra? ✓
  - ¿El presupuesto es razonable? ✓
  - ¿El tipo de compra es correcto? ✓

**Paso 3: Aprobar**
- Click en botón **"Aprobar"**
- Se abre diálogo con campo de comentarios (opcional)
- Comentario: "Aprobado. Proceder con competencia de precios"
- Click en **"Confirmar Aprobación"**

**Resultado:**
- Estado cambia a **"Aprobada"**
- Ahora puede solicitar cotizaciones

---

### 3️⃣ Solicitar Cotizaciones (Miembro de Junta)

**Paso 1: Abrir solicitud aprobada**
- Ir a Solicitudes de Compra
- Filtrar por estado **"Aprobada"**
- Click en la solicitud

**Paso 2: Solicitar cotizaciones**
- Click en botón **"Solicitar Cotizaciones"**
- Se abre diálogo con lista de proveedores

**Paso 3: Seleccionar proveedores**

```
Ejemplo: Para la compra de libros
☑ Editorial Planeta Argentina
☑ Distribuidora Cervantes
☑ Casa del Libro Argentina
☐ (otros proveedores no aplican)
```

**Paso 4: Enviar solicitud**
- Click en **"Enviar Cotizaciones"**
- Sistema envía RFQ a los proveedores seleccionados

**Resultado:**
- Estado cambia a **"En Cotización"**
- Se espera respuesta de proveedores
- Plazo típico: 5-10 días hábiles

---

### 4️⃣ Agregar Cotizaciones Manualmente

**Cuando un proveedor responde por email o teléfono:**

**Paso 1: Abrir solicitud en cotización**
- Click en la solicitud
- Buscar sección **"Cotizaciones"**

**Paso 2: Agregar cotización**
- Click en **"+ Agregar Cotización"**

**Paso 3: Completar datos**

```
Proveedor: [Editorial Planeta Argentina]
Número de Cotización: "COT-2025-001"
Subtotal: $24,000
IVA (21%): $5,040
Monto Total: $29,040

Condiciones:
- Plazo de entrega: 15 días
- Forma de pago: 30 días neto
```

**Paso 4: Agregar items de cotización**
- Para cada item, especificar:
  - Precio unitario: $480
  - Descuento (si aplica): 0%

**Paso 5: Guardar**
- Click en **"Guardar Cotización"**

---

### 5️⃣ Evaluar y Comparar Cotizaciones (Miembro de Junta)

**Cuando hay 2 o más cotizaciones:**

**Paso 1: Acceder a comparativa**
- En la solicitud, click en **"Comparar Cotizaciones (3)"**
- Se abre vista de comparación lado a lado

**Paso 2: Analizar opciones**

```
PROVEEDOR A: Editorial Planeta
├─ Precio Total: $29,040
├─ Entrega: 15 días
└─ Garantía: No

PROVEEDOR B: Distribuidora Cervantes
├─ Precio Total: $27,500  ← Menor precio ✓
├─ Entrega: 20 días
└─ Garantía: Sí

PROVEEDOR C: Casa del Libro
├─ Precio Total: $31,200
├─ Entrega: 10 días  ← Más rápido
└─ Garantía: Sí
```

**Paso 3: Seleccionar ganadora**
- Click en cotización elegida
- Click en **"Seleccionar Cotización"**
- Indicar motivo: "Mejor relación precio-plazo"

**Resultado:**
- Estado cambia a **"En Evaluación"**
- Cotización marcada como "Seleccionada"

---

### 6️⃣ Crear Orden de Compra (Miembro de Junta)

**Paso 1: Abrir solicitud con cotización seleccionada**
- La solicitud está en estado **"En Evaluación"**

**Paso 2: Crear orden**
- Click en botón **"Crear Orden de Compra"**
- Se abre diálogo con datos de la cotización

**Paso 3: Confirmar detalles**

```
Proveedor: Editorial Planeta Argentina
Cotización: COT-2025-001
Monto Total: $29,040
Plazo Entrega: 15 días
Forma de Pago: 30 días neto
```

**Paso 4: Enviar orden**
- Click en **"Generar y Enviar Orden"**
- Sistema genera número de orden (ej: ORD-2025-0045)

**Resultado:**
- Estado cambia a **"Orden Creada"**
- Orden está lista para enviar al proveedor
- Se puede descargar como PDF para imprimir o enviar

---

### 7️⃣ Rechazar una Solicitud (Miembro de Junta)

**Si la junta decide no aprobar:**

**Paso 1: Abrir solicitud en Pendiente de Aprobación**

**Paso 2: Click en **"Rechazar"****

**Paso 3: Indicar motivo**

```
Motivo de Rechazo: "No hay presupuesto disponible en este
ejercicio. Sugerir replantear en el próximo período."
```

**Paso 4: Confirmar**
- Click en **"Confirmar Rechazo"**

**Resultado:**
- Estado cambia a **"Rechazada"**
- Se notifica al solicitante
- Puede reenviar modificada después

---

### 8️⃣ Administrar Estados de Orden de Compra (Miembro de Junta)

Después de crear una orden de compra, es necesario seguir su estado desde que se envía al proveedor hasta que se recibe, se factura y se paga.

#### Estados de una Orden de Compra

```
BORRADOR → ENVIADA → CONFIRMADA → PARCIALMENTE RECIBIDA → RECIBIDA → FACTURADA → PAGADA
                                ↓
                            CANCELADA (en cualquier momento)
```

**Definición de cada estado:**

1. **Borrador (Draft)**
   - Orden creada pero aún no enviada
   - Se puede editar o eliminar
   - Transiciones posibles: Enviada, Cancelada

2. **Enviada (Sent)**
   - Orden fue enviada al proveedor por email, fax o correo
   - El proveedor debe confirmar recepción
   - Transiciones posibles: Confirmada, Cancelada

3. **Confirmada (Confirmed)**
   - El proveedor confirmó que recibirá la orden
   - Se espera entrega del producto
   - **Estado más común** (la mayoría de órdenes está aquí)
   - Transiciones posibles: Parcialmente Recibida, Completamente Recibida, Cancelada

4. **Parcialmente Recibida (Partially Received)**
   - Se recibió parte del pedido
   - Se espera el resto
   - Transiciones posibles: Completamente Recibida

5. **Recibida (Received)**
   - Se recibió todo el pedido ✓
   - Se verifica cantidad y calidad
   - Ahora se espera la factura del proveedor
   - Transiciones posibles: Facturada

6. **Facturada (Invoiced)**
   - Se recibió la factura del proveedor
   - Cantidad y precio se verificaron
   - Se espera realizar el pago
   - Transiciones posibles: Pagada

7. **Pagada (Paid)**
   - Se completó el pago al proveedor ✓
   - **Orden completada**
   - No hay transiciones posibles (estado final)

8. **Cancelada (Cancelled)**
   - Orden fue cancelada
   - Se puede hacer desde cualquier estado
   - Estado final (no se puede deshacer)

#### Cómo Cambiar el Estado de una Orden

**Paso 1: Acceder a la Orden**
- Ir a Solicitudes de Compra
- Click en la solicitud relacionada
- En sección "Órdenes", click en la orden

**Paso 2: Ver Estados Disponibles**
- En la esquina superior derecha, verá un botón con "⋮" (menú)
- Los únicos estados mostrados son los **válidos** para el estado actual
- **No aparecerán estados inválidos** (sistema previene errores)

**Paso 3: Seleccionar Nuevo Estado**
- Click en el menú
- Selecciona el estado siguiente

**Ejemplo 1: Orden Confirmada**
```
Estado Actual: CONFIRMADA
Opciones disponibles:
├─ Parcialmente Recibida
├─ Completamente Recibida  ← Directo si se recibe todo
└─ Cancelada
```

**Ejemplo 2: Orden Parcialmente Recibida**
```
Estado Actual: PARCIALMENTE RECIBIDA
Opciones disponibles:
└─ Completamente Recibida  ← Único siguiente válido
```

**Ejemplo 3: Orden Recibida**
```
Estado Actual: RECIBIDA
Opciones disponibles:
└─ Facturada  ← Esperar factura, luego cambiar
```

#### Caso de Uso Completo

```
DÍA 1: Orden creada
├─ Estado: BORRADOR
└─ Acción: Verificar detalles

DÍA 2: Se envía al proveedor
├─ Estado: → ENVIADA
└─ Acción: Notificar a proveedor

DÍA 3: Proveedor confirma
├─ Estado: → CONFIRMADA
└─ Acción: Esperar entrega (plazo 15 días)

DÍA 17: Se recibe parcialmente
├─ Estado: → PARCIALMENTE RECIBIDA
└─ Acción: Registrar qué llegó, esperar resto

DÍA 18: Llega lo faltante
├─ Estado: → RECIBIDA
└─ Acción: Verificar cantidad y calidad ✓

DÍA 20: Llega la factura
├─ Estado: → FACTURADA
└─ Acción: Procesar pago

DÍA 25: Se realiza el pago
├─ Estado: → PAGADA
└─ Resultado: ✓ ORDEN COMPLETADA
```

#### Preguntas Comunes sobre Estados

**¿Por qué no puedo cambiar a cierto estado?**
- Sistema solo muestra transiciones válidas
- Por ejemplo, no puedes ir de CONFIRMADA directamente a PAGADA
- Debe pasar por: Recibida → Facturada → Pagada

**¿Puedo cancelar una orden después de ser enviada?**
- Sí, puedes cancelar desde cualquier estado
- Pero debés contactar al proveedor para avisar
- Registra el motivo en comentarios

**¿Qué significa que la orden esté "Confirmada"?**
- El proveedor recibió y confirmó la orden
- Ahora está en su proceso de empaque y envío
- Se espera entrega según plazo acordado

**¿Cómo sé cuándo cambiar a "Recibida"?**
- Cuando físicamente llega el producto a las oficinas
- Alguien debe verificar que:
  - Cantidad coincida con orden
  - Productos estén en buen estado
  - Todo esté completo

**¿Qué si me confundo y cambio a estado incorrecto?**
- No hay problema, puedes cambiar nuevamente
- Sistema permite moverte hacia adelante en el flujo
- Si necesitas volver atrás, contacta a administrador

---

## Gestión de Proveedores

### Agregar un Nuevo Proveedor

**Paso 1: Ir a Proveedores**
- Click en **"Proveedores"** en el menú de Compras

**Paso 2: Crear nuevo**
- Click en **"+ Nuevo Proveedor"**

**Paso 3: Completar datos**

```
Razón Social: "Editorial Planeta Argentina S.A."
Nombre Comercial: "Planeta Libros"
CUIT: "30-12345678-9"
Condición Fiscal: "Responsable Inscripto"
Categoría: "Editoriales"
```

**Paso 4: Datos de contacto**

```
Nombre Contacto: "María García"
Teléfono: "+54 11 4321-5678"
Email: "ventas@planeta.com.ar"
Dirección: "Av. Corrientes 1234, Buenos Aires"
```

**Paso 5: Guardar**
- Click en **"Crear Proveedor"**

---

### Editar Información de Proveedor

**Paso 1: Ir a lista de Proveedores**

**Paso 2: Click en fila del proveedor**
- Se abre diálogo con datos del proveedor

**Paso 3: Modificar campos necesarios**

**Paso 4: Guardar cambios**
- Click en **"Guardar Cambios"**

---

## Filtros y Búsquedas

### Filtrar Solicitudes de Compra

**En la página de Solicitudes:**

```
Búsqueda: "libros" → Busca en número, título, descripción
Estado: "Aprobada" → Muestra solo aprobadas
Tipo: "Competencia de Precios" → Filtra por tipo
Categoría: "Materiales" → Filtra por categoría
Fecha Desde: "01/11/2025" → Rango de fechas
Fecha Hasta: "30/11/2025"
```

**Ejemplo: Ver todas las compras directas aprobadas sin cotizaciones**
1. Tipo: "Compra Directa"
2. Estado: "Aprobada"
3. Click en Buscar
4. Resultado: 3 solicitudes listas para crear orden

---

## Panel de Control (Dashboard)

**El Dashboard muestra:**

```
┌─────────────────────────────────────────┐
│ ESTADÍSTICAS GENERALES                  │
├─────────────────────────────────────────┤
│ ⏱️  Pendientes de Aprobación: 3        │
│ 🔍 En Evaluación: 87                   │
│ ✅ Solicitudes Aprobadas: 25           │
└─────────────────────────────────────────┘

ACCESOS RÁPIDOS:
┌──────────────────────────────────┐
│ 👥 Proveedores                  │
│ 📄 Solicitudes de Compra        │
│ 📋 Cotizaciones (removido)      │
└──────────────────────────────────┘

SOLICITUDES PENDIENTES DE APROBACIÓN:
├─ SOL-2025-1180: Compra 1180 - Impresoras ($217,544)
├─ SOL-2025-1254: Compra 1254 - Estanterías ($149,119)
└─ SOL-2025-0178: Compra 178 - Tóner e insumos ($74,392)
```

---

## Preguntas Frecuentes

### ❓ ¿Cuál es la diferencia entre Compra Directa y Competencia de Precios?

**Compra Directa:**
- Se aprueba y se crea la orden directamente
- Sin solicitar cotizaciones
- Más rápida (ideal para compras pequeñas)

**Competencia de Precios:**
- Se aprueba, se solicitan cotizaciones a varios proveedores
- Se comparan precios antes de crear la orden
- Más confiable para compras grandes

### ❓ ¿Cuánto tiempo toma aprobar una solicitud?

**Típicamente:** 2-5 días hábiles
- Depende de la agenda de la Junta Directiva
- Compras urgentes pueden priorizarse

### ❓ ¿Qué pasa si una solicitud se rechaza?

- El solicitante es notificado
- Puede corregir la solicitud y reenviar
- La anterior queda registrada en el historial

### ❓ ¿Puedo agregar cotizaciones después de haber solicitado?

**Sí**, puedes:
1. Hacer clic en **"+ Agregar Cotización"** en cualquier momento
2. O esperar a que los proveedores respondan a la RFQ automáticamente

### ❓ ¿Cómo cancelo una solicitud?

- Si está en Borrador o Pendiente de Aprobación: Click en **"Cancelar Solicitud"**
- Si ya está aprobada: Contacta con la Junta Directiva

### ❓ ¿Qué información debo incluir en una solicitud?

**Obligatorio:**
- Tipo de compra
- Título
- Descripción
- Cantidad y presupuesto estimado

**Recomendado:**
- Justificación
- Especificaciones técnicas
- Preferencia de proveedor (si aplica)

### ❓ ¿Puedo modificar una solicitud después de enviarla?

- En estado Borrador: **Sí**, completamente
- En Pendiente de Aprobación: **No**, debe retirarla y rehacer
- En Aprobada o posterior: **No**, solo administrador puede modificar

### ❓ ¿Dónde veo el histórico de cambios?

Click en la solicitud → Scroll abajo → Sección **"Historial de Cambios"**
Muestra quién hizo qué y cuándo.

### ❓ ¿Cuál es el monto máximo para una compra directa?

Esto lo define la organización. Consulta con tu junta directiva.

### ❓ ¿Cómo descargo una orden de compra?

- Abre la solicitud en estado "Orden Creada"
- Click en **"Descargar PDF"**
- Se descarga como archivo para imprimir o enviar

---

## Consejos y Mejores Prácticas

### ✅ Al Crear una Solicitud:
- **Sé específico**: Incluye marcas, modelos, especificaciones técnicas
- **Presupuesto realista**: Investiga precios del mercado
- **Urgencia real**: Solo marca como "Urgente" si es necesario
- **Documentación**: Adjunta links, catálogos o especificaciones técnicas si es posible

### ✅ Al Solicitar Cotizaciones:
- **Cantidad suficiente de proveedores**: Mínimo 3 para buena comparativa
- **Plazo realista**: Deja 10 días para respuestas
- **Instrucciones claras**: Especifica qué información necesitas

### ✅ Al Evaluar Cotizaciones:
- **No solo precio**: Considera plazo de entrega, garantía, calidad
- **Documentación**: Guarda las cotizaciones recibidas
- **Transparencia**: Justifica tu elección

### ✅ Al Crear Órdenes:
- **Verificación final**: Revisa datos del proveedor
- **Condiciones de pago**: Confirma plazo de pago acordado
- **Contacto directo**: Ten teléfono/email del proveedor a mano

---

## Contacto y Soporte

Para dudas sobre:
- **Solicitudes de compra**: Contacta a [nombre administrativo]
- **Proveedores**: Contacta a [nombre de gestión]
- **Problemas técnicos**: Contacta al equipo de TI

---

**Versión:** 1.0
**Última actualización:** Noviembre 2025
**Autor:** Sistema de Compras - ABR

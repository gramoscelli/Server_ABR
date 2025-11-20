# Búsqueda de Socios - Implementación Completa

## Resumen

Se ha implementado un sistema completo de búsqueda de socios con las siguientes características:

### ✅ Características Principales

1. **Búsqueda en tiempo real mientras escribes**
   - Búsqueda automática con debounce de 500ms
   - No requiere presionar Enter o botón
   - Indicador visual de búsqueda en progreso

2. **Búsqueda por múltiples criterios**
   - Nombre (búsqueda por inicio de palabra)
   - Apellido (búsqueda por inicio de palabra)
   - DNI/Documento (búsqueda por inicio de palabra)
   - Número de socio (búsqueda exacta)
   - **Insensible a mayúsculas/minúsculas**

3. **Interfaz de usuario optimizada**
   - Búsqueda automática mientras escribe
   - Botón para limpiar búsqueda
   - Estados de carga visibles
   - Lista de resultados con scroll
   - Selección visual del socio activo
   - Panel de información detallada

## Implementación Backend

### Archivo: `/app/routes/socios.js`

#### Endpoint de Búsqueda
```
GET /api/socios/search?q=<término>&limit=<límite>
```

**Características:**
- Búsqueda con `LIKE 'término%'` (empieza por el término)
- MySQL es case-insensitive por defecto (utf8mb4_unicode_ci)
- Protegido con autenticación y rol `admin_employee` o `root`
- Límite configurable (default: 20, máximo: 100)
- Ordenamiento por apellido y nombre

**Parámetros:**
- `q` (string, requerido): Término de búsqueda
- `limit` (number, opcional): Máximo de resultados (default: 20, max: 100)

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "So_ID": 1001,
      "So_Nombre": "Juan",
      "So_Apellido": "Pérez",
      "So_DomCob": "Av. Libertador 1234",
      "Gr_ID": 1
    }
  ],
  "total": 1
}
```

**Lógica de búsqueda:**
```sql
WHERE (
  So_Nombre LIKE 'término%' OR
  So_Apellido LIKE 'término%' OR
  So_NroDoc LIKE 'término%' OR
  So_ID = número
)
ORDER BY So_Apellido ASC, So_Nombre ASC
LIMIT X
```

#### Endpoint de Socio Individual
```
GET /api/socios/:id
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "So_ID": 1001,
    "So_Nombre": "Juan",
    "So_Apellido": "Pérez",
    "So_DomCob": "Av. Libertador 1234",
    "Gr_ID": 1
  }
}
```

### Registro de Ruta en `app.js`

```javascript
var sociosRouter = require('./routes/socios');
app.use('/api/socios', apiLimiter, sociosRouter);
```

- Protegido con rate limiting
- No requiere CSRF (solo lectura)
- Requiere autenticación JWT

## Implementación Frontend

### Archivo: `/src/pages/SociosPage.tsx`

#### Características Implementadas

1. **Búsqueda con Debounce**
   ```typescript
   useEffect(() => {
     // Espera 500ms después de que el usuario deja de escribir
     const timer = setTimeout(() => {
       handleSearch(searchTerm)
     }, 500)

     return () => clearTimeout(timer)
   }, [searchTerm])
   ```

2. **Indicadores Visuales**
   - Icono de loading mientras busca
   - Spinner en resultados mientras carga
   - Botón X para limpiar búsqueda rápidamente
   - Contador de resultados

3. **Manejo de Errores**
   - Toast notifications para errores
   - Mensajes descriptivos
   - Fallback a array vacío en caso de error

4. **Optimizaciones**
   - Cancelación de búsquedas anteriores (debounce)
   - Límite de 50 resultados
   - Scroll en lista de resultados
   - useCallback para evitar re-renders innecesarios

## Flujo de Uso

1. **Usuario escribe en el campo de búsqueda**
   - Se muestra icono de loading
   - Espera 500ms de inactividad

2. **Se ejecuta la búsqueda automáticamente**
   - Llamada al API `/api/socios/search`
   - Resultados aparecen en la lista izquierda

3. **Usuario selecciona un socio**
   - Click en la lista de resultados
   - Se muestra información detallada en panel derecho

4. **Usuario puede limpiar la búsqueda**
   - Click en la X del campo
   - Se limpian resultados y selección

## Ejemplos de Búsqueda

### Por Apellido (case-insensitive)
```
Usuario escribe: "per"
Encuentra: Pérez, Peralta, Pereira
```

### Por Nombre
```
Usuario escribe: "juan"
Encuentra: Juan, Juana, Juanita
```

### Por Número de Socio
```
Usuario escribe: "1001"
Encuentra: Socio con So_ID = 1001
```

### Por DNI/Documento
```
Usuario escribe: "12345"
Encuentra: Socios cuyo DNI empieza con "12345"
```

### Insensibilidad a Mayúsculas
```
Usuario escribe: "PEREZ" o "perez" o "Perez"
Todos encuentran: Pérez
```

## Seguridad

✅ **Autenticación requerida**
- Solo usuarios autenticados pueden acceder

✅ **Control de roles**
- Solo `root` y `admin_employee` tienen acceso

✅ **Rate limiting**
- Protección contra abuso de API

✅ **Validación de entrada**
- Sanitización de parámetros
- Límite en número de resultados

✅ **SQL Injection Protection**
- Uso de Sequelize ORM con parámetros preparados

## Mejoras Futuras Sugeridas

1. **Búsqueda avanzada**
   - Agregar filtros por grupo
   - Búsqueda por DNI (si se agrega al modelo)
   - Búsqueda por domicilio

2. **Paginación**
   - Para manejar grandes cantidades de resultados
   - Scroll infinito o paginación tradicional

3. **Historial**
   - Mostrar historial de operaciones del socio
   - Préstamos activos
   - Pagos realizados

4. **Edición**
   - Formulario para editar datos del socio
   - Validaciones de campos
   - Auditoría de cambios

5. **Exportación**
   - Exportar resultados a CSV/Excel
   - Generar reportes PDF

6. **Caché**
   - Implementar caché de búsquedas frecuentes
   - Redis para mejorar performance

## Modelo Socio Completo

El modelo `Socio.js` ha sido completado con todos los campos de la tabla:

### Campos Principales
- `So_ID`: Número de socio (Primary Key)
- `So_Nombre`: Nombre
- `So_Apellido`: Apellido
- `So_NroDoc`: DNI/Documento
- `So_Email`: Email
- `So_Telef`: Teléfono
- `So_FecNac`: Fecha de nacimiento
- `So_DomRes`: Domicilio de residencia
- `So_DomCob`: Domicilio de cobro
- `Gr_ID`: ID del grupo al que pertenece

### Campos Adicionales
- `Co_ID`: ID de cobrador
- `TD_ID`: Tipo de documento
- `So_AnioIngre`: Año de ingreso
- `So_MesIngre`: Mes de ingreso
- `So_NotaCob`: Notas sobre cobro
- `So_Obs`: Observaciones generales
- `So_Foto`: Foto del socio (BLOB)
- `So_PersFisica`: Persona física (Y/N)
- `So_Aut_Apellido`: Apellido del autorizado
- `So_Aut_Nombre`: Nombre del autorizado
- `So_Aut_Domi`: Domicilio del autorizado
- `So_Aut_Telef`: Teléfono del autorizado
- `So_Aut_TipoDoc`: Tipo de documento del autorizado
- `So_Aut_NroDoc`: Número de documento del autorizado
- `So_Fallecido`: Indica si falleció (Y/N)
- `So_DiferenciaCuota`: Diferencia en cuota
- `So_NroCarnet`: Número de carnet

## Correcciones Aplicadas

### 1. Middleware de Autenticación (app/routes/socios.js:5)
**Problema:** El archivo importaba `authenticate` y `checkRole` que no existían.
```javascript
// ❌ ANTES (INCORRECTO)
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
router.get('/search', authenticate, checkRole(['root', 'admin_employee']), ...);
```

```javascript
// ✅ DESPUÉS (CORRECTO)
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
router.get('/search', authenticateToken, authorizeRoles('root', 'admin_employee'), ...);
```

### 2. Búsqueda por DNI (app/routes/socios.js:33)
Se agregó búsqueda por número de documento:
```javascript
const searchConditions = [
  { So_Nombre: { [Op.like]: `${searchTerm}%` } },
  { So_Apellido: { [Op.like]: `${searchTerm}%` } },
  { So_NroDoc: { [Op.like]: `${searchTerm}%` } }  // ✅ AGREGADO
];
```

### 3. Límite de Resultados
- Frontend: 20 resultados por búsqueda (app/routes/socios.js:16)
- Backend: Máximo 100 resultados (app/routes/socios.js:24)

### 4. Autenticación JWT (frontend/src/pages/SociosPage.tsx:54)
**Problema:** La búsqueda usaba `fetch()` directamente sin incluir el token JWT de autenticación.

```javascript
// ❌ ANTES (INCORRECTO - Sin token JWT)
const response = await fetch(`/api/socios/search?q=...`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
```

```javascript
// ✅ DESPUÉS (CORRECTO - Con token JWT)
const response = await fetchWithAuth(`/api/socios/search?q=...`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
```

**Resultado:** El backend respondía con `401 Unauthorized`. Ahora usa `fetchWithAuth()` que automáticamente:
- Agrega el header `Authorization: Bearer <token>`
- Maneja el refresh automático del token si expira
- Redirige al login si la autenticación falla completamente

## Archivos Modificados/Creados

### Backend
- ✅ `/app/routes/socios.js` (NUEVO - corregido middleware)
- ✅ `/app/models/Socio.js` (COMPLETADO con todos los campos)
- ✅ `/app/app.js` (modificado - registrado router)

### Frontend
- ✅ `/src/pages/SociosPage.tsx` (modificado - campos adicionales)
- ✅ `/src/components/AdminLayout.tsx` (modificado - entrada Socios)
- ✅ `/src/App.tsx` (modificado - ruta Socios)

## Testing

Para probar la funcionalidad:

1. **Iniciar sesión** con usuario `root` o `admin_employee`
2. **Navegar** a "Socios" en el menú lateral
3. **Escribir** en el campo de búsqueda
4. **Observar** cómo aparecen resultados automáticamente
5. **Seleccionar** un socio para ver su información

## Notas Técnicas

- **MySQL Collation**: utf8mb4_unicode_ci (case-insensitive por defecto)
- **Búsqueda**: Usa `LIKE 'término%'` para búsqueda por inicio
- **Debounce**: 500ms para evitar búsquedas excesivas
- **Límite**: Máximo 100 resultados por seguridad
- **Ordenamiento**: Apellido ASC, Nombre ASC

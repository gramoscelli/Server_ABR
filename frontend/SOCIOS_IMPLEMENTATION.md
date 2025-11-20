# Implementación de Búsqueda de Socios

## Descripción General

Se ha implementado una nueva funcionalidad para buscar y visualizar información de los socios de la biblioteca. La funcionalidad incluye búsqueda por múltiples criterios y visualización detallada de la información del socio seleccionado.

## Componentes Modificados

### 1. AdminLayout (`/src/components/AdminLayout.tsx`)
**Cambios realizados:**
- ✅ Agregado icono `BookUser` de lucide-react
- ✅ Agregada entrada "Socios" en la navegación lateral, posicionada después de "Usuarios"
- ✅ La entrada es visible solo para usuarios con rol `admin`, `root` o `admin_employee`

### 2. App.tsx (`/src/App.tsx`)
**Cambios realizados:**
- ✅ Agregado lazy load de `SociosPage`
- ✅ Agregada ruta `/socios` con protección `requireAdmin`

### 3. SociosPage (`/src/pages/SociosPage.tsx`) - NUEVO
**Funcionalidad implementada:**

#### Búsqueda de Socios
- **Campo de búsqueda único** que permite buscar por:
  - Nombre del socio
  - Apellido del socio
  - Número de socio (So_ID)
- **Búsqueda en tiempo real** al presionar Enter o hacer clic en el botón "Buscar"
- **Limitación de resultados** para optimizar rendimiento
- **Estado de carga** durante la búsqueda

#### Lista de Resultados
- **Vista compacta** de los socios encontrados
- **Límite de visualización** con scroll para muchos resultados
- **Selección visual** del socio activo
- **Información resumida**: Apellido, Nombre y Número de socio

#### Información Detallada del Socio
- **Panel lateral expandido** que muestra:
  - **Encabezado destacado** con nombre completo y número de socio
  - **Información personal**:
    - Nombre
    - Apellido
    - Número de Socio (So_ID)
    - Grupo (Gr_ID)
  - **Domicilio de cobro** (So_DomCob)
  - **Botones de acción** (deshabilitados, preparados para futuras funciones):
    - Ver Historial
    - Editar Socio

## Estructura de Datos

### Modelo Socio (basado en `/app/models/Socio.js`)

```typescript
interface Socio {
  So_ID: number          // ID del socio (número de socio)
  So_Nombre: string      // Nombre del socio
  So_Apellido: string    // Apellido del socio
  So_DomCob: string      // Domicilio de cobro
  Gr_ID: number | null   // ID del grupo al que pertenece
}
```

## Próximos Pasos para Backend

Para completar la funcionalidad, se necesita implementar el backend:

### 1. Endpoint de Búsqueda
```
GET /api/socios/search?q=<término de búsqueda>&limit=<límite>
```

**Parámetros:**
- `q` (string, requerido): Término de búsqueda
- `limit` (number, opcional): Número máximo de resultados (default: 20)

**Respuesta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "So_ID": 1001,
      "So_Nombre": "Juan",
      "So_Apellido": "Pérez",
      "So_DomCob": "Av. Libertador 1234, CABA",
      "Gr_ID": 1
    }
  ],
  "total": 1
}
```

**Lógica de búsqueda:**
La búsqueda debe buscar coincidencias en:
- `So_Nombre` (LIKE '%término%')
- `So_Apellido` (LIKE '%término%')
- `So_ID` (conversión a string y búsqueda exacta o parcial)

### 2. Implementación Sugerida (Node.js/Express)

```javascript
// routes/socios.js
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const searchTerm = q.trim();
    const { Op } = require('sequelize');

    const socios = await Socio.findAll({
      where: {
        [Op.or]: [
          { So_Nombre: { [Op.like]: `%${searchTerm}%` } },
          { So_Apellido: { [Op.like]: `%${searchTerm}%` } },
          { So_ID: { [Op.eq]: parseInt(searchTerm) || 0 } }
        ]
      },
      limit: parseInt(limit),
      order: [['So_Apellido', 'ASC'], ['So_Nombre', 'ASC']]
    });

    res.json({
      success: true,
      data: socios,
      total: socios.length
    });
  } catch (error) {
    console.error('Error searching socios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar socios'
    });
  }
});
```

### 3. Actualización del Frontend

Una vez implementado el backend, actualizar en `SociosPage.tsx`:

```typescript
const handleSearch = async () => {
  if (!searchTerm.trim()) {
    setSocios([])
    return
  }

  setSearching(true)
  try {
    const response = await fetch(
      `/api/socios/search?q=${encodeURIComponent(searchTerm)}&limit=20`,
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Error en la búsqueda')
    }

    const result = await response.json()

    if (result.success) {
      setSocios(result.data)
    }
  } catch (error) {
    console.error('Error searching socios:', error)
    // TODO: Mostrar toast de error
  } finally {
    setSearching(false)
  }
}
```

## Características Implementadas

✅ **Interfaz de Usuario**
- Búsqueda por múltiples criterios en un solo campo
- Lista de resultados con selección visual
- Panel de información detallada del socio
- Diseño responsive
- Estados de carga y vacío
- Limpieza de selección

✅ **Control de Acceso**
- Solo usuarios con rol `root`, `admin` o `admin_employee` pueden acceder
- Redirección automática si no tiene permisos

✅ **Preparación para Futuras Funcionalidades**
- Botones de acción preparados (Ver Historial, Editar Socio)
- Estructura extensible para agregar más información

## Datos Actualmente Disponibles

Según el modelo `Socio.js`, los datos disponibles son:
- **So_ID**: Número de socio (clave primaria)
- **So_Nombre**: Nombre
- **So_Apellido**: Apellido
- **So_DomCob**: Domicilio de cobro
- **Gr_ID**: ID del grupo (referencia a tabla `grupos`)

## Notas Adicionales

1. **Datos de Prueba**: Actualmente se usan datos mock para desarrollo. Estos deben ser reemplazados con llamadas reales al API.

2. **Validaciones**: La búsqueda requiere al menos un carácter para ejecutarse.

3. **Límite de Resultados**: Se recomienda limitar a 20-50 resultados para optimizar rendimiento.

4. **Futuras Mejoras Sugeridas**:
   - Agregar DNI al modelo si está disponible en la base de datos
   - Implementar paginación para grandes cantidades de resultados
   - Agregar filtros avanzados (por grupo, estado, etc.)
   - Implementar edición de socios
   - Agregar historial de operaciones del socio
   - Exportar resultados de búsqueda a CSV/Excel

## Tecnologías Utilizadas

- **React**: Framework de UI
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos
- **Lucide React**: Iconos
- **React Router**: Navegación

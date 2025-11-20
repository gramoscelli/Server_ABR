# Implementación de Formularios de Cash Control

## Descripción General

Se han implementado tres componentes de diálogo (modales) para agregar ingresos, egresos y transferencias en la aplicación de control de efectivo (CashControl). Los formularios están basados en los diseños proporcionados en las capturas de pantalla.

## Componentes Creados

### 1. AddIncomeDialog (`/src/components/cash/AddIncomeDialog.tsx`)

**Campos:**
- **Amount**: Campo numérico con selector de moneda (ARS, USD, EUR)
- **To Account**: Selector de cuenta destino (Cash, Bank, Savings)
- **Date**: Selector de fecha
- **Category**: Selector de categoría (Salary, Freelance, Investment, Gift, Other)
- **Description**: Área de texto para descripción
- **Attachments**: Zona de carga de archivos (drag and drop)

**Uso:**
```tsx
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'

const [isOpen, setIsOpen] = useState(false)

const handleSubmit = (data: IncomeFormData) => {
  // Procesar los datos
  console.log(data)
}

<AddIncomeDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSubmit}
/>
```

### 2. AddExpenseDialog (`/src/components/cash/AddExpenseDialog.tsx`)

**Campos:**
- **Amount**: Campo numérico con selector de moneda (ARS, USD, EUR)
- **From Account**: Selector de cuenta origen (Cash, Bank, Savings)
- **Date**: Selector de fecha
- **Multi-category expense**: Toggle switch para habilitar gastos multicategoría
- **Category**: Selector de categoría (Food & Dining, Transportation, Utilities, Entertainment, Shopping, Healthcare, Other)
- **Description**: Área de texto para descripción
- **Attachments**: Zona de carga de archivos (drag and drop)

**Uso:**
```tsx
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'

const [isOpen, setIsOpen] = useState(false)

const handleSubmit = (data: ExpenseFormData) => {
  // Procesar los datos
  console.log(data)
}

<AddExpenseDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSubmit}
/>
```

### 3. AddTransferDialog (`/src/components/cash/AddTransferDialog.tsx`)

**Campos:**
- **From**: Selector de cuenta origen (Cash, Bank, Savings, Credit Card)
- **From Amount**: Campo numérico con selector de moneda
- **To**: Selector de cuenta destino (Cash, Bank, Savings, Credit Card)
- **To Amount**: Campo numérico con selector de moneda (se auto-sincroniza si las monedas son iguales)
- **Date**: Selector de fecha
- **Description**: Área de texto para descripción
- **Attachments**: Zona de carga de archivos (drag and drop)

**Características especiales:**
- Si la moneda de origen y destino son iguales, el monto de destino se sincroniza automáticamente con el de origen

**Uso:**
```tsx
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'

const [isOpen, setIsOpen] = useState(false)

const handleSubmit = (data: TransferFormData) => {
  // Procesar los datos
  console.log(data)
}

<AddTransferDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onSubmit={handleSubmit}
/>
```

## Páginas Modificadas

Los diálogos se han integrado completamente en las siguientes páginas. **TODOS los botones están conectados** para que cada página pueda abrir cualquiera de los tres tipos de diálogos:

### 1. **DashboardPage** (`/src/pages/DashboardPage.tsx`)
**Botones conectados:**
- Botón "Egreso" en el header → Abre AddExpenseDialog
- Botón "Ingreso" en el header → Abre AddIncomeDialog
- Botón "Transferencia" en el header → Abre AddTransferDialog
- Botón "Agregar Egreso" en la sección de egresos vacía → Abre AddExpenseDialog
- Botón "Agregar Ingreso" en la sección de ingresos vacía → Abre AddIncomeDialog

### 2. **IncomesPage** (`/src/pages/cash/IncomesPage.tsx`)
**Botones conectados:**
- Botón "Egreso" en el header → Abre AddExpenseDialog
- Botón "Ingreso" en el header → Abre AddIncomeDialog
- Botón "Transferencia" en el header → Abre AddTransferDialog
- Botón "Agregar Ingreso" en el estado vacío → Abre AddIncomeDialog

### 3. **ExpensesPage** (`/src/pages/cash/ExpensesPage.tsx`)
**Botones conectados:**
- Botón "Egreso" en el header → Abre AddExpenseDialog
- Botón "Ingreso" en el header → Abre AddIncomeDialog
- Botón "Transferencia" en el header → Abre AddTransferDialog
- Botón "Agregar Egreso" en el estado vacío → Abre AddExpenseDialog

### 4. **TransfersPage** (`/src/pages/cash/TransfersPage.tsx`)
**Botones conectados:**
- Botón "Egreso" en el header → Abre AddExpenseDialog
- Botón "Ingreso" en el header → Abre AddIncomeDialog
- Botón "Transferencia" en el header → Abre AddTransferDialog
- Botón "Agregar Transferencia" en el estado vacío → Abre AddTransferDialog

## Estilos y Diseño

Todos los formularios siguen el mismo patrón de diseño:
- Fondo blanco con bordes redondeados
- Campos con labels claros
- Botón de submit amarillo (`bg-yellow-500`) con texto negro
- Zona de drag & drop para archivos con borde punteado
- Validación básica de campos requeridos (HTML5)

## Próximos Pasos

Para completar la funcionalidad, se necesita:

1. **Backend API**: Implementar endpoints para:
   - `POST /api/incomes` - Crear ingreso
   - `POST /api/expenses` - Crear egreso
   - `POST /api/transfers` - Crear transferencia

2. **Gestión de archivos**: Implementar la subida de archivos adjuntos

3. **Validación**: Agregar validación más robusta en el frontend

4. **Categorías dinámicas**: Cargar categorías desde la base de datos

5. **Cuentas dinámicas**: Cargar cuentas desde la base de datos

6. **Actualización de listas**: Después de crear un registro, actualizar la lista automáticamente

7. **Manejo de errores**: Mostrar mensajes de error apropiados usando el sistema de toasts

8. **Estados de carga**: Agregar indicadores de carga durante el envío de datos

## Tipos TypeScript

### IncomeFormData
```typescript
interface IncomeFormData {
  amount: string
  currency: string
  toAccount: string
  date: string
  category: string
  description: string
  attachments: File[]
}
```

### ExpenseFormData
```typescript
interface ExpenseFormData {
  amount: string
  currency: string
  fromAccount: string
  date: string
  multiCategory: boolean
  category: string
  description: string
  attachments: File[]
}
```

### TransferFormData
```typescript
interface TransferFormData {
  fromAccount: string
  toAccount: string
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  date: string
  description: string
  attachments: File[]
}
```

## Tecnologías Utilizadas

- **React**: Framework de UI
- **TypeScript**: Tipado estático
- **Radix UI**: Componentes base (Dialog, Select, Switch)
- **Tailwind CSS**: Estilos
- **Lucide React**: Iconos

# MANUAL DEL MÓDULO CONTABLE
## Asociación Bernardino Rivadavia (ABR)

---

## ÍNDICE

1. [Introducción](#introducción)
2. [Estructura General del Sistema](#estructura-general-del-sistema)
3. [Plan de Cuentas](#plan-de-cuentas)
4. [Cuentas Bancarias y de Efectivo](#cuentas-bancarias-y-de-efectivo)
5. [Operaciones Contables](#operaciones-contables)
6. [Reportes Financieros](#reportes-financieros)
7. [Reconciliación de Caja](#reconciliación-de-caja)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## INTRODUCCIÓN

El módulo contable del sistema de ABR es una herramienta diseñada para registrar y controlar todas las operaciones financieras de la asociación de manera ordenada y profesional.

**Objetivo Principal:** Mantener un registro completo de ingresos y egresos, clasificándolos según el Plan de Cuentas oficial de ABR, para generar reportes financieros precisos.

**Beneficios:**
- Registro automático de todas las transacciones
- Clasificación contable según Plan de Cuentas oficial (94 códigos)
- Reportes financieros en tiempo real
- Control de efectivo y saldos bancarios
- Trazabilidad de cada movimiento

---

## ESTRUCTURA GENERAL DEL SISTEMA

### Acceso Principal

Al ingresar al módulo de **Contabilidad**, encontrarás:

```
CONTABILIDAD
├── Panel Principal          (Dashboard - resumen del día)
├── Operaciones             (Registro de ingresos y egresos)
├── Arqueos de Caja         (Reconciliación de disponibilidades)
├── Cuentas                 (Gestión de cuentas bancarias y de efectivo)
├── Reportes                (Reportes financieros)
└── Configuración           (Plan de Cuentas y categorías)
```

### Información en Tiempo Real

**Panel Principal muestra:**
- **Total Disponible Hoy:** Suma de todos los saldos de cuentas
- **Ingresos del Período:** Dinero ingresado
- **Egresos del Período:** Dinero egresado
- **Balance Neto:** Ingresos menos Egresos
- **Últimas Operaciones:** Registro de movimientos recientes

---

## PLAN DE CUENTAS

### ¿Qué es el Plan de Cuentas?

Es la estructura oficial de clasificación contable de ABR. Cada código representa una categoría específica de dinero:

**Ejemplos:**
- **1101** = CAJA (efectivo en mano)
- **1201** = BANCO NACIÓN (cuenta corriente)
- **4101** = CUOTAS SOCIALES (ingresos de socios)
- **5101** = REMUNERACIÓN DE PERSONAL (sueldos)

### Estructura por Tipo

#### **1000 - ACTIVO** (Lo que ABR posee)
- **11xx** - Caja (efectivo disponible)
- **12xx** - Bancos (cuentas corrientes y de ahorro)
- **13xx** - Cuentas a Cobrar (dinero que deben)
- **15xx** - Bienes (libros, películas, equipos)
- **16xx** - Inmuebles (propiedades)

#### **2000 - PASIVO** (Lo que ABR debe)
- **21xx** - Cuentas por Pagar (dinero que debemos)
- **23xx** - Obligaciones Laborales (sueldos, aportes, contribuciones)

#### **4000 - INGRESOS** (Dinero que entra)
- **41xx** - Ingresos por Membresía (cuotas, bonos, contribuciones)
- **45xx** - Ingresos por Servicios (alquileres, donaciones, convenios)
- **47xx** - Subsidios (nacionales, provinciales, municipales)
- **48xx** - Rendimientos Financieros (intereses, dividendos)

#### **5000 - EGRESOS** (Dinero que sale)
- **51xx** - Gastos de Personal (sueldos, cargas sociales, honorarios)
- **55xx** - Gastos de Operación (servicios, mantenimiento, utilities)

**Total: 94 códigos contables disponibles**

---

## CUENTAS BANCARIAS Y DE EFECTIVO

### ¿Qué es una Cuenta?

Una **Cuenta** es un depósito de dinero. Puede ser:

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| **Efectivo** | Dinero en caja | Caja Principal, Caja Chica |
| **Banco** | Cuenta bancaria | Banco Nación, Banco Provincia |
| **Otra** | Billeteras digitales | Mercado Pago, PayPal |

### Saldos Actuales

El sistema mantiene actualizado el saldo de cada cuenta:

| Cuenta | Tipo | Saldo |
|--------|------|-------|
| Caja Principal | Efectivo | $ 89,500.50 |
| Caja Chica | Efectivo | $ 12,850.00 |
| Banco Nación (Corriente) | Banco | $ 351,500.00 |
| Banco Provincia (Ahorro) | Banco | $ 180,000.00 |
| Mercado Pago | Otra | $ 15,000.00 |
| **TOTAL DISPONIBLE** | | **$ 648,850.50** |

### Crear una Nueva Cuenta

Para registrar una nueva cuenta:

1. Ir a **Cuentas** → **Nueva Cuenta**
2. Completar datos:
   - **Nombre:** (ej: "Banco Credicoop Depósito Fijo")
   - **Tipo:** Seleccionar (Efectivo / Banco / Otra)
   - **Saldo Inicial:** Monto actual en la cuenta
   - **Divisa:** ARS (pesos argentinos)
3. Si es Banco, agregar:
   - Número de cuenta
   - Nombre del banco
4. Guardar

---

## OPERACIONES CONTABLES

### 1. REGISTRAR UN INGRESO

**¿Cuándo?** Cuando entra dinero a ABR

**Ejemplos:**
- Pago de cuota social de un socio
- Subsidio del municipio
- Donación recibida
- Intereses de plazo fijo

**Pasos:**

1. Ir a **Panel Principal** → **Registrar Ingreso**
2. Completar:
   - **Monto:** Cantidad en pesos
   - **Plan de Cuentas:** Seleccionar código (4xxx)
   - **Cuenta:** Dónde entra el dinero
   - **Fecha:** Fecha del movimiento
   - **Descripción:** Detalles (opcional)
3. Guardar

**Resultado:** El dinero se suma automáticamente al saldo de la cuenta

---

### 2. REGISTRAR UN EGRESO

**¿Cuándo?** Cuando sale dinero de ABR

**Ejemplos:**
- Pago de salarios
- Servicios (luz, teléfono, internet)
- Mantenimiento
- Papelería

**Pasos:**

1. Ir a **Panel Principal** → **Registrar Egreso**
2. Completar:
   - **Monto:** Cantidad en pesos
   - **Plan de Cuentas:** Seleccionar código (5xxx)
   - **Cuenta:** De dónde sale el dinero
   - **Fecha:** Fecha del movimiento
   - **Descripción:** Detalles (opcional)
3. Guardar

**Resultado:** El dinero se resta automáticamente del saldo de la cuenta

---

### 3. TRANSFERENCIA ENTRE CUENTAS

**¿Cuándo?** Mover dinero de una cuenta a otra (ej: de Caja a Banco)

**Pasos:**

1. Ir a **Panel Principal** → **Transferencia**
2. Completar:
   - **Monto:** Cantidad a transferir
   - **Desde:** Cuenta origen
   - **Hacia:** Cuenta destino
   - **Tipo de Transferencia:** Motivo
   - **Fecha:** Fecha del movimiento
3. Guardar

**Resultado:** Se resta de la cuenta origen y suma en la cuenta destino

---

### 4. ARQUEO DE CAJA

**¿Qué es?** Proceso de conciliación donde se verifica que el dinero físico coincida con lo registrado en el sistema.

**Pasos:**

1. Ir a **Arqueos de Caja**
2. **Contar el dinero físico** en caja y verificar saldos bancarios
3. Completar en el sistema:
   - **Efectivo en Caja:** Monto que contaste
   - **Saldos Bancarios:** Según extracto bancario
   - **Otros:** Otras cuentas
4. El sistema **calcula automáticamente** la diferencia:
   - **Diferencia = 0:** Perfecto, todo coincide ✅
   - **Diferencia > 0:** Hay más dinero del esperado 💰
   - **Diferencia < 0:** Falta dinero 🚨
5. Registrar y guardar

---

## REPORTES FINANCIEROS

### 1. ESTADO DE RESULTADOS (Ingresos vs Egresos)

**¿Qué muestra?** La ganancia o pérdida en un período

**Estructura:**

```
PERÍODO: Marzo 2026

INGRESOS                          MONTO
├── Cuotas Sociales           $ 10,500.00
├── Bonos Consulta             $ 7,500.50
├── Subsidios                  $ 15,000.00
├── Intereses y Rendimientos   $ 3,050.00
└── TOTAL INGRESOS           $ 46,550.50

EGRESOS                          MONTO
├── Sueldos                   $ 15,000.00
├── Cargas Sociales            $ 3,200.00
├── Servicios (luz, teléfono)  $ 2,000.00
├── Mantenimiento              $ 1,000.00
├── Papelería y útiles           $ 500.00
└── TOTAL EGRESOS             $ 21,700.00

RESULTADO NETO
Ingresos - Egresos = $ 24,850.50 ✅ GANANCIA
```

**Cómo consultarlo:**
1. Ir a **Reportes**
2. Seleccionar período (día, semana, mes, rango)
3. Ver desglose por código contable
4. Exportar a CSV si es necesario

---

### 2. BALANCE GENERAL (Patrimonial)

**¿Qué muestra?** La posición financiera en una fecha específica

**Estructura:**

```
BALANCE GENERAL - 6 de Marzo de 2026

ACTIVOS (Lo que tenemos)
├── Efectivo en Caja          $ 102,350.50
├── Bancos                    $ 531,500.00
├── Por Cobrar                 $ 15,000.00
└── TOTAL ACTIVOS            $ 648,850.50

PASIVOS (Lo que debemos)
├── Sueldos por Pagar          $ 15,000.00
├── Aportes por Pagar           $ 8,500.00
└── TOTAL PASIVOS             $ 23,500.00

PATRIMONIO NETO
Activos - Pasivos = $ 625,350.50
```

---

### 3. ANÁLISIS POR CUENTA CONTABLE

**¿Qué muestra?** Detalles de movimientos en cada código contable

**Ejemplo para código 5101 (Sueldos):**

```
CUENTA: 5101 - REMUNERACIÓN DE PERSONAL

Fecha     | Descripción              | Monto   | Saldo
----------|--------------------------|---------|--------
01/03     | Pago Empleado A          | 8,000   | 8,000
02/03     | Pago Empleado B          | 7,000   | 15,000
06/03     | Aguinaldo                | 3,000   | 18,000
```

---

## RECONCILIACIÓN DE CAJA

### ¿Por qué es importante?

Asegura que:
- ✅ No hay dinero extraviado
- ✅ Los registros son exactos
- ✅ Se detectan errores rápidamente
- ✅ Hay control interno

### Proceso Diario Recomendado

**Al final de cada día:**

1. **Contar dinero en caja**
   - Billete por billete
   - Moneda por moneda
   - Registrar total

2. **Verificar saldos bancarios**
   - Consultar extractos online
   - Anotarlos

3. **Ingresar en el sistema**
   - Ir a Arqueos de Caja
   - Completar montos
   - Revisar diferencia

4. **Si hay diferencia:**
   - Revisar operaciones del día
   - Verificar depósitos/cheques
   - Investigar discrepancias

5. **Registrar y cerrar**
   - Guardar arqueo
   - Documentar cualquier diferencia encontrada

### Ejemplo de Arqueo Diario

```
ARQUEO DE CAJA - 6 de Marzo de 2026

Dinero Contado en Caja:          $ 102,350.50
Saldo Esperado (Sistema):        $ 102,350.50
DIFERENCIA:                             $ 0.00 ✅

Banco Nación (Extrado Online):   $ 351,500.00
Saldo en Sistema:                $ 351,500.00
DIFERENCIA:                             $ 0.00 ✅

CONCLUSIÓN: CAJA PERFECTA ✅
```

---

## PREGUNTAS FRECUENTES

### P: ¿Qué pasa si la diferencia de arqueo es negativa?

**R:** Significa que falta dinero. Posibles causas:
- Error al contar
- Gasto no registrado
- Robo o pérdida

**Acción:** Investigar, registrar el faltante y ajustar contablemente.

---

### P: ¿Puedo modificar un movimiento registrado?

**R:** Sí, pero dejará registro. Es mejor:
- Registrar una corrección (egreso/ingreso opuesto)
- Documentar por qué se hizo

---

### P: ¿Qué significa "Plan de Cuentas"?

**R:** Es la estructura oficial de clasificación. Cada número tiene significado:
- Primer dígito = Tipo (1=Activo, 2=Pasivo, 4=Ingreso, 5=Egreso)
- Siguientes dígitos = Subcategoría específica

---

### P: ¿Cuál es la diferencia entre Egreso y Transferencia?

**R:**
- **Egreso:** Dinero que SALE de ABR (pago de servicios, salarios, etc.)
- **Transferencia:** Dinero que se MUEVE dentro de ABR (de una cuenta a otra)

---

### P: ¿Cómo aseguro que el sistema sea seguro?

**R:** El sistema tiene:
- ✅ Autenticación con usuario y contraseña
- ✅ Registro de quién hizo cada operación
- ✅ Protección contra accesos no autorizados
- ✅ Backup automático de datos

**Recomendación:** Cambiar contraseña regularmente.

---

### P: ¿Puedo exportar los reportes?

**R:** Sí, todos los reportes pueden:
- 📄 Exportarse a CSV (Excel)
- 🖨️ Imprimirse
- 📊 Consultarse por período

---

## FLUJO GENERAL DE OPERACIONES

```
OPERACIÓN DIARIA EN ABR

1. MAÑANA
   └─ Abrir caja
   └─ Revisar saldo inicial

2. DURANTE EL DÍA
   ├─ Ingreso: Socio paga cuota → Registrar ingreso
   ├─ Egreso: Pagar servicios → Registrar egreso
   ├─ Transferencia: Caja a Banco → Registrar transferencia
   └─ Dashboard: Ver resumen actualizado

3. TARDE
   ├─ Hacer compras / pagos → Registrar gastos
   ├─ Recibir dinero → Registrar ingresos
   └─ Actualizar notas

4. FIN DE DÍA
   ├─ Contar dinero en caja
   ├─ Hacer arqueo
   └─ Revisar diferencias

5. RESUMEN PERÍODO
   ├─ Generar Estado de Resultados
   ├─ Generar Balance General
   └─ Analizar resultados
```

---

## RECOMENDACIONES DE BUENAS PRÁCTICAS

### ✅ HACER

- ✓ Registrar operaciones el mismo día
- ✓ Revisar saldos diariamente
- ✓ Hacer arqueos regulares
- ✓ Usar descripciones claras
- ✓ Mantener comprobantes
- ✓ Guardar reportes mensualmente
- ✓ Revisar Estado de Resultados semanalmente

### ❌ NO HACER

- ✗ Retrasar registros varios días
- ✗ Usar cuentas incorrectas
- ✗ Perder comprobantes
- ✗ Ignorar diferencias de arqueo
- ✗ Compartir contraseña
- ✗ Eliminar registros sin documentar

---

## CONTACTO Y SOPORTE

Para problemas técnicos:
- Contactar al administrador del sistema
- Reportar errores con detalles de la operación
- Guardar comprobantes de todas las transacciones

---

**Versión:** 1.0
**Fecha:** 6 de Marzo de 2026
**Próxima revisión:** 30 de Abril de 2026

---

*Este manual está diseñado para personas con conocimientos contables pero sin experiencia técnica. Se recomienda leerlo completamente antes de usar el módulo por primera vez.*

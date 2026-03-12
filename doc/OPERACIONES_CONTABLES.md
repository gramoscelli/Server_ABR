# Operaciones Contables - Planificación

## Egresos (salida de dinero)
- Pago a proveedores
- Pago de servicios (luz, gas, agua, internet, teléfono)
- Pago de sueldos y honorarios
- Compra de materiales/insumos
- Gastos de mantenimiento
- Impuestos y tasas
- Comisiones y gastos bancarios
- Gastos de eventos/actividades
- Otros gastos

## Ingresos (entrada de dinero)
- Cobro de cuotas de socios
- Donaciones recibidas
- Subsidios / subvenciones
- Venta de productos o servicios
- Intereses bancarios
- Alquiler de espacios
- Ingresos por eventos/actividades
- Otros ingresos

## Otras operaciones (no son ingreso ni egreso real)
- Transferencia entre cuentas propias (caja → banco, banco → caja, banco → banco)
- Ajuste de saldo (corrección contable, diferencia de arqueo)
- Depósito bancario (caso particular de transferencia caja→banco)
- Extracción bancaria (banco→caja)

## Nota
Egresos e ingresos cambian el patrimonio (entra o sale plata de la organización).
Otras operaciones solo mueven plata internamente sin cambiar el total.

## Estado de implementación

### Categorización
- Todas las operaciones se categorizan via **plan_de_cuentas** (plan contable).
- Las tablas `expense_categories` e `income_categories` fueron eliminadas (no se usaban).
- Los transfer_types siguen activos para clasificar transferencias entre cuentas.

### Ajuste de saldo
- Ahora genera una operación rastreable (ingreso o egreso) con plan_cta_id "AJUSTE CONTABLE".
- Códigos: 4901 (ajuste positivo/ingreso), 5901 (ajuste negativo/egreso).
- La operación queda registrada en el libro diario como cualquier otra.

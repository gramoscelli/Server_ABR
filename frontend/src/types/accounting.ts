// Accounting Types - Double-Entry Bookkeeping System

export interface CuentaContable {
  id: number
  codigo: number
  titulo: string
  descripcion: string | null
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
  subtipo: 'efectivo' | 'bancaria' | 'cobro_electronico' | 'credito_cobrar' | 'pasivo_liquidar' | null
  requiere_detalle: boolean
  grupo: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Extended tables (loaded via includes)
  efectivo?: CuentaEfectivo
  bancaria?: CuentaBancaria
  pagoElectronico?: CuentaPagoElectronico
  // Computed at query time
  saldo?: number
  total_debe?: number
  total_haber?: number
}

export interface CuentaEfectivo {
  id_cuenta: number
  sucursal: string | null
  responsable: string | null
  moneda: string
  permite_arqueo: boolean
}

export interface CuentaBancaria {
  id_cuenta: number
  banco: string
  nro_cuenta: string | null
  cbu: string | null
  alias: string | null
  moneda: string
  tipo_cuenta: 'caja_ahorro' | 'cuenta_corriente' | null
  activa: boolean
}

export interface CuentaPagoElectronico {
  id_cuenta: number
  proveedor: string
  tipo_medio: string | null
  plazo_acreditacion: number
  liquidacion_diferida: boolean
}

export interface UsuarioRef {
  id: number
  username: string
  nombre: string | null
  apellido: string | null
}

export interface Asiento {
  id_asiento: number
  fecha: string
  nro_comprobante: string
  origen: 'manual' | 'ingreso' | 'egreso' | 'transferencia' | 'ajuste' | 'compra' | 'liquidacion' | 'anulacion' | 'pase_subdiario'
  concepto: string
  estado: 'borrador' | 'confirmado' | 'anulado'
  usuario_id: number
  id_asiento_anulado?: number | null
  subdiario?: string | null
  id_pase_diario?: number | null
  confirmado_por?: number | null
  confirmado_at?: string | null
  anulado_por?: number | null
  anulado_at?: string | null
  eliminado?: boolean
  eliminado_por?: number | null
  eliminado_at?: string | null
  created_at: string
  updated_at: string
  detalles?: AsientoDetalle[]
  usuario?: UsuarioRef
  confirmado_por_usuario?: UsuarioRef | null
  anulado_por_usuario?: UsuarioRef | null
  eliminado_por_usuario?: UsuarioRef | null
  asientoAnulado?: {
    id_asiento: number
    nro_comprobante: string
    fecha: string
    concepto: string
  } | null
}

export interface AsientoAuditEntry {
  id_audit: number
  id_asiento: number
  accion: 'creado' | 'editado' | 'confirmado' | 'anulado' | 'eliminado' | 'pase_diario'
  usuario_id: number
  timestamp: string
  detalle: Record<string, unknown> | null
  usuario?: UsuarioRef | null
}

export interface AsientoDetalle {
  id_detalle: number
  id_asiento: number
  id_cuenta: number
  tipo_mov: 'debe' | 'haber'
  importe: string | number
  referencia_operativa: string | null
  cuenta?: CuentaContable
}

export interface LiquidacionElectronica {
  id_liquidacion: number
  id_cuenta: number
  fecha_operacion: string
  fecha_acreditacion: string | null
  estado: 'pendiente' | 'acreditada' | 'rechazada'
  importe_bruto: string | number
  comision: string | number
  importe_neto: string | number
  id_asiento_origen: number | null
  id_asiento_acreditacion: number | null
  referencia: string | null
  cuentaPago?: CuentaPagoElectronico & { cuenta?: CuentaContable }
}

export interface CashReconciliation {
  id: number
  id_cuenta: number
  date: string
  opening_balance: string | number
  closing_balance: string | number
  expected_balance: string | number
  difference?: number
  notes: string | null
  user_id: number
  created_at: string
  updated_at: string
  cuenta?: CuentaContable
}

// API Response types
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
  summary?: {
    totalDebe?: string
    totalHaber?: string
    count?: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface DashboardData {
  cuentas: (CuentaContable & { saldo: number })[]
  balances: {
    total: string
    by_subtipo: {
      efectivo: string
      bancaria: string
      cobro_electronico: string
    }
  }
  period: {
    start_date: string
    end_date: string
    total_egresos: string
    total_ingresos: string
    net_result: string
    egresos_by_cuenta: CuentaStat[]
    ingresos_by_cuenta: CuentaStat[]
  }
  recent_asientos: Asiento[]
}

export interface AccountBalancesData {
  cuentas: {
    activo: (CuentaContable & { saldo: number; total_debe: number; total_haber: number })[]
    pasivo: (CuentaContable & { saldo: number; total_debe: number; total_haber: number })[]
    patrimonio: (CuentaContable & { saldo: number; total_debe: number; total_haber: number })[]
    ingreso: (CuentaContable & { saldo: number; total_debe: number; total_haber: number })[]
    egreso: (CuentaContable & { saldo: number; total_debe: number; total_haber: number })[]
  }
  totals: {
    activo: string
    pasivo: string
    patrimonio: string
    ingreso: string
    egreso: string
  }
  as_of_date: string
}

export interface CuentaStat {
  id_cuenta: number
  total: string
  count: number
  cuenta: {
    id: number
    codigo: number
    titulo: string
  }
}

export interface MonthlyData {
  month: string
  egresos: string
  ingresos: string
  net: string
}

export interface BalanceSumasSaldosRow {
  id: number
  codigo: number
  titulo: string
  tipo: string
  grupo: string
  suma_debe: string
  suma_haber: string
  saldo_deudor: string
  saldo_acreedor: string
}

export interface MayorMovimiento {
  id_detalle: number
  id_asiento: number
  id_cuenta: number
  tipo_mov: 'debe' | 'haber'
  importe: string | number
  referencia_operativa: string | null
  saldo_acumulado: string
  asiento: {
    id_asiento: number
    fecha: string
    nro_comprobante: string
    concepto: string
    origen: string
  }
}

// Query params types
export interface AsientoQueryParams {
  start_date?: string
  end_date?: string
  estado?: 'borrador' | 'confirmado' | 'anulado'
  origen?: string
  cuenta_id?: number
  subdiario?: string
  include_subdiario?: string
  page?: number
  limit?: number
}

export interface CuentaQueryParams {
  tipo?: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso'
  subtipo?: string
  is_active?: boolean
  grupo?: string
}

export interface CashReconciliationQueryParams {
  id_cuenta?: number
  start_date?: string
  end_date?: string
}

export interface DashboardQueryParams {
  start_date?: string
  end_date?: string
}

// Form data types
export interface CreateAsientoData {
  fecha: string
  origen?: string
  concepto: string
  estado?: 'borrador' | 'confirmado'
  subdiario?: string | null
  detalles: CreateAsientoDetalleData[]
}

// Subdiario types
export interface SubdiarioPendiente {
  fecha: string
  count: number
  total_debe: number
}

export interface PasePreviewDetalle {
  id_cuenta: number
  cuenta: CuentaContable
  tipo_mov: 'debe' | 'haber'
  importe: number
}

export interface PasePreview {
  fecha: string
  asientosCount: number
  asientos: {
    id_asiento: number
    nro_comprobante: string
    concepto: string
    origen: string
  }[]
  detalles: PasePreviewDetalle[]
  totalDebe: number
  totalHaber: number
}

export interface PaseResult {
  asientoResumen: Asiento
  asientosVinculados: number
}

export interface CreateAsientoDetalleData {
  id_cuenta: number
  tipo_mov: 'debe' | 'haber'
  importe: number
  referencia_operativa?: string
}

export interface CreateCuentaContableData {
  codigo: number
  titulo: string
  descripcion?: string
  subtipo?: string | null
  requiere_detalle?: boolean
  // Extended fields
  sucursal?: string
  responsable?: string
  moneda?: string
  permite_arqueo?: boolean
  banco?: string
  nro_cuenta?: string
  cbu?: string
  alias?: string
  tipo_cuenta?: string
  proveedor?: string
  tipo_medio?: string
  plazo_acreditacion?: number
  liquidacion_diferida?: boolean
}

export interface UpdateCuentaContableData {
  titulo?: string
  descripcion?: string
  is_active?: boolean
  subtipo?: string | null
  requiere_detalle?: boolean
  // Extended fields
  sucursal?: string
  responsable?: string
  moneda?: string
  permite_arqueo?: boolean
  banco?: string
  nro_cuenta?: string
  cbu?: string
  alias?: string
  tipo_cuenta?: string
  activa?: boolean
  proveedor?: string
  tipo_medio?: string
  plazo_acreditacion?: number
  liquidacion_diferida?: boolean
}

export interface CreateCashReconciliationData {
  id_cuenta: number
  date: string
  opening_balance: number
  closing_balance: number
  expected_balance: number
  notes?: string | null
}

export interface UpdateCashReconciliationData {
  closing_balance?: number
  notes?: string | null
}

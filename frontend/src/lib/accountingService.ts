import { fetchWithAuth } from './auth'
import { API_ENDPOINTS } from '@/config/api'
import type {
  AccountBalancesData,
  ApiResponse,
  Asiento,
  AsientoAuditEntry,
  AsientoQueryParams,
  CashReconciliation,
  CashReconciliationQueryParams,
  CreateAsientoData,
  CreateCashReconciliationData,
  CreateCuentaContableData,
  CuentaContable,
  CuentaQueryParams,
  DashboardData,
  DashboardQueryParams,
  LiquidacionElectronica,
  MonthlyData,
  PaginatedResponse,
  UpdateCashReconciliationData,
  UpdateCuentaContableData,
} from '@/types/accounting'

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  }
  const str = query.toString()
  return str ? `?${str}` : ''
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(url, options)
  return response.json()
}

// ============================================================
// DASHBOARD
// ============================================================

export async function getDashboard(params?: DashboardQueryParams): Promise<DashboardData> {
  const query = params ? buildQuery(params as Record<string, string | undefined>) : ''
  const result: ApiResponse<DashboardData> = await fetchJson(`${API_ENDPOINTS.ACCOUNTING.DASHBOARD}${query}`)
  return result.data
}

export async function getAccountBalances(as_of_date?: string): Promise<AccountBalancesData> {
  const query = as_of_date ? `?as_of_date=${as_of_date}` : ''
  const result: ApiResponse<AccountBalancesData> = await fetchJson(`${API_ENDPOINTS.ACCOUNTING.DASHBOARD_BALANCES}${query}`)
  return result.data
}

export async function getDashboardMonthly(year?: number): Promise<MonthlyData[]> {
  const query = year ? `?year=${year}` : ''
  const result: ApiResponse<MonthlyData[]> = await fetchJson(`${API_ENDPOINTS.ACCOUNTING.DASHBOARD_MONTHLY}${query}`)
  return result.data
}

export async function getCuotasDia(fecha: string): Promise<ApiResponse<{ fecha: string; total: number; cantidad: number }>> {
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.DASHBOARD_CUOTAS_DIA}?fecha=${fecha}`)
}

// ============================================================
// CUENTAS CONTABLES (Chart of Accounts)
// ============================================================

export async function getCuentas(params?: CuentaQueryParams): Promise<{ data: CuentaContable[] }> {
  const query = params ? buildQuery(params as Record<string, string | boolean | undefined>) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.CUENTAS}${query}`)
}

export async function getCuenta(id: number): Promise<ApiResponse<CuentaContable>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CUENTA_BY_ID(id))
}

export async function getCuentaByCodigo(codigo: number): Promise<ApiResponse<CuentaContable>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CUENTA_BY_CODIGO(codigo))
}

export async function createCuenta(data: CreateCuentaContableData): Promise<ApiResponse<CuentaContable>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CUENTAS, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCuenta(id: number, data: UpdateCuentaContableData): Promise<ApiResponse<CuentaContable>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CUENTA_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCuenta(id: number): Promise<ApiResponse<void>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CUENTA_BY_ID(id), {
    method: 'DELETE',
  })
}

// ============================================================
// ASIENTOS (Journal Entries)
// ============================================================

export async function getAsientos(params?: AsientoQueryParams): Promise<PaginatedResponse<Asiento>> {
  const query = params ? buildQuery(params as Record<string, string | number | undefined>) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.ASIENTOS}${query}`)
}

export async function getAsiento(id: number): Promise<ApiResponse<Asiento>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_BY_ID(id))
}

export async function createAsiento(data: CreateAsientoData): Promise<ApiResponse<Asiento>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTOS, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateAsiento(id: number, data: Partial<CreateAsientoData>): Promise<ApiResponse<Asiento>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function confirmarAsiento(id: number): Promise<ApiResponse<Asiento>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_CONFIRMAR(id), {
    method: 'POST',
  })
}

export async function anularAsiento(id: number): Promise<ApiResponse<{ asientoOriginal: Asiento; contraAsiento: Asiento }>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_ANULAR(id), {
    method: 'POST',
  })
}

export async function deleteAsiento(id: number): Promise<ApiResponse<void>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_BY_ID(id), {
    method: 'DELETE',
  })
}

export async function paseDiarioIndividual(id: number): Promise<ApiResponse<{ asientoResumen: Asiento }>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_PASE_DIARIO(id), { method: 'POST' })
}

export async function getAsientoAudit(id: number): Promise<ApiResponse<AsientoAuditEntry[]>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.ASIENTO_AUDIT(id))
}

// ============================================================
// LIQUIDACIONES
// ============================================================

export async function getLiquidaciones(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<LiquidacionElectronica>> {
  const query = params ? buildQuery(params) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.LIQUIDACIONES}${query}`)
}

export async function createLiquidacion(data: Record<string, unknown>): Promise<ApiResponse<LiquidacionElectronica>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.LIQUIDACIONES, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function acreditarLiquidacion(id: number, id_cuenta_destino: number): Promise<ApiResponse<LiquidacionElectronica>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.LIQUIDACION_ACREDITAR(id), {
    method: 'POST',
    body: JSON.stringify({ id_cuenta_destino }),
  })
}

// ============================================================
// CASH RECONCILIATIONS
// ============================================================

export async function getCashReconciliations(params?: CashReconciliationQueryParams): Promise<{ data: CashReconciliation[] }> {
  const query = params ? buildQuery(params as Record<string, string | number | undefined>) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATIONS}${query}`)
}

export async function getCashReconciliationByDate(date: string, id_cuenta?: number): Promise<ApiResponse<CashReconciliation>> {
  const query = id_cuenta ? `?id_cuenta=${id_cuenta}` : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_DATE(date)}${query}`)
}

export async function calculateExpectedBalance(cuentaId: number, date: string): Promise<ApiResponse<{
  opening_balance: string
  total_debe: string
  total_haber: string
  expected_balance: string
}>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_CALCULATE(cuentaId, date))
}

export async function createCashReconciliation(data: CreateCashReconciliationData): Promise<ApiResponse<CashReconciliation>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATIONS, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCashReconciliation(id: number, data: UpdateCashReconciliationData): Promise<ApiResponse<CashReconciliation>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_ID(id), {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteCashReconciliation(id: number): Promise<ApiResponse<void>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.CASH_RECONCILIATION_BY_ID(id), {
    method: 'DELETE',
  })
}

// ============================================================
// SUBDIARIO (Sub-journal posting)
// ============================================================

export async function getSubdiarioPendientes(subdiario = 'caja'): Promise<ApiResponse<{ fecha: string; count: number; total_debe: number }[]>> {
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.SUBDIARIO_PENDIENTES}?subdiario=${subdiario}`)
}

export async function getSubdiarioPreview(fecha: string, subdiario = 'caja', fechaHasta?: string): Promise<ApiResponse<{
  fecha: string
  fechaHasta: string
  asientosCount: number
  asientos: { id_asiento: number; nro_comprobante: string; concepto: string; origen: string; fecha: string }[]
  detalles: { id_cuenta: number; cuenta: CuentaContable; tipo_mov: string; importe: number }[]
  totalDebe: number
  totalHaber: number
}>> {
  let url = `${API_ENDPOINTS.ACCOUNTING.SUBDIARIO_PREVIEW}?fecha=${fecha}&subdiario=${subdiario}`
  if (fechaHasta) url += `&fecha_hasta=${fechaHasta}`
  return fetchJson(url)
}

export async function ejecutarPaseDiario(fecha: string, subdiario = 'caja', fechaHasta?: string): Promise<ApiResponse<{
  asientoResumen: Asiento
  asientosVinculados: number
}>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.SUBDIARIO_PASE, {
    method: 'POST',
    body: JSON.stringify({ fecha, subdiario, fecha_hasta: fechaHasta }),
  })
}

// ============================================================
// AUDIT
// ============================================================

export async function getAuditLog(params?: Record<string, string | number | undefined>): Promise<{
  success: boolean
  data: AsientoAuditEntry[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}> {
  const query = params ? buildQuery(params) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.AUDIT_LOG}${query}`)
}

export async function getAuditStats(): Promise<ApiResponse<{
  total: number
  porAccion: { accion: string; total: number }[]
  actividadReciente: { fecha: string; total: number }[]
}>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.AUDIT_LOG_STATS)
}

export async function getAuditFilters(): Promise<ApiResponse<{
  acciones: string[]
  usuarios: { id: number; username: string; nombre: string | null; apellido: string | null }[]
}>> {
  return fetchJson(API_ENDPOINTS.ACCOUNTING.AUDIT_LOG_FILTERS)
}

// ============================================================
// REPORTS
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLibroDiario(start_date: string, end_date: string): Promise<any> {
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.REPORTS.LIBRO_DIARIO}?start_date=${start_date}&end_date=${end_date}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getMayor(cuentaId: number, params?: { start_date?: string; end_date?: string }): Promise<any> {
  const query = params ? buildQuery(params) : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.REPORTS.MAYOR(cuentaId)}${query}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBalanceSumasSaldos(as_of_date?: string): Promise<any> {
  const query = as_of_date ? `?as_of_date=${as_of_date}` : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.REPORTS.BALANCE_SUMAS_SALDOS}${query}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEstadoResultados(start_date: string, end_date: string): Promise<any> {
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.REPORTS.ESTADO_RESULTADOS}?start_date=${start_date}&end_date=${end_date}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getBalanceGeneral(as_of_date?: string): Promise<any> {
  const query = as_of_date ? `?as_of_date=${as_of_date}` : ''
  return fetchJson(`${API_ENDPOINTS.ACCOUNTING.REPORTS.BALANCE_GENERAL}${query}`)
}

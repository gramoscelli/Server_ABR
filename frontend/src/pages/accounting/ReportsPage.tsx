import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  Download,
  BarChart3,
  TrendingUp,
  BookOpen,
  FileText,
  Scale,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import * as accountingService from '@/lib/accountingService'
import type { Asiento, CuentaContable, BalanceSumasSaldosRow, MayorMovimiento } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ReportTab = 'libro-diario' | 'mayor' | 'balance-sumas-saldos' | 'estado-resultados' | 'balance-general'

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('libro-diario')
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(1)
    return date
  })
  const [selectedEndDate, setSelectedEndDate] = useState(new Date())
  const [asOfDate, setAsOfDate] = useState(new Date())
  const [loading, setLoading] = useState(false)

  // Data
  const [libroDiarioData, setLibroDiarioData] = useState<any>(null)
  const [mayorData, setMayorData] = useState<{ movimientos: MayorMovimiento[]; cuenta: CuentaContable } | null>(null)
  const [balanceSumasData, setBalanceSumasData] = useState<BalanceSumasSaldosRow[]>([])
  const [estadoResultadosData, setEstadoResultadosData] = useState<any>(null)
  const [balanceGeneralData, setBalanceGeneralData] = useState<any>(null)

  // Mayor: select cuenta
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [selectedCuentaId, setSelectedCuentaId] = useState<string>('')

  const startDateStr = toLocalDateStr(selectedStartDate)
  const endDateStr = toLocalDateStr(selectedEndDate)
  const asOfDateStr = toLocalDateStr(asOfDate)

  // Load cuentas for Mayor
  useEffect(() => {
    const loadCuentas = async () => {
      try {
        const response = await accountingService.getCuentas()
        setCuentas(response.data || [])
      } catch (error) {
        console.error('Error loading cuentas:', error)
      }
    }
    loadCuentas()
  }, [])

  // Fetch data when tab or dates change
  useEffect(() => {
    fetchReport()
  }, [activeTab, startDateStr, endDateStr, asOfDateStr, selectedCuentaId])

  const fetchReport = async () => {
    setLoading(true)
    try {
      switch (activeTab) {
        case 'libro-diario': {
          const resp = await accountingService.getLibroDiario(startDateStr, endDateStr)
          // Backend returns { success, data: { asientos, totals, period } }
          setLibroDiarioData(resp.data || resp)
          break
        }
        case 'mayor': {
          if (!selectedCuentaId) { setLoading(false); return }
          const resp = await accountingService.getMayor(Number(selectedCuentaId), {
            start_date: startDateStr,
            end_date: endDateStr,
          })
          // Backend returns { success, data: { cuenta, movimientos, totals } }
          setMayorData(resp.data || resp)
          break
        }
        case 'balance-sumas-saldos': {
          const resp = await accountingService.getBalanceSumasSaldos(asOfDateStr)
          // Backend returns { success, data: { rows, totals, as_of_date } }
          const balData = resp.data || resp
          setBalanceSumasData(balData.rows || balData || [])
          break
        }
        case 'estado-resultados': {
          const resp = await accountingService.getEstadoResultados(startDateStr, endDateStr)
          // Backend returns { success, data: { ingresos, egresos, resultado_neto } }
          setEstadoResultadosData(resp.data || resp)
          break
        }
        case 'balance-general': {
          const resp = await accountingService.getBalanceGeneral(asOfDateStr)
          // Backend returns { success, data: { activos, pasivos, patrimonio, check } }
          setBalanceGeneralData(resp.data || resp)
          break
        }
      }
    } catch (error) {
      console.error('Error fetching report:', error)
      toast({ title: 'Error', description: 'No se pudo cargar el reporte', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // EXCEL EXPORT
  // ============================================================================

  const downloadExcel = (sheetData: any[][], filename: string, colWidths?: number[]) => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(sheetData)
      if (colWidths) {
        ws['!cols'] = colWidths.map(w => ({ wch: w }))
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
      XLSX.writeFile(wb, filename)
    })
  }

  const exportLibroDiario = () => {
    if (!libroDiarioData?.asientos) return
    const rows: any[][] = [
      ['LIBRO DIARIO'],
      [`Periodo: ${startDateStr} a ${endDateStr}`],
      [],
      ['Fecha', 'Comprobante', 'Concepto', 'Origen', 'Estado', 'Cuenta', 'Debe', 'Haber'],
    ]
    for (const asiento of libroDiarioData.asientos) {
      for (const det of (asiento.detalles || [])) {
        rows.push([
          asiento.fecha,
          asiento.nro_comprobante,
          asiento.concepto,
          asiento.origen,
          asiento.estado,
          `${det.cuenta?.codigo || ''} ${det.cuenta?.titulo || ''}`,
          det.tipo_mov === 'debe' ? Number(det.importe) : '',
          det.tipo_mov === 'haber' ? Number(det.importe) : '',
        ])
      }
    }
    downloadExcel(rows, `libro-diario-${startDateStr}-${endDateStr}.xlsx`, [12, 16, 35, 14, 12, 30, 15, 15])
  }

  const exportBalanceSumas = () => {
    if (!balanceSumasData.length) return
    const rows: any[][] = [
      ['BALANCE DE SUMAS Y SALDOS'],
      [`Al: ${asOfDateStr}`],
      [],
      ['Codigo', 'Titulo', 'Tipo', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor'],
    ]
    for (const row of balanceSumasData) {
      rows.push([row.codigo, row.titulo, row.tipo, Number(row.suma_debe), Number(row.suma_haber), Number(row.saldo_deudor), Number(row.saldo_acreedor)])
    }
    rows.push([])
    rows.push([
      '', 'TOTALES', '',
      balanceSumasData.reduce((s, r) => s + Number(r.suma_debe), 0),
      balanceSumasData.reduce((s, r) => s + Number(r.suma_haber), 0),
      balanceSumasData.reduce((s, r) => s + Number(r.saldo_deudor), 0),
      balanceSumasData.reduce((s, r) => s + Number(r.saldo_acreedor), 0),
    ])
    downloadExcel(rows, `balance-sumas-saldos-${asOfDateStr}.xlsx`, [10, 30, 12, 15, 15, 15, 15])
  }

  const exportEstadoResultados = () => {
    if (!estadoResultadosData) return
    const rows: any[][] = [
      ['ESTADO DE RESULTADOS'],
      [`Periodo: ${startDateStr} a ${endDateStr}`],
      [],
      ['INGRESOS'],
      ['Codigo', 'Descripcion', 'Total'],
    ]
    for (const item of (estadoResultadosData.ingresos?.rows || [])) {
      rows.push([item.codigo || 'S/C', item.titulo, Number(item.total)])
    }
    rows.push(['', 'Total Ingresos', Number(estadoResultadosData.ingresos?.total || 0)])
    rows.push([])
    rows.push(['EGRESOS'])
    rows.push(['Codigo', 'Descripcion', 'Total'])
    for (const item of (estadoResultadosData.egresos?.rows || [])) {
      rows.push([item.codigo || 'S/C', item.titulo, Number(item.total)])
    }
    rows.push(['', 'Total Egresos', Number(estadoResultadosData.egresos?.total || 0)])
    rows.push([])
    rows.push(['RESULTADO NETO', '', Number(estadoResultadosData.resultado_neto || 0)])
    downloadExcel(rows, `estado-resultados-${startDateStr}-${endDateStr}.xlsx`, [12, 35, 18])
  }

  const exportMayor = () => {
    if (!mayorData?.movimientos?.length) return
    const rows: any[][] = [
      [`MAYOR - ${mayorData.cuenta?.codigo} ${mayorData.cuenta?.titulo}`],
      [`Periodo: ${startDateStr} a ${endDateStr}`],
      [],
      ['Fecha', 'Comprobante', 'Concepto', 'Debe', 'Haber', 'Saldo Acumulado'],
    ]
    for (const mov of mayorData.movimientos) {
      rows.push([
        mov.asiento?.fecha || '',
        mov.asiento?.nro_comprobante || '',
        mov.asiento?.concepto || '',
        mov.tipo_mov === 'debe' ? Number(mov.importe) : '',
        mov.tipo_mov === 'haber' ? Number(mov.importe) : '',
        Number(mov.saldo_acumulado),
      ])
    }
    downloadExcel(rows, `mayor-${mayorData.cuenta?.codigo}-${startDateStr}-${endDateStr}.xlsx`, [12, 16, 35, 15, 15, 18])
  }

  // ============================================================================
  // TAB CONFIG
  // ============================================================================

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'libro-diario', label: 'Libro Diario', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'mayor', label: 'Mayor', icon: <FileText className="h-4 w-4" /> },
    { key: 'balance-sumas-saldos', label: 'Balance Sumas y Saldos', icon: <Scale className="h-4 w-4" /> },
    { key: 'estado-resultados', label: 'Estado de Resultados', icon: <TrendingUp className="h-4 w-4" /> },
    { key: 'balance-general', label: 'Balance General', icon: <BarChart3 className="h-4 w-4" /> },
  ]

  const needsDateRange = ['libro-diario', 'mayor', 'estado-resultados'].includes(activeTab)
  const needsAsOfDate = ['balance-sumas-saldos', 'balance-general'].includes(activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes Financieros</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Informes contables y estados financieros
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(key)}
            className="gap-2"
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      {/* Date Controls */}
      <div className="flex flex-wrap items-end gap-4">
        {needsDateRange && (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
              <CompactDatePicker value={selectedStartDate} onChange={setSelectedStartDate} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
              <CompactDatePicker value={selectedEndDate} onChange={setSelectedEndDate} />
            </div>
          </>
        )}
        {needsAsOfDate && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Al dia</label>
            <CompactDatePicker value={asOfDate} onChange={setAsOfDate} />
          </div>
        )}
        {activeTab === 'mayor' && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cuenta</label>
            <Select value={selectedCuentaId} onValueChange={setSelectedCuentaId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleccionar cuenta..." />
              </SelectTrigger>
              <SelectContent>
                {cuentas.filter(c => c.is_active).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.codigo} - {c.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="bg-gray-50 dark:bg-gray-900/50">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando reporte...
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* LIBRO DIARIO */}
      {/* ================================================================ */}
      {!loading && activeTab === 'libro-diario' && libroDiarioData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatDate(startDateStr)} a {formatDate(endDateStr)}
            </h2>
            <Button variant="outline" size="sm" onClick={exportLibroDiario}>
              <Download className="h-4 w-4 mr-2" /> Descargar Excel
            </Button>
          </div>

          {libroDiarioData.totals && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500">Total Debe</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(libroDiarioData.totals.debe || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500">Total Haber</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(libroDiarioData.totals.haber || 0)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                      <th className="text-left py-2 px-3 font-semibold">Concepto</th>
                      <th className="text-left py-2 px-3 font-semibold">Cuenta</th>
                      <th className="text-right py-2 px-3 font-semibold">Debe</th>
                      <th className="text-right py-2 px-3 font-semibold">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(libroDiarioData.asientos || []).map((asiento: any, asientoIdx: number) => {
                      const detalles = [...(asiento.detalles || [])].sort((a: any, b: any) => {
                        if (a.tipo_mov === b.tipo_mov) return 0
                        return a.tipo_mov === 'debe' ? -1 : 1
                      })
                      const isAnulado = asiento.estado === 'anulado'
                      return detalles.map((det: any, idx: number) => (
                        <tr key={`${asiento.id_asiento}-${idx}`} className={cn(
                          'hover:bg-gray-50 dark:hover:bg-gray-900/50',
                          idx === 0 && asientoIdx > 0 && 'border-t-2 border-gray-300 dark:border-gray-600'
                        )}>
                          {idx === 0 ? (
                            <>
                              <td className="py-2 px-3 align-top" rowSpan={detalles.length || 1}>
                                <div>{formatDate(asiento.fecha)}</div>
                                {isAnulado && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 no-underline inline-block mt-1">Anulado</span>
                                )}
                              </td>
                              <td className="py-2 px-3 align-top" rowSpan={detalles.length || 1}>
                                <div>{asiento.concepto}</div>
                                {asiento.asientoAnulado && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 no-underline mt-1">
                                    Anula a: {asiento.asientoAnulado.nro_comprobante} ({formatDate(asiento.asientoAnulado.fecha)})
                                  </div>
                                )}
                              </td>
                            </>
                          ) : null}
                          <td className={cn('py-1 px-3', det.tipo_mov === 'haber' && 'pl-8')}>
                            <span className="font-mono text-xs text-gray-500 mr-1">{det.cuenta?.codigo}</span>
                            {det.cuenta?.titulo}
                          </td>
                          <td className="py-1 px-3 text-right font-medium">
                            {det.tipo_mov === 'debe' ? formatCurrency(det.importe) : ''}
                          </td>
                          <td className="py-1 px-3 text-right font-medium">
                            {det.tipo_mov === 'haber' ? formatCurrency(det.importe) : ''}
                          </td>
                        </tr>
                      ))
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* MAYOR */}
      {/* ================================================================ */}
      {!loading && activeTab === 'mayor' && (
        <div className="space-y-4">
          {!selectedCuentaId ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                Seleccione una cuenta para ver su mayor
              </CardContent>
            </Card>
          ) : mayorData ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mayor - {mayorData.cuenta?.codigo} {mayorData.cuenta?.titulo}
                </h2>
                <Button variant="outline" size="sm" onClick={exportMayor}>
                  <Download className="h-4 w-4 mr-2" /> Descargar Excel
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-3 font-semibold">Fecha</th>
                          <th className="text-left py-2 px-3 font-semibold">Comprobante</th>
                          <th className="text-left py-2 px-3 font-semibold">Concepto</th>
                          <th className="text-right py-2 px-3 font-semibold">Debe</th>
                          <th className="text-right py-2 px-3 font-semibold">Haber</th>
                          <th className="text-right py-2 px-3 font-semibold">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(mayorData.movimientos || []).map((mov) => (
                          <tr key={mov.id_detalle} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <td className="py-2 px-3">{formatDate(mov.asiento?.fecha || '')}</td>
                            <td className="py-2 px-3 font-mono text-xs">{mov.asiento?.nro_comprobante}</td>
                            <td className="py-2 px-3">{mov.asiento?.concepto}</td>
                            <td className="py-2 px-3 text-right font-medium text-blue-600">
                              {mov.tipo_mov === 'debe' ? formatCurrency(mov.importe) : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-blue-600">
                              {mov.tipo_mov === 'haber' ? formatCurrency(mov.importe) : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              {formatCurrency(mov.saldo_acumulado)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!mayorData.movimientos || mayorData.movimientos.length === 0) && (
                      <p className="text-center py-8 text-gray-500">No hay movimientos para esta cuenta en el periodo seleccionado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* ================================================================ */}
      {/* BALANCE SUMAS Y SALDOS */}
      {/* ================================================================ */}
      {!loading && activeTab === 'balance-sumas-saldos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Balance de Sumas y Saldos al {asOfDateStr}
            </h2>
            <Button variant="outline" size="sm" onClick={exportBalanceSumas} disabled={!balanceSumasData.length}>
              <Download className="h-4 w-4 mr-2" /> Descargar Excel
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300 dark:border-gray-600">
                      <th className="text-left py-2 px-3 font-semibold">Codigo</th>
                      <th className="text-left py-2 px-3 font-semibold">Titulo</th>
                      <th className="text-left py-2 px-3 font-semibold">Tipo</th>
                      <th className="text-right py-2 px-3 font-semibold">Suma Debe</th>
                      <th className="text-right py-2 px-3 font-semibold">Suma Haber</th>
                      <th className="text-right py-2 px-3 font-semibold">Saldo Deudor</th>
                      <th className="text-right py-2 px-3 font-semibold">Saldo Acreedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(balanceSumasData) ? balanceSumasData : []).map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-2 px-3 font-mono">{row.codigo}</td>
                        <td className="py-2 px-3">{row.titulo}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 capitalize">
                            {row.tipo}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(row.suma_debe)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(row.suma_haber)}</td>
                        <td className="py-2 px-3 text-right font-medium text-blue-600">
                          {Number(row.saldo_deudor) > 0 ? formatCurrency(row.saldo_deudor) : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-red-600">
                          {Number(row.saldo_acreedor) > 0 ? formatCurrency(row.saldo_acreedor) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {balanceSumasData.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-100 dark:bg-gray-800 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                        <td colSpan={3} className="py-3 px-3">TOTALES</td>
                        <td className="py-3 px-3 text-right">
                          {formatCurrency(balanceSumasData.reduce((s, r) => s + Number(r.suma_debe), 0))}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {formatCurrency(balanceSumasData.reduce((s, r) => s + Number(r.suma_haber), 0))}
                        </td>
                        <td className="py-3 px-3 text-right text-blue-600">
                          {formatCurrency(balanceSumasData.reduce((s, r) => s + Number(r.saldo_deudor), 0))}
                        </td>
                        <td className="py-3 px-3 text-right text-red-600">
                          {formatCurrency(balanceSumasData.reduce((s, r) => s + Number(r.saldo_acreedor), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {(!balanceSumasData || balanceSumasData.length === 0) && (
                  <p className="text-center py-8 text-gray-500">No hay datos disponibles</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* ESTADO DE RESULTADOS */}
      {/* ================================================================ */}
      {!loading && activeTab === 'estado-resultados' && estadoResultadosData && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Estado de Resultados - {startDateStr} a {endDateStr}
            </h2>
            <Button variant="outline" size="sm" onClick={exportEstadoResultados}>
              <Download className="h-4 w-4 mr-2" /> Descargar Excel
            </Button>
          </div>

          {/* Ingresos */}
          <Card>
            <CardHeader className="bg-green-50 dark:bg-green-900/20">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
                INGRESOS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-semibold">Codigo</th>
                      <th className="text-left py-2 px-3 font-semibold">Descripcion</th>
                      <th className="text-right py-2 px-3 font-semibold">Total</th>
                      <th className="text-center py-2 px-3 font-semibold">Ctas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(estadoResultadosData.ingresos?.rows || []).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-2 px-3 font-mono text-sm text-gray-600 dark:text-gray-400">{item.codigo || 'S/C'}</td>
                        <td className="py-2 px-3">{item.titulo}</td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">{item.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 dark:bg-green-900/20 font-semibold border-t-2 border-green-200 dark:border-green-800">
                      <td colSpan={2} className="py-3 px-3">Total Ingresos</td>
                      <td className="py-3 px-3 text-right text-green-700 dark:text-green-400">
                        {formatCurrency(estadoResultadosData.ingresos?.total || 0)}
                      </td>
                      <td className="py-3 px-3 text-center text-green-700 dark:text-green-400">
                        {estadoResultadosData.ingresos?.rows?.length || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Egresos */}
          <Card>
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <TrendingUp className="h-5 w-5 rotate-180" />
                EGRESOS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-semibold">Codigo</th>
                      <th className="text-left py-2 px-3 font-semibold">Descripcion</th>
                      <th className="text-right py-2 px-3 font-semibold">Total</th>
                      <th className="text-center py-2 px-3 font-semibold">Ctas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(estadoResultadosData.egresos?.rows || []).map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-2 px-3 font-mono text-sm text-gray-600 dark:text-gray-400">{item.codigo || 'S/C'}</td>
                        <td className="py-2 px-3">{item.titulo}</td>
                        <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">{item.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 dark:bg-red-900/20 font-semibold border-t-2 border-red-200 dark:border-red-800">
                      <td colSpan={2} className="py-3 px-3">Total Egresos</td>
                      <td className="py-3 px-3 text-right text-red-700 dark:text-red-400">
                        {formatCurrency(estadoResultadosData.egresos?.total || 0)}
                      </td>
                      <td className="py-3 px-3 text-center text-red-700 dark:text-red-400">
                        {estadoResultadosData.egresos?.rows?.length || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Resultado */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">RESULTADO DEL PERIODO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Ingresos</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(estadoResultadosData.ingresos?.total || 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Egresos</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(estadoResultadosData.egresos?.total || 0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Resultado Neto</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    Number(estadoResultadosData.resultado_neto || 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {formatCurrency(estadoResultadosData.resultado_neto || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* BALANCE GENERAL */}
      {/* ================================================================ */}
      {!loading && activeTab === 'balance-general' && balanceGeneralData && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Balance General al {asOfDateStr}
          </h2>

          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <BarChart3 className="h-5 w-5" />
                BALANCE GENERAL
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Render sections dynamically */}
                {balanceGeneralData.activos && (
                  <BalanceSection
                    title="ACTIVO"
                    sections={balanceGeneralData.activos}
                    colorClass="text-blue-900 dark:text-blue-100"
                    bgClass="bg-blue-100 dark:bg-blue-900/30"
                    borderClass="border-blue-300 dark:border-blue-700"
                  />
                )}
                {balanceGeneralData.pasivos && (
                  <BalanceSection
                    title="PASIVO"
                    sections={balanceGeneralData.pasivos}
                    colorClass="text-orange-900 dark:text-orange-100"
                    bgClass="bg-orange-100 dark:bg-orange-900/30"
                    borderClass="border-orange-300 dark:border-orange-700"
                  />
                )}
                {balanceGeneralData.patrimonio && (
                  <BalanceSection
                    title="PATRIMONIO NETO"
                    sections={balanceGeneralData.patrimonio}
                    colorClass="text-purple-900 dark:text-purple-100"
                    bgClass="bg-purple-100 dark:bg-purple-900/30"
                    borderClass="border-purple-300 dark:border-purple-700"
                  />
                )}

                {/* Verification */}
                {balanceGeneralData.check && (
                  <div className={cn(
                    'p-4 rounded-lg border-2 text-center',
                    balanceGeneralData.check.balanced
                      ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
                      : 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                  )}>
                    <p className="text-sm font-medium mb-2">
                      {balanceGeneralData.check.balanced
                        ? 'El balance cuadra correctamente'
                        : 'ATENCION: El balance no cuadra'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Total Activo: </span>
                        <span className="font-bold">{formatCurrency(balanceGeneralData.check.total_activo || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Pasivo + Patrimonio: </span>
                        <span className="font-bold">{formatCurrency(balanceGeneralData.check.total_pasivo_patrimonio || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// BALANCE SECTION COMPONENT
// ============================================================================

function BalanceSection({
  title,
  sections,
  colorClass,
  bgClass,
  borderClass,
}: {
  title: string
  sections: any
  colorClass: string
  bgClass: string
  borderClass: string
}) {
  // sections = { rows: [...], total: "..." }
  return (
    <div className="space-y-2">
      {(sections.rows || []).map((item: any, idx: number) => (
        <div key={idx} className="flex justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-gray-700 dark:text-gray-300">
            {item.codigo && <span className="font-mono text-sm text-gray-500 mr-2">{item.codigo}</span>}
            {item.titulo}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(item.saldo || 0)}
          </span>
        </div>
      ))}

      {sections.total !== undefined && (
        <div className={cn('flex justify-between py-3 px-3 font-bold text-lg border-t-2', bgClass, borderClass)}>
          <span className={colorClass}>TOTAL {title}</span>
          <span className={colorClass}>{formatCurrency(sections.total)}</span>
        </div>
      )}
    </div>
  )
}

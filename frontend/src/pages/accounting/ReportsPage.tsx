import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { accountingService } from '@/lib/accountingService'
import { toast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EstadoResultadosData {
  ingresos: {
    items: Array<{ plan_cta_id: number | null; codigo: number | null; nombre: string; total: string; count: number }>
    total: string
    count: number
  }
  egresos: {
    items: Array<{ plan_cta_id: number | null; codigo: number | null; nombre: string; total: string; count: number }>
    total: string
    count: number
  }
  resultado: {
    ingresos: string
    egresos: string
    neto: string
  }
}

export default function ReportsPage() {
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(1) // First day of month
    return date
  })
  const [selectedEndDate, setSelectedEndDate] = useState(new Date())
  const [activeReport, setActiveReport] = useState<'estado-resultados' | 'balance-general'>('estado-resultados')
  const [loading, setLoading] = useState(false)
  const [estadoResultados, setEstadoResultados] = useState<EstadoResultadosData | null>(null)
  const [balanceGeneral, setBalanceGeneral] = useState<any>(null)

  const startDateStr = selectedStartDate.toISOString().split('T')[0]
  const endDateStr = selectedEndDate.toISOString().split('T')[0]
  const monthYear = selectedEndDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (activeReport === 'estado-resultados') {
      fetchEstadoResultados()
    } else if (activeReport === 'balance-general') {
      fetchBalanceGeneral()
    }
  }, [activeReport, startDateStr, endDateStr])

  const fetchEstadoResultados = async () => {
    try {
      setLoading(true)
      const data = await accountingService.getEstadoResultados({
        start_date: startDateStr,
        end_date: endDateStr,
      })
      setEstadoResultados(data)
    } catch (error) {
      console.error('Error fetching estado resultados:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el estado de resultados',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBalanceGeneral = async () => {
    try {
      setLoading(true)
      const data = await accountingService.getBalanceGeneral()
      setBalanceGeneral(data)
    } catch (error) {
      console.error('Error fetching balance general:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el balance general',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = (data: any, filename: string) => {
    let csv = ''

    if (activeReport === 'estado-resultados' && estadoResultados) {
      csv = 'ESTADO DE RESULTADOS\n'
      csv += `Período: ${startDateStr} a ${endDateStr}\n\n`
      csv += 'INGRESOS\n'
      csv += 'Código,Descripción,Total,Cantidad\n'
      estadoResultados.ingresos.items.forEach((item) => {
        csv += `${item.codigo || 'S/C'},${item.nombre},${item.total},${item.count}\n`
      })
      csv += `\nTotal Ingresos,,${estadoResultados.ingresos.total},${estadoResultados.ingresos.count}\n\n`

      csv += 'EGRESOS\n'
      csv += 'Código,Descripción,Total,Cantidad\n'
      estadoResultados.egresos.items.forEach((item) => {
        csv += `${item.codigo || 'S/C'},${item.nombre},${item.total},${item.count}\n`
      })
      csv += `\nTotal Egresos,,${estadoResultados.egresos.total},${estadoResultados.egresos.count}\n\n`

      csv += 'RESULTADO DEL PERÍODO\n'
      csv += `Total Ingresos,${estadoResultados.resultado.ingresos}\n`
      csv += `Total Egresos,${estadoResultados.resultado.egresos}\n`
      csv += `Resultado Neto,${estadoResultados.resultado.neto}\n`
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes Financieros</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            Período: {monthYear}
          </p>
        </div>
      </div>

      {/* Report Selection & Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Reporte</label>
          <Select value={activeReport} onValueChange={(value: any) => setActiveReport(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="estado-resultados">Estado de Resultados</SelectItem>
              <SelectItem value="balance-general">Balance General</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeReport === 'estado-resultados' && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Desde</label>
              <CompactDatePicker value={selectedStartDate} onChange={setSelectedStartDate} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
              <CompactDatePicker value={selectedEndDate} onChange={setSelectedEndDate} />
            </div>
          </>
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

      {/* Estado de Resultados Report */}
      {!loading && activeReport === 'estado-resultados' && estadoResultados && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              onClick={() => downloadCSV(estadoResultados, `estado-resultados-${startDateStr}-${endDateStr}.csv`)}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar CSV
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
                      <th className="text-left py-2 px-3 font-semibold">Código</th>
                      <th className="text-left py-2 px-3 font-semibold">Descripción</th>
                      <th className="text-right py-2 px-3 font-semibold">Total</th>
                      <th className="text-center py-2 px-3 font-semibold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoResultados.ingresos.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-2 px-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                          {item.codigo || 'S/C'}
                        </td>
                        <td className="py-2 px-3">{item.nombre}</td>
                        <td className="py-2 px-3 text-right font-semibold text-green-600 dark:text-green-400">
                          $ {parseFloat(item.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">{item.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-green-50 dark:bg-green-900/20 font-semibold border-t-2 border-green-200 dark:border-green-800">
                      <td colSpan={2} className="py-3 px-3">
                        Total Ingresos
                      </td>
                      <td className="py-3 px-3 text-right text-green-700 dark:text-green-400">
                        $ {parseFloat(estadoResultados.ingresos.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-green-700 dark:text-green-400">
                        {estadoResultados.ingresos.count}
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
                      <th className="text-left py-2 px-3 font-semibold">Código</th>
                      <th className="text-left py-2 px-3 font-semibold">Descripción</th>
                      <th className="text-right py-2 px-3 font-semibold">Total</th>
                      <th className="text-center py-2 px-3 font-semibold">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estadoResultados.egresos.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-2 px-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                          {item.codigo || 'S/C'}
                        </td>
                        <td className="py-2 px-3">{item.nombre}</td>
                        <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                          $ {parseFloat(item.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-500 dark:text-gray-400">{item.count}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 dark:bg-red-900/20 font-semibold border-t-2 border-red-200 dark:border-red-800">
                      <td colSpan={2} className="py-3 px-3">
                        Total Egresos
                      </td>
                      <td className="py-3 px-3 text-right text-red-700 dark:text-red-400">
                        $ {parseFloat(estadoResultados.egresos.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center text-red-700 dark:text-red-400">
                        {estadoResultados.egresos.count}
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
              <CardTitle className="text-blue-900 dark:text-blue-100">RESULTADO DEL PERÍODO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Ingresos</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    $ {parseFloat(estadoResultados.resultado.ingresos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Egresos</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    $ {parseFloat(estadoResultados.resultado.egresos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Resultado Neto</div>
                  <div className={`text-2xl font-bold ${parseFloat(estadoResultados.resultado.neto) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    $ {parseFloat(estadoResultados.resultado.neto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Balance General Report */}
      {!loading && activeReport === 'balance-general' && balanceGeneral && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <BarChart3 className="h-5 w-5" />
                BALANCE GENERAL
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Caja */}
                {balanceGeneral.data.activo.caja.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">CAJA</h3>
                    <div className="space-y-2">
                      {balanceGeneral.data.activo.caja.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.codigo && <span className="font-mono text-sm text-gray-500 mr-2">{item.codigo}</span>}
                            {item.name}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            $ {parseFloat(item.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900/50 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
                        <span>Subtotal Caja</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          $ {parseFloat(balanceGeneral.data.activo.caja.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bancos */}
                {balanceGeneral.data.activo.bancos.items.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">BANCOS</h3>
                    <div className="space-y-2">
                      {balanceGeneral.data.activo.bancos.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-800">
                          <span className="text-gray-700 dark:text-gray-300">
                            {item.codigo && <span className="font-mono text-sm text-gray-500 mr-2">{item.codigo}</span>}
                            {item.name}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            $ {parseFloat(item.balance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900/50 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
                        <span>Subtotal Bancos</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          $ {parseFloat(balanceGeneral.data.activo.bancos.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Activo */}
                <div className="flex justify-between py-3 px-3 bg-blue-100 dark:bg-blue-900/30 font-bold text-lg border-t-2 border-blue-300 dark:border-blue-700">
                  <span className="text-blue-900 dark:text-blue-100">TOTAL ACTIVO</span>
                  <span className="text-blue-900 dark:text-blue-100">
                    $ {parseFloat(balanceGeneral.data.activo.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

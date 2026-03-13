import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddAsientoDialog } from '@/components/cash/AddAsientoDialog'
import * as accountingService from '@/lib/accountingService'
import type { Asiento, AsientoDetalle, CuentaContable } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function OperationsPage() {
  const navigate = useNavigate()
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterEstado, setFilterEstado] = useState<string>('all')
  const [filterOrigen, setFilterOrigen] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [anularAsiento, setAnularAsiento] = useState<Asiento | null>(null)
  const [anularStep, setAnularStep] = useState<'preview' | 'confirm'>('preview')
  const [anularLoading, setAnularLoading] = useState(false)
  const [anularError, setAnularError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
      return
    }
    fetchCuentas()
  }, [navigate])

  useEffect(() => {
    fetchAsientos()
  }, [selectedDate, filterEstado, filterOrigen, currentPage])

  const fetchCuentas = async () => {
    try {
      const response = await accountingService.getCuentas()
      setCuentas(response.data || [])
    } catch (error) {
      console.error('Error fetching cuentas:', error)
    }
  }

  const fetchAsientos = async () => {
    try {
      setLoading(true)
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`

      const params: Record<string, unknown> = {
        start_date: dateStr,
        end_date: dateStr,
        page: currentPage,
        limit: 50,
      }

      if (filterEstado !== 'all') params.estado = filterEstado
      if (filterOrigen !== 'all') params.origen = filterOrigen

      const response = await accountingService.getAsientos(params)
      setAsientos(response.data || [])
      setTotalPages(response.pagination?.pages || 1)
    } catch (error) {
      console.error('Error fetching asientos:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar los asientos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = async (id: number) => {
    try {
      await accountingService.confirmarAsiento(id)
      toast({ title: 'Exito', description: 'Asiento confirmado correctamente' })
      fetchAsientos()
    } catch (error) {
      console.error('Error confirming asiento:', error)
      toast({ title: 'Error', description: 'No se pudo confirmar el asiento', variant: 'destructive' })
    }
  }

  const openAnularDialog = (asiento: Asiento) => {
    setAnularAsiento(asiento)
    setAnularStep('preview')
    setAnularError(null)
  }

  const handleAnularConfirm = async () => {
    if (!anularAsiento) return
    setAnularLoading(true)
    setAnularError(null)
    try {
      await accountingService.anularAsiento(anularAsiento.id_asiento)
      toast({ title: 'Éxito', description: 'Asiento anulado correctamente' })
      setAnularAsiento(null)
      fetchAsientos()
    } catch (error) {
      console.error('Error anulling asiento:', error)
      setAnularError('No se pudo anular el asiento')
    } finally {
      setAnularLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Esta seguro de eliminar este asiento borrador? Esta accion no se puede deshacer.')) return
    try {
      await accountingService.deleteAsiento(id)
      toast({ title: 'Exito', description: 'Asiento eliminado correctamente' })
      fetchAsientos()
    } catch (error) {
      console.error('Error deleting asiento:', error)
      toast({ title: 'Error', description: 'No se pudo eliminar el asiento', variant: 'destructive' })
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Confirmado</span>
      case 'borrador':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Borrador</span>
      case 'anulado':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Anulado</span>
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{estado}</span>
    }
  }

  const getOrigenLabel = (origen: string) => {
    const labels: Record<string, string> = {
      manual: 'Manual',
      ingreso: 'Ingreso',
      egreso: 'Egreso',
      transferencia: 'Transferencia',
      ajuste: 'Ajuste',
      compra: 'Compra',
      liquidacion: 'Liquidacion',
      anulacion: 'Anulacion',
    }
    return labels[origen] || origen
  }

  const calcTotals = (detalles?: AsientoDetalle[]) => {
    if (!detalles) return { debe: 0, haber: 0 }
    return detalles.reduce(
      (acc, d) => {
        const importe = Number(d.importe)
        if (d.tipo_mov === 'debe') acc.debe += importe
        else acc.haber += importe
        return acc
      },
      { debe: 0, haber: 0 }
    )
  }

  const dayLabel = selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Summary
  const summary = useMemo(() => {
    let totalDebe = 0
    let totalHaber = 0
    for (const a of asientos) {
      const t = calcTotals(a.detalles)
      totalDebe += t.debe
      totalHaber += t.haber
    }
    return { totalDebe, totalHaber, count: asientos.length }
  }, [asientos])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Asientos Contables</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            {dayLabel} &bull; {asientos.length} asientos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CompactDatePicker value={selectedDate} onChange={(d) => { setSelectedDate(d); setCurrentPage(1) }} />
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo Asiento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterEstado} onValueChange={(v) => { setFilterEstado(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borradores</SelectItem>
            <SelectItem value="confirmado">Confirmados</SelectItem>
            <SelectItem value="anulado">Anulados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOrigen} onValueChange={(v) => { setFilterOrigen(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los origenes</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="ingreso">Ingreso</SelectItem>
            <SelectItem value="egreso">Egreso</SelectItem>
            <SelectItem value="transferencia">Transferencia</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
            <SelectItem value="compra">Compra</SelectItem>
            <SelectItem value="liquidacion">Liquidacion</SelectItem>
            <SelectItem value="anulacion">Anulacion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Debe</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalDebe)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Total Haber</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalHaber)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Asientos en periodo</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Asientos List */}
      <Card>
        <CardHeader>
          <CardTitle>Libro Diario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando asientos...</div>
          ) : asientos.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay asientos registrados en este periodo</p>
              <p className="text-sm text-gray-400 mt-1">Comienza creando un nuevo asiento contable</p>
            </div>
          ) : (
            <div className="space-y-2">
              {asientos.map((asiento) => {
                const totals = calcTotals(asiento.detalles)
                const isExpanded = expandedId === asiento.id_asiento

                return (
                  <div key={asiento.id_asiento} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Row header */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(asiento.id_asiento)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-gray-500">{asiento.nro_comprobante}</span>
                            {getEstadoBadge(asiento.estado)}
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {getOrigenLabel(asiento.origen)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 truncate">
                            {asiento.concepto}
                          </p>
                          {asiento.asientoAnulado && (
                            <button
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5 flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                const orig = asiento.asientoAnulado!
                                const origDate = new Date(orig.fecha + 'T12:00:00')
                                setSelectedDate(origDate)
                                setFilterEstado('anulado')
                              }}
                            >
                              Ver asiento original: {asiento.asientoAnulado.nro_comprobante}
                              {' '}({new Date(asiento.asientoAnulado.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })})
                            </button>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(asiento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {asiento.usuario && (
                              <span className="ml-2 text-gray-400">
                                por {asiento.usuario.nombre && asiento.usuario.apellido
                                  ? `${asiento.usuario.nombre} ${asiento.usuario.apellido}`
                                  : asiento.usuario.username}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          D: {formatCurrency(totals.debe)}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          H: {formatCurrency(totals.haber)}
                        </p>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
                        {asiento.detalles && asiento.detalles.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="text-left py-2 px-3 font-semibold">Cuenta</th>
                                  <th className="text-right py-2 px-3 font-semibold">Debe</th>
                                  <th className="text-right py-2 px-3 font-semibold">Haber</th>
                                  <th className="text-left py-2 px-3 font-semibold">Referencia</th>
                                </tr>
                              </thead>
                              <tbody>
                                {asiento.detalles.map((detalle) => (
                                  <tr key={detalle.id_detalle} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-2 px-3">
                                      {detalle.cuenta ? (
                                        <span>
                                          <span className="font-mono text-xs text-gray-500 mr-1">{detalle.cuenta.codigo}</span>
                                          {detalle.cuenta.titulo}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">Cuenta #{detalle.id_cuenta}</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium text-blue-600">
                                      {detalle.tipo_mov === 'debe' ? formatCurrency(detalle.importe) : ''}
                                    </td>
                                    <td className="py-2 px-3 text-right font-medium text-blue-600">
                                      {detalle.tipo_mov === 'haber' ? formatCurrency(detalle.importe) : ''}
                                    </td>
                                    <td className="py-2 px-3 text-gray-500 text-xs">
                                      {detalle.referencia_operativa || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-gray-100 dark:bg-gray-800 font-semibold">
                                  <td className="py-2 px-3">Totales</td>
                                  <td className="py-2 px-3 text-right text-blue-700 dark:text-blue-400">{formatCurrency(totals.debe)}</td>
                                  <td className="py-2 px-3 text-right text-blue-700 dark:text-blue-400">{formatCurrency(totals.haber)}</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">Sin detalles disponibles</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {asiento.estado === 'borrador' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => { e.stopPropagation(); handleConfirmar(asiento.id_asiento) }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => { e.stopPropagation(); handleDelete(asiento.id_asiento) }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                              </Button>
                            </>
                          )}
                          {asiento.estado === 'confirmado' && !asiento.id_asiento_anulado && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); openAnularDialog(asiento) }}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Anular
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Pagina {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Asiento Dialog */}
      <AddAsientoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          toast({ title: 'Éxito', description: 'Asiento creado correctamente' })
          fetchAsientos()
        }}
        cuentas={cuentas}
      />

      {/* Anular Asiento Dialog */}
      <Dialog open={!!anularAsiento} onOpenChange={(open) => { if (!open) setAnularAsiento(null) }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Anular Asiento</DialogTitle>
          </DialogHeader>

          {anularAsiento && anularStep === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Se creará el siguiente contra-asiento para revertir el asiento{' '}
                <span className="font-mono font-semibold">{anularAsiento.nro_comprobante}</span>:
              </p>

              {/* Contra-asiento preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contra-asiento: Anulación - {anularAsiento.concepto}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <th className="text-left py-2 px-4 font-semibold">Cuenta</th>
                      <th className="text-right py-2 px-4 font-semibold">Debe</th>
                      <th className="text-right py-2 px-4 font-semibold">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(anularAsiento.detalles || [])]
                      .sort((a, b) => {
                        // In contra-asiento, haber becomes debe and vice versa
                        // Show new debe (old haber) first
                        const aNew = a.tipo_mov === 'haber' ? 'debe' : 'haber'
                        const bNew = b.tipo_mov === 'haber' ? 'debe' : 'haber'
                        if (aNew === bNew) return 0
                        return aNew === 'debe' ? -1 : 1
                      })
                      .map((det, idx) => {
                        const contraMovimiento = det.tipo_mov === 'debe' ? 'haber' : 'debe'
                        return (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2 px-4">
                              <span className="font-mono text-xs text-gray-500 mr-1">{det.cuenta?.codigo}</span>
                              {det.cuenta?.titulo}
                            </td>
                            <td className="py-2 px-4 text-right font-medium">
                              {contraMovimiento === 'debe' ? formatCurrency(det.importe) : ''}
                            </td>
                            <td className="py-2 px-4 text-right font-medium">
                              {contraMovimiento === 'haber' ? formatCurrency(det.importe) : ''}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAnularAsiento(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setAnularStep('confirm')}
                >
                  Anular Asiento
                </Button>
              </div>
            </div>
          )}

          {anularAsiento && anularStep === 'confirm' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Esta acción no se puede deshacer
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    El asiento <span className="font-mono font-semibold">{anularAsiento.nro_comprobante}</span> quedará
                    marcado como anulado y se creará un contra-asiento confirmado que revertirá todos sus movimientos.
                  </p>
                </div>
              </div>

              {anularError && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                  {anularError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAnularStep('preview')} disabled={anularLoading}>
                  Volver
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleAnularConfirm}
                  disabled={anularLoading}
                >
                  {anularLoading ? 'Anulando...' : 'Confirmar Anulación'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

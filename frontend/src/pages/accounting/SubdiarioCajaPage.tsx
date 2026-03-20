import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import * as accountingService from '@/lib/accountingService'
import type { CuentaContable } from '@/types/accounting'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import {
  BookUp2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Send,
} from 'lucide-react'

interface Pendiente {
  fecha: string
  count: number
  total_debe: number
}

interface PreviewDetalle {
  id_cuenta: number
  cuenta: CuentaContable
  tipo_mov: 'debe' | 'haber'
  importe: number
}

interface Preview {
  fecha: string
  asientosCount: number
  asientos: { id_asiento: number; nro_comprobante: string; concepto: string; origen: string }[]
  detalles: PreviewDetalle[]
  totalDebe: number
  totalHaber: number
}

function formatFecha(fecha: string): string {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatFechaShort(fecha: string): string {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function SubdiarioCajaPage() {
  const navigate = useNavigate()

  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedFecha, setExpandedFecha] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [ejecutando, setEjecutando] = useState<string | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
      return
    }
    fetchPendientes()
  }, [navigate])

  const fetchPendientes = async () => {
    try {
      setLoading(true)
      const res = await accountingService.getSubdiarioPendientes('caja')
      setPendientes(res.data || [])
    } catch (error) {
      console.error('Error fetching pendientes:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar las fechas pendientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePreview = async (fecha: string) => {
    if (expandedFecha === fecha) {
      setExpandedFecha(null)
      setPreview(null)
      return
    }

    setExpandedFecha(fecha)
    setPreview(null)

    try {
      setLoadingPreview(true)
      const res = await accountingService.getSubdiarioPreview(fecha, 'caja')
      setPreview(res.data as Preview ?? null)
    } catch (error) {
      console.error('Error fetching preview:', error)
      toast({ title: 'Error', description: 'No se pudo generar la vista previa', variant: 'destructive' })
      setExpandedFecha(null)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleEjecutarPase = async (fecha: string) => {
    if (!confirm(`Se generara el asiento resumen para el ${formatFechaShort(fecha)}. Los movimientos individuales quedaran vinculados al pase. ¿Continuar?`)) {
      return
    }

    try {
      setEjecutando(fecha)
      const res = await accountingService.ejecutarPaseDiario(fecha, 'caja')
      const vinculados = res.data?.asientosVinculados || 0
      toast({
        title: 'Pase realizado',
        description: `Se consolidaron ${vinculados} movimientos en un asiento resumen`,
      })
      setExpandedFecha(null)
      setPreview(null)
      fetchPendientes()
    } catch (err: any) {
      console.error('Error executing pase:', err)
      toast({
        title: 'Error',
        description: err?.message || 'No se pudo ejecutar el pase al diario',
        variant: 'destructive',
      })
    } finally {
      setEjecutando(null)
    }
  }

  const getOrigenLabel = (origen: string) => {
    switch (origen) {
      case 'ingreso': return 'Ingreso'
      case 'egreso': return 'Egreso'
      case 'transferencia': return 'Transferencia'
      default: return origen
    }
  }

  const getOrigenColor = (origen: string) => {
    switch (origen) {
      case 'ingreso': return 'text-emerald-700 bg-emerald-50'
      case 'egreso': return 'text-red-700 bg-red-50'
      case 'transferencia': return 'text-blue-700 bg-blue-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Subdiario de Caja</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pase al libro diario: consolidar movimientos de caja confirmados en asientos resumen
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
        <BookUp2 className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
        <div className="text-sm text-purple-800">
          <p className="font-medium">¿Como funciona el pase al diario?</p>
          <p className="mt-1 text-purple-700">
            Los movimientos de caja se registran en el subdiario. Al ejecutar el pase, se genera un
            asiento resumen en el libro diario general con los movimientos netos por cuenta para cada fecha.
          </p>
        </div>
      </div>

      {/* Pendientes list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              Fechas Pendientes de Pase
            </CardTitle>
            <span className="text-sm text-gray-500">
              {pendientes.length} {pendientes.length === 1 ? 'fecha pendiente' : 'fechas pendientes'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Todo al dia</p>
              <p className="text-sm text-gray-400 mt-1">
                No hay movimientos de caja pendientes de pase al libro diario
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendientes.map((p) => {
                const isExpanded = expandedFecha === p.fecha
                const isEjecutando = ejecutando === p.fecha

                return (
                  <div key={p.fecha} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Row */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleTogglePreview(p.fecha)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="shrink-0">
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                          }
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{formatFecha(p.fecha)}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {p.count} {p.count === 1 ? 'movimiento confirmado' : 'movimientos confirmados'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(p.total_debe)}</p>
                          <p className="text-xs text-gray-400">Total debe</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={(e) => { e.stopPropagation(); handleTogglePreview(p.fecha) }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>

                    {/* Expanded preview */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        {loadingPreview ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                            <span className="text-sm text-gray-500">Generando vista previa...</span>
                          </div>
                        ) : preview ? (
                          <div className="space-y-4">
                            {/* Movimientos originales */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Movimientos a consolidar ({preview.asientosCount})
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Comprobante</th>
                                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Concepto</th>
                                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.asientos.map((a) => (
                                      <tr key={a.id_asiento} className="border-b border-gray-100">
                                        <td className="py-2 px-3 font-mono text-xs text-gray-500">{a.nro_comprobante}</td>
                                        <td className="py-2 px-3 text-gray-900">{a.concepto}</td>
                                        <td className="py-2 px-3">
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getOrigenColor(a.origen)}`}>
                                            {getOrigenLabel(a.origen)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Asiento resumen */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Asiento resumen que se generara
                              </h4>
                              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Cuenta</th>
                                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Debe</th>
                                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Haber</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {preview.detalles.map((d, i) => (
                                      <tr key={i} className="border-b border-gray-100">
                                        <td className="py-2 px-3">
                                          {d.cuenta ? (
                                            <span>
                                              <span className="font-mono text-xs text-gray-500 mr-1">{d.cuenta.codigo}</span>
                                              {d.cuenta.titulo}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">Cuenta #{d.id_cuenta}</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-blue-600">
                                          {d.tipo_mov === 'debe' ? formatCurrency(d.importe) : ''}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium text-blue-600">
                                          {d.tipo_mov === 'haber' ? formatCurrency(d.importe) : ''}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-gray-50 border-t border-gray-300">
                                      <td className="py-2 px-3 font-semibold text-gray-700">Totales</td>
                                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                                        {formatCurrency(preview.totalDebe)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                                        {formatCurrency(preview.totalHaber)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            {/* Action */}
                            <div className="flex justify-end pt-2">
                              <Button
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={isEjecutando}
                                onClick={() => handleEjecutarPase(p.fecha)}
                              >
                                {isEjecutando ? (
                                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ejecutando pase...</>
                                ) : (
                                  <><Send className="h-4 w-4 mr-2" />Ejecutar Pase al Diario</>
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

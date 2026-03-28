import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Activity,
  Filter,
  X,
  ExternalLink,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as accountingService from '@/lib/accountingService'

interface AsientoRef {
  id_asiento: number
  nro_comprobante: string
  concepto: string
  fecha: string
  estado: string
}

interface AuditEntry {
  id_audit: number
  id_asiento: number
  accion: string
  usuario_id: number
  timestamp: string
  detalle: Record<string, unknown> | null
  usuario?: {
    id: number
    username: string
    nombre: string | null
    apellido: string | null
  } | null
  asiento?: AsientoRef | null
}

interface AuditGroup {
  key: string
  timestamp: string
  usuario: AuditEntry['usuario']
  entries: AuditEntry[]
  acciones: string[]
  asientosCount: number
}

interface AuditFilters {
  acciones: string[]
  usuarios: { id: number; username: string; nombre: string | null; apellido: string | null }[]
}

interface AuditStats {
  total: number
  porAccion: { accion: string; total: number }[]
  actividadReciente: { fecha: string; total: number }[]
}

const ACCION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  creado: { label: 'Creado', variant: 'default' },
  editado: { label: 'Editado', variant: 'secondary' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  anulado: { label: 'Anulado', variant: 'destructive' },
  eliminado: { label: 'Eliminado', variant: 'destructive' },
  pase_diario: { label: 'Pase al Diario', variant: 'outline' },
}

function summarizeAcciones(entries: AuditEntry[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const e of entries) {
    if (!seen.has(e.accion)) {
      seen.add(e.accion)
      result.push(e.accion)
    }
  }
  return result
}

function groupEntries(entries: AuditEntry[]): AuditGroup[] {
  const groups: AuditGroup[] = []
  const map = new Map<string, AuditEntry[]>()

  for (const entry of entries) {
    // Group by same second + same user
    const ts = entry.timestamp.substring(0, 19) // trim ms
    const key = `${ts}|${entry.usuario_id}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(entry)
  }

  for (const [key, groupEntries] of map) {
    const first = groupEntries[0]
    const asientoIds = new Set(groupEntries.map(e => e.id_asiento))
    groups.push({
      key,
      timestamp: first.timestamp,
      usuario: first.usuario,
      entries: groupEntries,
      acciones: summarizeAcciones(groupEntries),
      asientosCount: asientoIds.size,
    })
  }

  return groups
}

export default function AccountingAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [filters, setFilters] = useState<AuditFilters | null>(null)
  const [stats, setStats] = useState<AuditStats | null>(null)

  // Filter state
  const [selectedAccion, setSelectedAccion] = useState<string>('')
  const [selectedUsuario, setSelectedUsuario] = useState<string>('')
  const [searchAsiento, setSearchAsiento] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const { toast } = useToast()
  const navigate = useNavigate()

  const goToAsiento = (entry: AuditEntry, e: React.MouseEvent) => {
    e.stopPropagation()
    const fecha = entry.asiento?.fecha || ''
    navigate(`/accounting/operations?fecha=${fecha}&asiento=${entry.id_asiento}`)
  }

  const groups = useMemo(() => groupEntries(entries), [entries])

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        page: currentPage,
        limit: 100,
      }
      if (selectedAccion) params.accion = selectedAccion
      if (selectedUsuario) params.usuario_id = selectedUsuario
      if (searchAsiento) params.id_asiento = searchAsiento
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta

      const result = await accountingService.getAuditLog(params)

      if (result.success) {
        setEntries(result.data as unknown as AuditEntry[])
        setTotalPages(result.pagination.totalPages)
        setTotalEntries(result.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching audit log:', error)
      toast({ title: 'Error', description: 'No se pudo cargar el registro de auditoría', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedAccion, selectedUsuario, searchAsiento, desde, hasta, toast])

  const fetchFilters = async () => {
    try {
      const result = await accountingService.getAuditFilters()
      if (result.success) setFilters(result.data)
    } catch (error) {
      console.error('Error fetching audit filters:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const result = await accountingService.getAuditStats()
      if (result.success) setStats(result.data)
    } catch (error) {
      console.error('Error fetching audit stats:', error)
    }
  }

  useEffect(() => {
    fetchFilters()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit])

  const clearFilters = () => {
    setSelectedAccion('')
    setSelectedUsuario('')
    setSearchAsiento('')
    setDesde('')
    setHasta('')
    setCurrentPage(1)
  }

  const hasActiveFilters = selectedAccion || selectedUsuario || searchAsiento || desde || hasta

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatUserName = (usuario: AuditEntry['usuario']) => {
    if (!usuario) return 'Desconocido'
    const name = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ')
    return name || usuario.username
  }

  const getAccionBadge = (accion: string) => {
    const config = ACCION_LABELS[accion]
    if (config) {
      return <Badge variant={config.variant}>{config.label}</Badge>
    }
    return <Badge variant="outline">{accion}</Badge>
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmado': return <Badge variant="default" className="text-xs">Confirmado</Badge>
      case 'anulado': return <Badge variant="destructive" className="text-xs">Anulado</Badge>
      default: return <Badge variant="secondary" className="text-xs">Borrador</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría Contable</h1>
        <p className="text-gray-500 mt-1">Registro de todas las acciones sobre asientos contables</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total de registros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Tipos de acción</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.porAccion.map(a => (
                  <div key={a.accion} className="text-xs">
                    {getAccionBadge(a.accion)}
                    <span className="ml-1 text-gray-500">{a.total}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Actividad hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.actividadReciente.length > 0
                  ? stats.actividadReciente[0]?.total || 0
                  : 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main table card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-500" />
              <CardTitle>Historial de auditoría</CardTitle>
              {totalEntries > 0 && (
                <Badge variant="secondary">{totalEntries} registros</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Nro. Asiento</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ID asiento..."
                    value={searchAsiento}
                    onChange={(e) => { setSearchAsiento(e.target.value); setCurrentPage(1) }}
                    className="pl-8 h-9"
                    type="number"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Acción</label>
                <Select value={selectedAccion} onValueChange={(v) => { setSelectedAccion(v === '_all' ? '' : v); setCurrentPage(1) }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {filters?.acciones.map(a => (
                      <SelectItem key={a} value={a}>
                        {ACCION_LABELS[a]?.label || a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Usuario</label>
                <Select value={selectedUsuario} onValueChange={(v) => { setSelectedUsuario(v === '_all' ? '' : v); setCurrentPage(1) }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todos</SelectItem>
                    {filters?.usuarios.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={desde}
                  onChange={(e) => { setDesde(e.target.value); setCurrentPage(1) }}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={hasta}
                  onChange={(e) => { setHasta(e.target.value); setCurrentPage(1) }}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No se encontraron registros de auditoría</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {groups.map((group) => {
                  const isExpanded = expandedGroup === group.key
                  return (
                    <div key={group.key} className="rounded-lg border">
                      {/* Group header */}
                      <button
                        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                      >
                        <div className="text-gray-400">
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </div>
                        <div className="text-sm text-gray-600 font-mono w-[150px] shrink-0">
                          {formatDate(group.timestamp)}
                        </div>
                        <div className="w-[120px] shrink-0">
                          <div className="font-medium text-sm">{formatUserName(group.usuario)}</div>
                          <div className="text-xs text-gray-400">@{group.usuario?.username}</div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.acciones.map(a => (
                            <span key={a}>{getAccionBadge(a)}</span>
                          ))}
                        </div>
                        <div className="ml-auto text-xs text-gray-500">
                          {group.asientosCount} {group.asientosCount === 1 ? 'asiento' : 'asientos'}
                        </div>
                      </button>

                      {/* Expanded: individual entries */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50/50">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-100/50">
                                <TableHead className="text-xs">Acción</TableHead>
                                <TableHead className="text-xs">Asiento</TableHead>
                                <TableHead className="text-xs">Concepto</TableHead>
                                <TableHead className="text-xs">Estado</TableHead>
                                <TableHead className="text-xs w-[60px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.entries.map((entry) => (
                                <TableRow key={entry.id_audit} className="hover:bg-gray-100/50">
                                  <TableCell>{getAccionBadge(entry.accion)}</TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {entry.asiento ? (
                                      <button
                                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium hover:underline"
                                        onClick={(e) => goToAsiento(entry, e)}
                                        title="Ir al asiento"
                                      >
                                        {entry.asiento.nro_comprobante}
                                        <ExternalLink className="h-3 w-3" />
                                      </button>
                                    ) : (
                                      <span className="text-gray-400">#{entry.id_asiento}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600 max-w-[300px] truncate">
                                    {entry.asiento?.concepto || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {entry.asiento ? getEstadoBadge(entry.asiento.estado) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {entry.detalle && (
                                      <span className="text-xs text-gray-400" title={JSON.stringify(entry.detalle, null, 2)}>
                                        info
                                      </span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

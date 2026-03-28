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
import { Search, ChevronLeft, ChevronRight, FileText, Activity, Filter, X, ExternalLink } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth } from '@/lib/auth'
import { API_ENDPOINTS } from '@/config/api'

interface AuditEntry {
  id: number
  accion: string
  entidad: string
  entidad_id: number | null
  usuario_id: number
  detalle: Record<string, unknown> | null
  ip: string | null
  created_at: string
  usuario?: {
    id: number
    username: string
    nombre: string | null
    apellido: string | null
  } | null
}

interface AuditFilters {
  acciones: string[]
  entidades: string[]
  usuarios: { id: number; username: string; nombre: string | null; apellido: string | null }[]
}

interface AuditStats {
  total: number
  porAccion: { accion: string; total: number }[]
  porEntidad: { entidad: string; total: number }[]
  actividadReciente: { fecha: string; total: number }[]
}

const ACCION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'user.create': { label: 'Crear usuario', variant: 'default' },
  'user.update': { label: 'Editar usuario', variant: 'secondary' },
  'user.delete': { label: 'Eliminar usuario', variant: 'destructive' },
  'user.unlock': { label: 'Desbloquear', variant: 'outline' },
  'user.reset_attempts': { label: 'Reset intentos', variant: 'outline' },
  'user.reset_password': { label: 'Reset contraseña', variant: 'secondary' },
  'user.verify_email': { label: 'Verificar email', variant: 'outline' },
  'user.resend_verification': { label: 'Reenviar verificación', variant: 'outline' },
  'user.change_email': { label: 'Cambiar email', variant: 'secondary' },
  'user.activate': { label: 'Activar', variant: 'default' },
  'user.deactivate': { label: 'Desactivar', variant: 'destructive' },
  'user.approve': { label: 'Aprobar cuenta', variant: 'default' },
}

const ENTIDAD_LABELS: Record<string, string> = {
  user: 'Usuario',
  role: 'Rol',
  api_key: 'API Key',
  setting: 'Configuración',
}

const ENTIDAD_ROUTES: Record<string, string> = {
  user: '/admin/users',
  role: '/admin/roles',
  api_key: '/admin/api-keys',
  setting: '/admin/settings',
}

export default function AuditPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [filters, setFilters] = useState<AuditFilters | null>(null)
  const [stats, setStats] = useState<AuditStats | null>(null)

  // Filter state
  const [selectedAccion, setSelectedAccion] = useState<string>('')
  const [selectedEntidad, setSelectedEntidad] = useState<string>('')
  const [selectedUsuario, setSelectedUsuario] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const { toast } = useToast()

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: '30' })
      if (selectedAccion) params.set('accion', selectedAccion)
      if (selectedEntidad) params.set('entidad', selectedEntidad)
      if (selectedUsuario) params.set('usuario_id', selectedUsuario)
      if (searchTerm) params.set('buscar', searchTerm)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)

      const res = await fetchWithAuth(`${API_ENDPOINTS.ADMIN.AUDIT}?${params}`)
      const data = await res.json()

      if (data.success) {
        setEntries(data.data)
        setTotalPages(data.pagination.totalPages)
        setTotalEntries(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching audit log:', error)
      toast({ title: 'Error', description: 'No se pudo cargar el registro de auditoría', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedAccion, selectedEntidad, selectedUsuario, searchTerm, desde, hasta, toast])

  const fetchFilters = async () => {
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.AUDIT_FILTERS)
      const data = await res.json()
      if (data.success) setFilters(data.data)
    } catch (error) {
      console.error('Error fetching audit filters:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await fetchWithAuth(API_ENDPOINTS.ADMIN.AUDIT_STATS)
      const data = await res.json()
      if (data.success) setStats(data.data)
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
    setSelectedEntidad('')
    setSelectedUsuario('')
    setSearchTerm('')
    setDesde('')
    setHasta('')
    setCurrentPage(1)
  }

  const hasActiveFilters = selectedAccion || selectedEntidad || selectedUsuario || searchTerm || desde || hasta

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

  const formatDetalle = (detalle: Record<string, unknown> | null) => {
    if (!detalle) return null
    return Object.entries(detalle).map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="font-medium text-gray-500">{key}:</span>{' '}
        <span className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
      </div>
    ))
  }

  const getAccionBadge = (accion: string) => {
    const config = ACCION_LABELS[accion]
    if (config) {
      return <Badge variant={config.variant}>{config.label}</Badge>
    }
    return <Badge variant="outline">{accion}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <p className="text-gray-500 mt-1">Registro de acciones administrativas del sistema</p>
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
              <div className="text-2xl font-bold">{stats.porAccion.length}</div>
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
              <CardTitle>Registro de auditoría</CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="pl-8 h-9"
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
                <label className="text-xs font-medium text-gray-500 mb-1 block">Entidad</label>
                <Select value={selectedEntidad} onValueChange={(v) => { setSelectedEntidad(v === '_all' ? '' : v); setCurrentPage(1) }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas</SelectItem>
                    {filters?.entidades.map(e => (
                      <SelectItem key={e} value={e}>
                        {ENTIDAD_LABELS[e] || e}
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : entries.length === 0 ? (
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <>
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                        >
                          <TableCell className="text-sm text-gray-600 font-mono">
                            {formatDate(entry.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatUserName(entry.usuario)}
                            <div className="text-xs text-gray-400">@{entry.usuario?.username}</div>
                          </TableCell>
                          <TableCell>{getAccionBadge(entry.accion)}</TableCell>
                          <TableCell className="text-sm">
                            {ENTIDAD_LABELS[entry.entidad] || entry.entidad}
                            {typeof entry.detalle?.username === 'string' && (
                              <div className="text-xs text-gray-400">@{entry.detalle.username}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {entry.entidad_id && ENTIDAD_ROUTES[entry.entidad] ? (
                              <button
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(ENTIDAD_ROUTES[entry.entidad])
                                }}
                                title={`Ver ${ENTIDAD_LABELS[entry.entidad] || entry.entidad}`}
                              >
                                {entry.entidad_id}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            ) : (
                              <span className="text-gray-500">{entry.entidad_id || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-gray-400 font-mono">
                            {entry.ip || '-'}
                          </TableCell>
                          <TableCell>
                            {entry.detalle && (
                              <Badge variant="outline" className="text-xs">
                                {expandedRow === entry.id ? '−' : '+'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedRow === entry.id && entry.detalle && (
                          <TableRow key={`${entry.id}-detail`}>
                            <TableCell colSpan={7} className="bg-gray-50 py-3 px-6">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-gray-500 mb-2">Detalles:</div>
                                {formatDetalle(entry.detalle)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
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

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  FileText,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { PurchaseRequest, PurchaseRequestStatus, PurchaseCategory } from '@/types/purchases'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PURCHASE_TYPE_LABELS,
} from '@/types/purchases'

const statusIcons: Record<PurchaseRequestStatus, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  pending_approval: <Clock className="h-4 w-4" />,
  approved: <CheckCircle className="h-4 w-4" />,
  rejected: <XCircle className="h-4 w-4" />,
  in_quotation: <AlertCircle className="h-4 w-4" />,
  quotation_received: <AlertCircle className="h-4 w-4" />,
  in_evaluation: <AlertCircle className="h-4 w-4" />,
  order_created: <CheckCircle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [categories, setCategories] = useState<PurchaseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '')
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category_id') || '')
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('purchase_type') || '')
  const [startDate, setStartDate] = useState<string>(searchParams.get('start_date') || '')
  const [endDate, setEndDate] = useState<string>(searchParams.get('end_date') || '')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const limit = 20

  useEffect(() => {
    setPage(1)
  }, [statusFilter, categoryFilter, typeFilter, search, startDate, endDate, sortBy, sortOrder])

  // Auto-correct dates if they're in reverse order
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      // Swap dates silently
      const temp = startDate
      setStartDate(endDate)
      setEndDate(temp)
    }
  }, [startDate, endDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, page, statusFilter, categoryFilter, typeFilter, startDate, endDate, sortBy, sortOrder])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [requestsRes, categoriesRes] = await Promise.all([
        purchasesService.getRequests({
          search: search || undefined,
          status: (statusFilter as PurchaseRequestStatus) || undefined,
          category_id: categoryFilter ? parseInt(categoryFilter) : undefined,
          purchase_type: (typeFilter as any) || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          page,
          limit,
          sort_by: sortBy,
          sort_order: sortOrder,
        }),
        purchasesService.getPurchaseCategories(true),
      ])
      setRequests(requestsRes.data)
      setTotalPages(requestsRes.pagination?.pages || 1)
      setTotalItems(requestsRes.pagination?.total || 0)
      setCategories(categoriesRes)
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value)
    if (value) {
      searchParams.set('status', value)
    } else {
      searchParams.delete('status')
    }
    setSearchParams(searchParams)
  }

  const getStatusBadgeClass = (status: PurchaseRequestStatus) => {
    const color = REQUEST_STATUS_COLORS[status]
    return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900 dark:text-${color}-300`
  }

  const getPriorityBadgeClass = (priority: string) => {
    const color = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]
    return `border-${color}-500 text-${color}-600`
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      // New field, default to DESC
      setSortBy(field)
      setSortOrder('DESC')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortOrder === 'ASC'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Solicitudes de Compra</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona las solicitudes de compra y su proceso de aprobacion
          </p>
        </div>
        <Button onClick={() => navigate('/purchases/requests/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por numero o titulo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => handleStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(REQUEST_STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas las categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de compra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(PURCHASE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-48">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Fecha Desde"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative w-48">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                placeholder="Fecha Hasta"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="flex items-center gap-2"
                title="Limpiar filtros de fecha"
              >
                <X className="h-4 w-4" />
                Limpiar fechas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('request_number')}
                >
                  <div className="flex items-center">
                    Numero
                    <SortIcon field="request_number" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center">
                    Titulo
                    <SortIcon field="title" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('purchase_type')}
                >
                  <div className="flex items-center">
                    Tipo
                    <SortIcon field="purchase_type" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center">
                    Prioridad
                    <SortIcon field="priority" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Estado
                    <SortIcon field="status" />
                  </div>
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('estimated_amount')}
                >
                  <div className="flex items-center justify-end">
                    Monto Est.
                    <SortIcon field="estimated_amount" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Fecha
                    <SortIcon field="created_at" />
                  </div>
                </TableHead>
                <TableHead>Creada por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No se encontraron solicitudes
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => navigate(`/purchases/requests/${request.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {request.request_number}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {request.title}
                        </p>
                        {request.category && (
                          <p className="text-xs text-gray-500">{request.category.name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{PURCHASE_TYPE_LABELS[request.purchase_type]}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityBadgeClass(request.priority)}>
                        {PRIORITY_LABELS[request.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcons[request.status]}
                        <Badge className={getStatusBadgeClass(request.status)}>
                          {REQUEST_STATUS_LABELS[request.status]}
                          {((request.status === 'quotation_received' || request.status === 'in_evaluation' || request.status === 'approved' || request.status === 'in_quotation') &&
                           request.quotations_count !== undefined &&
                           request.quotations_count > 0) &&
                           ` (${request.quotations_count})`
                          }
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(request.estimated_amount).toLocaleString('es-AR')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                      {request.requestedBy ? (
                        <div className="flex flex-col">
                          <span>{request.requestedBy.full_name || request.requestedBy.username}</span>
                          {request.approvedBy && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              ✓ {request.approvedBy.full_name || request.approvedBy.username}
                            </span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/purchases/requests/${request.id}`)
                        }}
                        title="Ver detalles de la solicitud"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && requests.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, totalItems)} de {totalItems} resultados
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Página {page} de {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

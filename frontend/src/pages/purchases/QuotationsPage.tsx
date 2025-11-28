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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  Building2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { Quotation, QuotationStatus, Supplier, PurchaseRequest, CreateQuotationData } from '@/types/purchases'

const STATUS_LABELS: Record<QuotationStatus, string> = {
  received: 'Recibida',
  under_review: 'En revision',
  selected: 'Seleccionada',
  rejected: 'Rechazada',
}

const STATUS_COLORS: Record<QuotationStatus, string> = {
  received: 'blue',
  under_review: 'yellow',
  selected: 'green',
  rejected: 'red',
}

export default function QuotationsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const limit = 20
  const [formData, setFormData] = useState<CreateQuotationData>({
    purchase_request_id: parseInt(searchParams.get('request_id') || '0'),
    supplier_id: 0,
    total_amount: 0,
  })
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  useEffect(() => {
    setPage(1)
  }, [statusFilter, supplierFilter])

  useEffect(() => {
    fetchData()
  }, [page, statusFilter, supplierFilter])

  // Auto-abrir diálogo si hay request_id en la URL
  useEffect(() => {
    const requestId = searchParams.get('request_id')
    if (requestId && !dialogOpen) {
      handleOpenDialog()
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotationsRes, suppliersRes, requestsRes] = await Promise.all([
        purchasesService.getQuotations({
          status: (statusFilter as QuotationStatus) || undefined,
          supplier_id: supplierFilter ? parseInt(supplierFilter) : undefined,
          page,
          limit,
        }),
        purchasesService.getSuppliers({ is_active: true, limit: 100 }),
        purchasesService.getRequests({ limit: 100 }),
      ])
      setQuotations(quotationsRes.data)
      setTotalPages(quotationsRes.pagination?.pages || 1)
      setTotalItems(quotationsRes.pagination?.total || 0)
      setSuppliers(suppliersRes.data)
      setRequests(requestsRes.data.filter(r =>
        ['approved', 'in_quotation', 'quotation_received', 'in_evaluation'].includes(r.status)
      ))
    } catch (error) {
      console.error('Error fetching quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setFormData({
      purchase_request_id: parseInt(searchParams.get('request_id') || '0'),
      supplier_id: 0,
      total_amount: 0,
      subtotal: 0,
      tax_amount: 0,
      payment_terms: '',
      delivery_time: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.purchase_request_id || !formData.supplier_id || !formData.total_amount) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    try {
      await purchasesService.createQuotation(formData)
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error creating quotation:', error)
    }
  }

  const handleSelect = async (id: number) => {
    const reason = prompt('Motivo de seleccion (opcional):')
    try {
      await purchasesService.selectQuotation(id, reason || undefined)
      fetchData()
    } catch (error) {
      console.error('Error selecting quotation:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estas seguro de eliminar esta cotizacion?')) return
    try {
      await purchasesService.deleteQuotation(id)
      fetchData()
    } catch (error) {
      console.error('Error deleting quotation:', error)
    }
  }

  const getStatusBadgeClass = (status: QuotationStatus) => {
    const color = STATUS_COLORS[status]
    return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900 dark:text-${color}-300`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cotizaciones</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona las cotizaciones recibidas de proveedores
          </p>
        </div>
        <Button onClick={handleOpenDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Cotizacion
        </Button>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter || 'all'} onValueChange={(v) => setSupplierFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {suppliers.map((sup) => (
                  <SelectItem key={sup.id} value={String(sup.id)}>
                    {sup.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Numero</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead>Fecha</TableHead>
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
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No se encontraron cotizaciones
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => {
                  const isExpanded = expandedRows.has(quotation.id)
                  const requestItems = quotation.purchaseRequest?.items || []
                  return (
                    <>
                      <TableRow key={quotation.id} className="group">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleRowExpansion(quotation.id)}
                            title={isExpanded ? "Ocultar detalles" : "Ver detalles de la solicitud"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {quotation.quotation_number || `COT-${quotation.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{quotation.supplier?.business_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-mono text-sm">
                              {quotation.purchaseRequest?.request_number || '-'}
                            </span>
                            {quotation.purchaseRequest?.title && (
                              <p className="text-xs text-gray-500 truncate max-w-48">
                                {quotation.purchaseRequest.title}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {quotation.is_selected && <CheckCircle className="h-4 w-4 text-green-500" />}
                            <Badge className={getStatusBadgeClass(quotation.status)}>
                              {STATUS_LABELS[quotation.status]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(quotation.total_amount).toLocaleString('es-AR')}
                          {quotation.is_lowest && (
                            <span className="ml-2 text-xs text-green-600">Menor</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {quotation.payment_terms && <p>{quotation.payment_terms}</p>}
                            {quotation.delivery_time && (
                              <p className="text-gray-500">Entrega: {quotation.delivery_time}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(quotation.received_at).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {quotation.status === 'received' && !quotation.is_selected && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleSelect(quotation.id)}
                                title="Seleccionar cotización"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(quotation.id)}
                              title="Eliminar cotización"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded row with purchase request items */}
                      {isExpanded && (
                        <TableRow key={`${quotation.id}-expanded`}>
                          <TableCell colSpan={9} className="bg-gray-50 dark:bg-gray-900 py-4">
                            <div className="px-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-sm">Items de la Solicitud de Compra</span>
                              </div>
                              {quotation.purchaseRequest?.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  {quotation.purchaseRequest.description}
                                </p>
                              )}
                              {requestItems.length > 0 ? (
                                <div className="rounded border dark:border-gray-700">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-medium">Descripcion</th>
                                        <th className="text-center px-3 py-2 font-medium w-24">Cantidad</th>
                                        <th className="text-center px-3 py-2 font-medium w-24">Unidad</th>
                                        <th className="text-right px-3 py-2 font-medium w-32">Precio Est.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {requestItems.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-t dark:border-gray-700">
                                          <td className="px-3 py-2">
                                            {item.description}
                                            {item.specifications && (
                                              <p className="text-xs text-gray-500">{item.specifications}</p>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                                          <td className="px-3 py-2 text-center">{item.unit}</td>
                                          <td className="px-3 py-2 text-right">
                                            {item.estimated_unit_price
                                              ? `$${Number(item.estimated_unit_price).toLocaleString('es-AR')}`
                                              : '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No hay items detallados en la solicitud
                                </p>
                              )}
                              {quotation.purchaseRequest?.estimated_amount && (
                                <div className="mt-2 text-right text-sm">
                                  <span className="text-gray-500">Monto estimado: </span>
                                  <span className="font-medium">
                                    ${Number(quotation.purchaseRequest.estimated_amount).toLocaleString('es-AR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && quotations.length > 0 && (
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

      {/* Add Quotation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Cotizacion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Solicitud de Compra *</Label>
              <Select
                value={formData.purchase_request_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, purchase_request_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar solicitud" />
                </SelectTrigger>
                <SelectContent>
                  {requests.map((req) => (
                    <SelectItem key={req.id} value={String(req.id)}>
                      {req.request_number} - {req.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proveedor *</Label>
              <Select
                value={formData.supplier_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((sup) => (
                    <SelectItem key={sup.id} value={String(sup.id)}>
                      {sup.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Subtotal</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.subtotal || ''}
                  onChange={(e) => {
                    const subtotal = parseFloat(e.target.value) || 0
                    const tax = formData.tax_amount || 0
                    setFormData({ ...formData, subtotal, total_amount: subtotal + tax })
                  }}
                />
              </div>
              <div>
                <Label>IVA</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.tax_amount || ''}
                  onChange={(e) => {
                    const tax = parseFloat(e.target.value) || 0
                    const subtotal = formData.subtotal || 0
                    setFormData({ ...formData, tax_amount: tax, total_amount: subtotal + tax })
                  }}
                />
              </div>
              <div>
                <Label>Total *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_amount || ''}
                  onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Condiciones de Pago</Label>
                <Input
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Ej: Contado, 30 dias"
                />
              </div>
              <div>
                <Label>Tiempo de Entrega</Label>
                <Input
                  value={formData.delivery_time || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
                  placeholder="Ej: 5 dias habiles"
                />
              </div>
            </div>
            <div>
              <Label>Valido Hasta</Label>
              <Input
                type="date"
                value={formData.valid_until || ''}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.purchase_request_id || !formData.supplier_id || !formData.total_amount}
            >
              Crear Cotizacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

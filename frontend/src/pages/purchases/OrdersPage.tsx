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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Building2,
  MoreVertical,
  Eye,
  Package,
  FileText,
  DollarSign,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { PurchaseOrder, PurchaseOrderStatus, Supplier } from '@/types/purchases'
import { ORDER_STATUS_LABELS } from '@/types/purchases'

const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'gray',
  sent: 'blue',
  confirmed: 'indigo',
  partially_received: 'yellow',
  received: 'green',
  invoiced: 'purple',
  paid: 'emerald',
  cancelled: 'red',
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [supplierFilter, setSupplierFilter] = useState<string>('')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const limit = 20

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
  }, [statusFilter, supplierFilter, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, page, statusFilter, supplierFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersRes, suppliersRes] = await Promise.all([
        purchasesService.getOrders({
          search: search || undefined,
          status: (statusFilter as PurchaseOrderStatus) || undefined,
          supplier_id: supplierFilter ? parseInt(supplierFilter) : undefined,
          page,
          limit,
        }),
        purchasesService.getSuppliers({ is_active: true, limit: 100 }),
      ])
      setOrders(ordersRes.data)
      setTotalPages(ordersRes.pagination?.pages || 1)
      setTotalItems(ordersRes.pagination?.total || 0)
      setSuppliers(suppliersRes.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id: number, status: PurchaseOrderStatus) => {
    try {
      await purchasesService.updateOrderStatus(id, status)
      fetchData()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estas seguro de eliminar esta orden?')) return
    try {
      await purchasesService.deleteOrder(id)
      fetchData()
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }

  const getStatusBadgeClass = (status: PurchaseOrderStatus) => {
    const color = STATUS_COLORS[status]
    return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900 dark:text-${color}-300`
  }

  const getNextStatuses = (currentStatus: PurchaseOrderStatus): PurchaseOrderStatus[] => {
    const transitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['confirmed', 'cancelled'],
      confirmed: ['partially_received', 'received', 'cancelled'],
      partially_received: ['received'],
      received: ['invoiced'],
      invoiced: ['paid'],
      paid: [],
      cancelled: [],
    }
    return transitions[currentStatus] || []
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ordenes de Compra</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona las ordenes de compra emitidas
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por numero de orden..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
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

      {/* Orders Table */}
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
                <TableHead>Entrega Esperada</TableHead>
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
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No se encontraron ordenes de compra
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedRows.has(order.id)
                  const orderItems = order.items || []
                  return (
                    <>
                      <TableRow key={order.id} className="group">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleRowExpansion(order.id)}
                            title={isExpanded ? "Ocultar detalles" : "Ver items de la orden"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-sm font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{order.supplier?.business_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span
                              className="font-mono text-sm cursor-pointer hover:text-blue-600"
                              onClick={() => navigate(`/purchases/requests/${order.purchase_request_id}`)}
                            >
                              {order.purchaseRequest?.request_number || '-'}
                            </span>
                            {order.purchaseRequest?.title && (
                              <p className="text-xs text-gray-500 truncate max-w-40">
                                {order.purchaseRequest.title}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(order.status)}>
                            {ORDER_STATUS_LABELS[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(order.total_amount).toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.expected_delivery_date
                            ? new Date(order.expected_delivery_date).toLocaleDateString('es-AR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/purchases/orders/${order.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                              {getNextStatuses(order.status).map((nextStatus) => (
                                <DropdownMenuItem
                                  key={nextStatus}
                                  onClick={() => handleUpdateStatus(order.id, nextStatus)}
                                >
                                  {nextStatus === 'sent' && <FileText className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'confirmed' && <Package className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'received' && <Package className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'partially_received' && <Package className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'invoiced' && <FileText className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'paid' && <DollarSign className="h-4 w-4 mr-2" />}
                                  {nextStatus === 'cancelled' && <Trash2 className="h-4 w-4 mr-2" />}
                                  {ORDER_STATUS_LABELS[nextStatus]}
                                </DropdownMenuItem>
                              ))}
                              {['draft', 'sent'].includes(order.status) && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      {/* Expanded row with order items */}
                      {isExpanded && (
                        <TableRow key={`${order.id}-expanded`}>
                          <TableCell colSpan={9} className="bg-gray-50 dark:bg-gray-900 py-4">
                            <div className="px-4">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-sm">Items de la Orden de Compra</span>
                              </div>
                              {orderItems.length > 0 ? (
                                <div className="rounded border dark:border-gray-700">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-100 dark:bg-gray-800">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-medium">Descripcion</th>
                                        <th className="text-center px-3 py-2 font-medium w-24">Cantidad</th>
                                        <th className="text-center px-3 py-2 font-medium w-24">Unidad</th>
                                        <th className="text-right px-3 py-2 font-medium w-32">Precio Unit.</th>
                                        <th className="text-right px-3 py-2 font-medium w-32">Subtotal</th>
                                        <th className="text-center px-3 py-2 font-medium w-28">Recibido</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {orderItems.map((item, idx) => {
                                        const qty = Number(item.quantity)
                                        const unitPrice = Number(item.unit_price)
                                        const received = Number(item.received_quantity)
                                        const isFullyReceived = received >= qty
                                        return (
                                          <tr key={idx} className="border-t dark:border-gray-700">
                                            <td className="px-3 py-2">
                                              {item.description}
                                              {item.notes && (
                                                <p className="text-xs text-gray-500">{item.notes}</p>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-center">{qty}</td>
                                            <td className="px-3 py-2 text-center">{item.unit}</td>
                                            <td className="px-3 py-2 text-right">
                                              ${unitPrice.toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              ${(qty * unitPrice).toLocaleString('es-AR')}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={isFullyReceived ? 'text-green-600' : 'text-yellow-600'}>
                                                {received} / {qty}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
                                      <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right font-medium">
                                          Subtotal:
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">
                                          ${Number(order.subtotal).toLocaleString('es-AR')}
                                        </td>
                                        <td></td>
                                      </tr>
                                      <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right text-gray-500">
                                          IVA:
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          ${Number(order.tax_amount).toLocaleString('es-AR')}
                                        </td>
                                        <td></td>
                                      </tr>
                                      <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right font-bold">
                                          Total:
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold">
                                          ${Number(order.total_amount).toLocaleString('es-AR')}
                                        </td>
                                        <td></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">
                                  No hay items detallados en esta orden
                                </p>
                              )}
                              {order.notes && (
                                <div className="mt-3 text-sm">
                                  <span className="text-gray-500">Notas: </span>
                                  <span>{order.notes}</span>
                                </div>
                              )}
                              {order.payment_terms && (
                                <div className="mt-1 text-sm">
                                  <span className="text-gray-500">Condiciones de pago: </span>
                                  <span>{order.payment_terms}</span>
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
      {!loading && orders.length > 0 && (
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

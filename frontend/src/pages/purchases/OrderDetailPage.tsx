import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Package,
  Truck,
  MoreVertical,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchases'
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

export default function OrderDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    if (!id) return
    try {
      const data = await purchasesService.getOrder(parseInt(id))
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (status: PurchaseOrderStatus) => {
    if (!order) return
    setActionLoading(true)
    try {
      await purchasesService.updateOrderStatus(order.id, status)
      await fetchOrder()
    } catch (error) {
      console.error('Error updating order status:', error)
    } finally {
      setActionLoading(false)
    }
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

  const getStatusBadgeClass = (status: PurchaseOrderStatus) => {
    const color = STATUS_COLORS[status]
    return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900 dark:text-${color}-300`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Orden no encontrada</p>
      </div>
    )
  }

  const nextStatuses = getNextStatuses(order.status)
  const subtotal = Number(order.subtotal)
  const taxAmount = Number(order.tax_amount)
  const totalAmount = Number(order.total_amount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/purchases/requests/${order.purchase_request_id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la Solicitud
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {order.order_number}
              </h1>
              <Badge className={getStatusBadgeClass(order.status)}>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Orden de compra del {new Date(order.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
        </div>

        {/* Actions */}
        {nextStatuses.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={actionLoading}>
                <MoreVertical className="h-4 w-4 mr-2" />
                Cambiar Estado
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStatuses.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleUpdateStatus(status)}
                >
                  {status === 'sent' && <FileText className="h-4 w-4 mr-2" />}
                  {status === 'confirmed' && <CheckCircle className="h-4 w-4 mr-2" />}
                  {(status === 'received' || status === 'partially_received') && <Package className="h-4 w-4 mr-2" />}
                  {status === 'invoiced' && <FileText className="h-4 w-4 mr-2" />}
                  {status === 'paid' && <DollarSign className="h-4 w-4 mr-2" />}
                  {status === 'cancelled' && <span className="text-red-600">Cancelar</span>}
                  {status !== 'cancelled' && ORDER_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Items de la Orden</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-center">Recibido</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => {
                      const qty = Number(item.quantity)
                      const received = Number(item.received_quantity)
                      const unitPrice = Number(item.unit_price)
                      const total = qty * unitPrice
                      const isFullyReceived = received >= qty

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.notes && (
                                <p className="text-sm text-gray-500">{item.notes}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {qty} {item.unit}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={isFullyReceived ? 'text-green-600' : 'text-yellow-600'}>
                              {received} / {qty}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            ${unitPrice.toLocaleString('es-AR')}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${total.toLocaleString('es-AR')}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay items en esta orden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>${subtotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA</span>
                  <span>${taxAmount.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${totalAmount.toLocaleString('es-AR')} {order.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Notes */}
          {(order.delivery_address || order.delivery_notes) && (
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Información de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.delivery_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Dirección de Entrega</label>
                    <p className="mt-1">{order.delivery_address}</p>
                  </div>
                )}
                {order.delivery_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notas de Entrega</label>
                    <p className="mt-1">{order.delivery_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice Info */}
          {(order.invoice_number || order.invoice_date) && (
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Facturación
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {order.invoice_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Número de Factura</label>
                    <p className="mt-1 font-mono">{order.invoice_number}</p>
                  </div>
                )}
                {order.invoice_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha de Factura</label>
                    <p className="mt-1">{new Date(order.invoice_date).toLocaleDateString('es-AR')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.supplier ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-lg">{order.supplier.business_name}</p>
                    {order.supplier.trade_name && (
                      <p className="text-sm text-gray-500">{order.supplier.trade_name}</p>
                    )}
                  </div>
                  {order.supplier.cuit && (
                    <div>
                      <label className="text-xs text-gray-500">CUIT</label>
                      <p className="font-mono text-sm">{order.supplier.cuit}</p>
                    </div>
                  )}
                  {order.supplier.contact_name && (
                    <div>
                      <label className="text-xs text-gray-500">Contacto</label>
                      <p className="text-sm">{order.supplier.contact_name}</p>
                    </div>
                  )}
                  {order.supplier.phone && (
                    <div>
                      <label className="text-xs text-gray-500">Teléfono</label>
                      <p className="text-sm">{order.supplier.phone}</p>
                    </div>
                  )}
                  {order.supplier.email && (
                    <div>
                      <label className="text-xs text-gray-500">Email</label>
                      <p className="text-sm">{order.supplier.email}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Sin proveedor asignado</p>
              )}
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Información de la Orden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Solicitud de Compra</p>
                  <button
                    className="font-mono text-sm text-blue-600 hover:underline"
                    onClick={() => navigate(`/purchases/requests/${order.purchase_request_id}`)}
                  >
                    {order.purchaseRequest?.request_number || `#${order.purchase_request_id}`}
                  </button>
                </div>
              </div>

              {order.quotation && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Cotización</p>
                    <p className="font-mono text-sm">
                      {order.quotation.quotation_number || `COT-${order.quotation_id}`}
                    </p>
                  </div>
                </div>
              )}

              {order.payment_terms && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Condiciones de Pago</p>
                    <p className="text-sm">{order.payment_terms}</p>
                  </div>
                </div>
              )}

              {order.expected_delivery_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Entrega Esperada</p>
                    <p className="text-sm">
                      {new Date(order.expected_delivery_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              )}

              {order.actual_delivery_date && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Entrega Real</p>
                    <p className="text-sm">
                      {new Date(order.actual_delivery_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Fecha de Creación</p>
                  <p className="text-sm">
                    {new Date(order.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  Clock,
  User,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  AlertTriangle,
  Plus,
  ShoppingCart,
  BarChart3,
  Pencil,
  Trash2,
  Star,
  Download,
  Mail,
  MessageCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { authService } from '@/lib/auth'
import purchasesService from '@/lib/purchasesService'
import type { PurchaseRequest, Quotation, PurchaseOrder, Supplier, QuotationItemData, PurchaseRequestStatus } from '@/types/purchases'
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PURCHASE_TYPE_LABELS,
} from '@/types/purchases'
import { useToast } from '@/components/ui/use-toast'

// Traducción de acciones del historial
const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: 'Creada',
  submitted: 'Enviada a aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  quotation_received: 'Cotización recibida',
  quotation_selected: 'Cotización seleccionada',
  order_created: 'Orden de compra creada',
  completed: 'Completada',
  status_changed: 'Estado cambiado',
}

export default function RequestDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [request, setRequest] = useState<PurchaseRequest | null>(null)
  const [relatedOrder, setRelatedOrder] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false)
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false)
  const [selectQuotationDialogOpen, setSelectQuotationDialogOpen] = useState(false)
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false)
  const [comments, setComments] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [quotationsLoading, setQuotationsLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [selectedQuotationForSelection, setSelectedQuotationForSelection] = useState<Quotation | null>(null)
  const [selectionReason, setSelectionReason] = useState('')
  const [quotationForm, setQuotationForm] = useState({
    supplier_id: '',
    quotation_number: '',
    subtotal: '',
    tax_amount: '',
    total_amount: '',
    payment_terms: '',
    delivery_time: '',
    valid_until: '',
    notes: '',
    items: [] as QuotationItemData[],
  })
  const [orderForm, setOrderForm] = useState({
    quotation_id: '',
    expected_delivery_date: '',
    delivery_address: '',
    payment_terms: '',
    delivery_notes: '',
    notes: '',
  })
  const [rfqForm, setRfqForm] = useState({
    selectedSuppliers: [] as number[],
    deadline: '',
    sendMethod: 'email' as 'email' | 'whatsapp' | 'both',
  })
  const [rfqSending, setRfqSending] = useState(false)
  const [rfqResults, setRfqResults] = useState<any[] | null>(null)

  const user = authService.getUser()
  const canApprove = user?.role === 'root' || user?.role === 'board_member'
  const isOwner = request?.requested_by === user?.id
  const canSubmitDrafts = user?.role === 'root' || user?.role === 'admin_employee'

  useEffect(() => {
    fetchRequest()
  }, [id])

  const fetchRequest = async () => {
    if (!id) return
    try {
      const data = await purchasesService.getRequest(parseInt(id))
      setRequest(data)

      // Fetch related order if status indicates one exists
      if (['order_created', 'completed'].includes(data.status)) {
        await fetchRelatedOrder(data.id)
      }

      // Fetch quotations if status indicates they might exist
      if (['in_quotation', 'quotation_received', 'in_evaluation', 'order_created', 'completed'].includes(data.status)) {
        await fetchQuotationsCount(data.id)
      }
    } catch (error) {
      console.error('Error fetching request:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelatedOrder = async (requestId: number) => {
    try {
      const response = await purchasesService.getOrders({
        // Note: The backend doesn't have a purchase_request_id filter yet,
        // but we can search by looking for orders and filter on frontend
        limit: 100,
      })

      // Find the order related to this request
      const order = response.data?.find(o => o.purchase_request_id === requestId)
      if (order) {
        setRelatedOrder(order)
      }
    } catch (error) {
      console.error('Error fetching related order:', error)
    }
  }

  const handleSubmit = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await purchasesService.submitRequest(request.id)
      await fetchRequest()
      toast({
        title: 'Solicitud enviada',
        description: 'La solicitud ha sido enviada para aprobación',
      })
    } catch (error: any) {
      console.error('Error submitting request:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la solicitud',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await purchasesService.approveRequest(request.id, comments)
      setApproveDialogOpen(false)
      setComments('')
      await fetchRequest()
      toast({
        title: 'Solicitud aprobada',
        description: 'La solicitud ha sido aprobada exitosamente',
      })
    } catch (error: any) {
      console.error('Error approving request:', error)
      toast({
        title: 'Error al aprobar',
        description: error.message || 'No se pudo aprobar la solicitud. Verifica tus permisos.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!request || !rejectReason.trim()) return
    setActionLoading(true)
    try {
      await purchasesService.rejectRequest(request.id, rejectReason)
      setRejectDialogOpen(false)
      setRejectReason('')
      await fetchRequest()
      toast({
        title: 'Solicitud rechazada',
        description: 'La solicitud ha sido rechazada',
      })
    } catch (error: any) {
      console.error('Error rejecting request:', error)
      toast({
        title: 'Error al rechazar',
        description: error.message || 'No se pudo rechazar la solicitud',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!request) return
    if (!confirm('¿Estas seguro de cancelar esta solicitud?')) return
    setActionLoading(true)
    try {
      await purchasesService.cancelRequest(request.id)
      await fetchRequest()
      toast({
        title: 'Solicitud cancelada',
        description: 'La solicitud ha sido cancelada',
      })
    } catch (error: any) {
      console.error('Error cancelling request:', error)
      toast({
        title: 'Error al cancelar',
        description: error.message || 'No se pudo cancelar la solicitud',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const fetchQuotations = async () => {
    if (!request) return
    setQuotationsLoading(true)
    try {
      const response = await purchasesService.getQuotations({
        purchase_request_id: request.id,
      })
      setQuotations(response.data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    } finally {
      setQuotationsLoading(false)
    }
  }

  const fetchQuotationsCount = async (requestId: number) => {
    try {
      const response = await purchasesService.getQuotations({
        purchase_request_id: requestId,
      })
      setQuotations(response.data || [])
    } catch (error) {
      console.error('Error fetching quotations count:', error)
    }
  }

  const handleOpenCreateOrderDialog = () => {
    fetchQuotations()
    setCreateOrderDialogOpen(true)
  }

  const handleCreateOrder = async () => {
    if (!request) return

    // Find selected quotation
    const selectedQuotation = quotations.find(q => q.id === parseInt(orderForm.quotation_id))

    // Prepare order data
    const orderData: any = {
      purchase_request_id: request.id,
      supplier_id: selectedQuotation?.supplier_id || request.preferredSupplier?.id,
      total_amount: selectedQuotation ? Number(selectedQuotation.total_amount) : Number(request.estimated_amount),
    }

    if (orderForm.quotation_id) {
      orderData.quotation_id = parseInt(orderForm.quotation_id)
      orderData.subtotal = selectedQuotation ? Number(selectedQuotation.subtotal) : undefined
      orderData.tax_amount = selectedQuotation ? Number(selectedQuotation.tax_amount) : undefined
    }

    if (orderForm.payment_terms) orderData.payment_terms = orderForm.payment_terms
    if (orderForm.expected_delivery_date) orderData.expected_delivery_date = orderForm.expected_delivery_date
    if (orderForm.delivery_address) orderData.delivery_address = orderForm.delivery_address
    if (orderForm.delivery_notes) orderData.delivery_notes = orderForm.delivery_notes
    if (orderForm.notes) orderData.notes = orderForm.notes

    setActionLoading(true)
    try {
      const newOrder = await purchasesService.createOrder(orderData)
      setCreateOrderDialogOpen(false)
      setOrderForm({
        quotation_id: '',
        expected_delivery_date: '',
        delivery_address: '',
        payment_terms: '',
        delivery_notes: '',
        notes: '',
      })
      await fetchRequest()
      toast({
        title: 'Orden creada',
        description: `La orden ${newOrder.order_number} ha sido creada exitosamente`,
      })
      // Reload the request to show the updated status and related order
      await fetchRequest()
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast({
        title: 'Error al crear orden',
        description: error.message || 'No se pudo crear la orden de compra',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await purchasesService.getSuppliers({ is_active: true })
      setSuppliers(response.data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleOpenQuotationDialog = (quotation?: Quotation) => {
    if (quotation) {
      // Edit mode
      setEditingQuotation(quotation)
      setQuotationForm({
        supplier_id: String(quotation.supplier_id),
        quotation_number: quotation.quotation_number || '',
        subtotal: String(quotation.subtotal),
        tax_amount: String(quotation.tax_amount),
        total_amount: String(quotation.total_amount),
        payment_terms: quotation.payment_terms || '',
        delivery_time: quotation.delivery_time || '',
        valid_until: quotation.valid_until ? quotation.valid_until.split('T')[0] : '',
        notes: quotation.notes || '',
        items: quotation.items?.map(item => ({
          request_item_id: item.request_item_id ?? undefined,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: Number(item.unit_price),
          notes: item.notes || '',
        })) || [],
      })
    } else {
      // Create mode - initialize with request items
      setEditingQuotation(null)
      const initialItems: QuotationItemData[] = request?.items?.map(item => ({
        request_item_id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.estimated_unit_price || 0),
        notes: '',
      })) || []

      setQuotationForm({
        supplier_id: request?.preferredSupplier?.id ? String(request.preferredSupplier.id) : '',
        quotation_number: '',
        subtotal: '',
        tax_amount: '',
        total_amount: '',
        payment_terms: '',
        delivery_time: '',
        valid_until: '',
        notes: '',
        items: initialItems,
      })
    }
    fetchSuppliers()
    setQuotationDialogOpen(true)
  }

  const calculateQuotationTotals = () => {
    const itemsTotal = quotationForm.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unit_price) || 0
      return sum + (quantity * unitPrice)
    }, 0)

    const subtotal = Number(quotationForm.subtotal) || itemsTotal
    const taxAmount = Number(quotationForm.tax_amount) || 0
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }

  const handleSaveQuotation = async () => {
    if (!request) return

    const { subtotal, taxAmount, total } = calculateQuotationTotals()

    const quotationData: any = {
      purchase_request_id: request.id,
      supplier_id: parseInt(quotationForm.supplier_id),
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      payment_terms: quotationForm.payment_terms || undefined,
      delivery_time: quotationForm.delivery_time || undefined,
      valid_until: quotationForm.valid_until || undefined,
      notes: quotationForm.notes || undefined,
      quotation_number: quotationForm.quotation_number || undefined,
      items: quotationForm.items.map(item => ({
        request_item_id: item.request_item_id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        unit_price: Number(item.unit_price),
        notes: item.notes || undefined,
      })),
    }

    setActionLoading(true)
    try {
      if (editingQuotation) {
        // Update
        await purchasesService.updateQuotation(editingQuotation.id, quotationData)
        toast({
          title: 'Cotización actualizada',
          description: 'La cotización ha sido actualizada exitosamente',
        })
      } else {
        // Create
        await purchasesService.createQuotation(quotationData)
        toast({
          title: 'Cotización creada',
          description: 'La cotización ha sido registrada exitosamente',
        })
      }
      setQuotationDialogOpen(false)
      await fetchQuotationsCount(request.id)
      await fetchRequest()
    } catch (error: any) {
      console.error('Error saving quotation:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la cotización',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteQuotation = async (quotationId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return

    setActionLoading(true)
    try {
      await purchasesService.deleteQuotation(quotationId)
      toast({
        title: 'Cotización eliminada',
        description: 'La cotización ha sido eliminada',
      })
      await fetchQuotationsCount(request!.id)
    } catch (error: any) {
      console.error('Error deleting quotation:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la cotización',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenSelectQuotationDialog = (quotation: Quotation) => {
    setSelectedQuotationForSelection(quotation)
    setSelectionReason('')
    setSelectQuotationDialogOpen(true)
  }

  const handleConfirmSelectQuotation = async () => {
    if (!selectedQuotationForSelection) return

    setActionLoading(true)
    try {
      await purchasesService.selectQuotation(selectedQuotationForSelection.id, selectionReason)
      toast({
        title: 'Cotización seleccionada',
        description: `La cotización de ${selectedQuotationForSelection.supplier?.business_name} ha sido seleccionada`,
      })
      setSelectQuotationDialogOpen(false)
      setSelectionReason('')
      await fetchQuotationsCount(request!.id)
      await fetchRequest()
    } catch (error: any) {
      console.error('Error selecting quotation:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo seleccionar la cotización',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const updateQuotationItem = (index: number, field: keyof QuotationItemData, value: any) => {
    const newItems = [...quotationForm.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setQuotationForm({ ...quotationForm, items: newItems })
  }

  const handleOpenRfqDialog = async () => {
    // Set default deadline to 15 days from now
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 15)
    setRfqForm({
      selectedSuppliers: [],
      deadline: defaultDeadline.toISOString().split('T')[0],
      sendMethod: 'email',
    })
    setRfqResults(null)
    await fetchSuppliers()
    setRfqDialogOpen(true)
  }

  const handleToggleSupplier = (supplierId: number) => {
    setRfqForm(prev => ({
      ...prev,
      selectedSuppliers: prev.selectedSuppliers.includes(supplierId)
        ? prev.selectedSuppliers.filter(id => id !== supplierId)
        : [...prev.selectedSuppliers, supplierId]
    }))
  }

  const handleDownloadRFQPDF = async () => {
    if (!request || !rfqForm.deadline || rfqForm.selectedSuppliers.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un proveedor y una fecha límite',
        variant: 'destructive',
      })
      return
    }

    setRfqSending(true)
    try {
      const blob = await purchasesService.generateRFQPDF(request.id, rfqForm.deadline, rfqForm.selectedSuppliers)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RFQ-${request.request_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'PDF generado',
        description: 'El PDF de la solicitud de cotización ha sido descargado',
      })
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo generar el PDF',
        variant: 'destructive',
      })
    } finally {
      setRfqSending(false)
    }
  }

  const handleSendRFQ = async () => {
    if (!request || !rfqForm.deadline || rfqForm.selectedSuppliers.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un proveedor y una fecha límite',
        variant: 'destructive',
      })
      return
    }

    setRfqSending(true)
    setRfqResults(null)

    try {
      let results: any[] = []

      if (rfqForm.sendMethod === 'email' || rfqForm.sendMethod === 'both') {
        const emailResponse = await purchasesService.sendRFQEmail(
          request.id,
          rfqForm.deadline,
          rfqForm.selectedSuppliers
        )
        results = [...results, ...emailResponse.results.map(r => ({ ...r, method: 'Email' }))]
      }

      if (rfqForm.sendMethod === 'whatsapp' || rfqForm.sendMethod === 'both') {
        const whatsappResponse = await purchasesService.sendRFQWhatsApp(
          request.id,
          rfqForm.deadline,
          rfqForm.selectedSuppliers
        )
        results = [...results, ...whatsappResponse.results.map(r => ({ ...r, method: 'WhatsApp' }))]
      }

      setRfqResults(results)

      const successCount = results.filter(r => r.success).length
      const totalCount = results.length

      toast({
        title: successCount === totalCount ? 'RFQ enviado' : 'RFQ enviado parcialmente',
        description: `Se enviaron ${successCount} de ${totalCount} solicitudes de cotización`,
        variant: successCount === totalCount ? 'default' : 'destructive',
      })

      // Update request status if needed
      await fetchRequest()
    } catch (error: any) {
      console.error('Error sending RFQ:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la solicitud de cotización',
        variant: 'destructive',
      })
    } finally {
      setRfqSending(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    const color = REQUEST_STATUS_COLORS[status as keyof typeof REQUEST_STATUS_COLORS]
    return `bg-${color}-100 text-${color}-700 dark:bg-${color}-900 dark:text-${color}-300`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Solicitud no encontrada</p>
      </div>
    )
  }

  const canSubmit = request.status === 'draft' && (isOwner || canSubmitDrafts)
  const canApproveOrReject = request.status === 'pending_approval' && canApprove
  const canCancel = ['draft', 'pending_approval'].includes(request.status) && (isOwner || canApprove)
  const canEdit = ['draft', 'pending_approval'].includes(request.status) && (isOwner || canSubmitDrafts || canApprove)
  const canAddQuotation = ['approved', 'in_quotation', 'quotation_received'].includes(request.status)
  const canCreateOrder = ['approved', 'quotation_received', 'in_evaluation'].includes(request.status)
  const canCompareQuotations = quotations.length >= 2 && ['in_quotation', 'quotation_received', 'in_evaluation'].includes(request.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/purchases/requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {request.request_number}
              </h1>
              <Badge className={getStatusBadgeClass(request.status)}>
                {REQUEST_STATUS_LABELS[request.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{request.title}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/purchases/requests/${request.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={actionLoading}>
              <Send className="h-4 w-4 mr-2" />
              Enviar a Aprobacion
            </Button>
          )}
          {canApproveOrReject && (
            <>
              <Button
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setApproveDialogOpen(true)}
                disabled={actionLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprobar
              </Button>
            </>
          )}
          {canAddQuotation && (
            <>
              <Button variant="outline" onClick={() => handleOpenQuotationDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cotizacion
              </Button>
              <Button
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={handleOpenRfqDialog}
              >
                <Send className="h-4 w-4 mr-2" />
                Solicitar Cotizaciones
              </Button>
            </>
          )}
          {canCompareQuotations && (
            <Button
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              onClick={() => navigate(`/purchases/quotations/compare/${request.id}`)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Comparar Cotizaciones ({quotations.length})
            </Button>
          )}
          {canCreateOrder && (
            <Button
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleOpenCreateOrderDialog}
              disabled={actionLoading}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Crear Orden de Compra
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              onClick={handleCancel}
              disabled={actionLoading}
            >
              Cancelar Solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Pending Approval Alert */}
      {request.status === 'pending_approval' && canApprove && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Esta solicitud requiere tu aprobacion
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Revisa los detalles y decide si aprobar o rechazar la compra.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Detalles de la Solicitud</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Descripcion</label>
                <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{request.description}</p>
              </div>
              {request.justification && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Justificacion</label>
                  <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{request.justification}</p>
                </div>
              )}
              {request.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Notas</label>
                  <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{request.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          {request.items && request.items.length > 0 && (
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle>Items Solicitados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.description}</p>
                        {item.specifications && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.specifications}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {Number(item.quantity)} {item.unit}
                        </p>
                        {item.estimated_unit_price && (
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            ${Number(item.estimated_unit_price).toLocaleString('es-AR')} c/u
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quotations */}
          {['in_quotation', 'quotation_received', 'in_evaluation', 'order_created', 'completed'].includes(request.status) && (
            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cotizaciones</CardTitle>
                {canAddQuotation && (
                  <Button size="sm" variant="outline" onClick={() => handleOpenQuotationDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {quotationsLoading ? (
                  <p className="text-center text-gray-500 py-4">Cargando cotizaciones...</p>
                ) : quotations.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No hay cotizaciones registradas</p>
                ) : (
                  <div className="space-y-3">
                    {quotations.map((quotation) => (
                      <div
                        key={quotation.id}
                        className={`p-4 rounded-lg border ${
                          quotation.is_selected
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                        onClick={() => !quotation.is_selected && !['order_created', 'completed'].includes(request.status) && handleOpenQuotationDialog(quotation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {quotation.supplier?.business_name}
                              </p>
                              {quotation.is_selected && (
                                <Badge className="bg-green-100 text-green-700">
                                  <Star className="h-3 w-3 mr-1" />
                                  Seleccionada
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <div className="flex gap-4">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Monto: <span className="font-medium text-gray-900 dark:text-white">
                                    ${Number(quotation.total_amount).toLocaleString('es-AR')}
                                  </span>
                                </span>
                                {quotation.payment_terms && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Pago: {quotation.payment_terms}
                                  </span>
                                )}
                                {quotation.delivery_time && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Entrega: {quotation.delivery_time}
                                  </span>
                                )}
                              </div>
                              {quotation.valid_until && (
                                <p className="text-gray-500 dark:text-gray-400">
                                  Válida hasta: {new Date(quotation.valid_until).toLocaleDateString('es-AR')}
                                </p>
                              )}
                              {quotation.is_selected && quotation.selection_reason && (
                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-200 dark:border-green-800">
                                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                                    Motivo de selección:
                                  </p>
                                  <p className="text-sm text-green-900 dark:text-green-200">
                                    {quotation.selection_reason}
                                  </p>
                                </div>
                              )}
                              {quotation.notes && (
                                <p className="text-gray-600 dark:text-gray-300 mt-1">{quotation.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {!quotation.is_selected && canApprove && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenSelectQuotationDialog(quotation)
                                }}
                                title="Seleccionar como cotización ganadora"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {!quotation.is_selected && !['order_created', 'completed'].includes(request.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteQuotation(quotation.id)
                                }}
                                title="Eliminar cotización"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {quotations.length >= 2 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                      onClick={() => navigate(`/purchases/quotations/compare/${request.id}`)}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Comparar Cotizaciones ({quotations.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {request.history && request.history.length > 0 && (
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle>Historial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.history.map((entry) => {
                    // Mostrar el estado resultante si difiere de la acción
                    const actionLabel = HISTORY_ACTION_LABELS[entry.action] || entry.action
                    const statusLabel = REQUEST_STATUS_LABELS[entry.to_status as PurchaseRequestStatus]
                    const showStatus =
                      entry.action === 'approved' && entry.to_status === 'in_quotation' ||
                      entry.action === 'status_changed' ||
                      (actionLabel && statusLabel && actionLabel.toLowerCase() !== statusLabel.toLowerCase())

                    return (
                      <div key={entry.id} className="flex gap-3 text-sm">
                        <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {actionLabel}
                              </span>
                              {showStatus && statusLabel && (
                                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                                  → {statusLabel}
                                </span>
                              )}
                              {entry.user && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                  por {entry.user.full_name || entry.user.username}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-500">
                              {new Date(entry.created_at).toLocaleString('es-AR')}
                            </span>
                          </div>
                          {entry.comments && (
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{entry.comments}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Order Card */}
          {relatedOrder && (
            <Card className="dark:bg-gray-800 border-blue-300 dark:border-blue-600">
              <CardHeader>
                <CardTitle className="text-blue-600 dark:text-blue-400">Orden de Compra</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Número de Orden</p>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">
                      {relatedOrder.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monto Total</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${Number(relatedOrder.total_amount).toLocaleString('es-AR')} {relatedOrder.currency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                    <Badge variant="outline" className="mt-1">
                      {relatedOrder.status === 'draft' ? 'Borrador' :
                       relatedOrder.status === 'sent' ? 'Enviada' :
                       relatedOrder.status === 'confirmed' ? 'Confirmada' :
                       relatedOrder.status === 'partially_received' ? 'Parcialmente recibida' :
                       relatedOrder.status === 'received' ? 'Recibida' :
                       relatedOrder.status === 'invoiced' ? 'Facturada' :
                       relatedOrder.status === 'paid' ? 'Pagada' :
                       relatedOrder.status === 'cancelled' ? 'Cancelada' : relatedOrder.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/purchases/orders/${relatedOrder.id}`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Orden Completa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Informacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monto Estimado</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ${Number(request.estimated_amount).toLocaleString('es-AR')} {request.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Compra</p>
                  <p className="text-gray-900 dark:text-white">{PURCHASE_TYPE_LABELS[request.purchase_type]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Prioridad</p>
                  <Badge
                    variant="outline"
                    className={`border-${PRIORITY_COLORS[request.priority]}-500 text-${PRIORITY_COLORS[request.priority]}-600`}
                  >
                    {PRIORITY_LABELS[request.priority]}
                  </Badge>
                </div>
              </div>
              {request.category && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Categoria</p>
                    <p className="text-gray-900 dark:text-white">{request.category.name}</p>
                  </div>
                </div>
              )}
              {request.preferredSupplier && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Proveedor Preferido</p>
                    <p className="text-gray-900 dark:text-white">{request.preferredSupplier.business_name}</p>
                  </div>
                </div>
              )}
              {request.required_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fecha Requerida</p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(request.required_date).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fecha de Creacion</p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(request.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              {request.requestedBy && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Creada por</p>
                    <p className="text-gray-900 dark:text-white">
                      {request.requestedBy.full_name || request.requestedBy.username}
                    </p>
                  </div>
                </div>
              )}
              {request.approvedBy && request.approved_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aprobada por</p>
                    <p className="text-gray-900 dark:text-white">
                      {request.approvedBy.full_name || request.approvedBy.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(request.approved_at).toLocaleDateString('es-AR')} {new Date(request.approved_at).toLocaleTimeString('es-AR')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rejection Info */}
          {request.status === 'rejected' && request.rejection_reason && (
            <Card className="border-red-300 dark:border-red-600">
              <CardHeader>
                <CardTitle className="text-red-600">Motivo de Rechazo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300">{request.rejection_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estas seguro de aprobar esta solicitud de compra por ${Number(request.estimated_amount).toLocaleString('es-AR')}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Comentarios (opcional)</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Agrega comentarios sobre la aprobacion..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={actionLoading}>
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              Indica el motivo por el cual rechazas esta solicitud.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Motivo del Rechazo *</label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explica por que se rechaza esta solicitud..."
              className="mt-2"
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectReason.trim()}
            >
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog */}
      <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Orden de Compra</DialogTitle>
            <DialogDescription>
              Completa los detalles para generar la orden de compra para la solicitud {request.request_number}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {quotationsLoading ? (
              <p className="text-center text-gray-500">Cargando cotizaciones...</p>
            ) : (
              <>
                {quotations.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="quotation">Cotización *</Label>
                    <Select
                      value={orderForm.quotation_id}
                      onValueChange={(value) => setOrderForm({ ...orderForm, quotation_id: value })}
                    >
                      <SelectTrigger id="quotation">
                        <SelectValue placeholder="Selecciona una cotización" />
                      </SelectTrigger>
                      <SelectContent>
                        {quotations.map((quotation) => (
                          <SelectItem key={quotation.id} value={String(quotation.id)}>
                            {quotation.supplier?.business_name} - ${Number(quotation.total_amount).toLocaleString('es-AR')}
                            {quotation.is_selected && ' (Seleccionada)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Selecciona la cotización aprobada para generar la orden
                    </p>
                  </div>
                )}

                {quotations.length === 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      No hay cotizaciones registradas. La orden se creará con los datos estimados de la solicitud.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="expected_delivery_date">Fecha de Entrega Esperada</Label>
                  <Input
                    id="expected_delivery_date"
                    type="date"
                    value={orderForm.expected_delivery_date}
                    onChange={(e) => setOrderForm({ ...orderForm, expected_delivery_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_address">Dirección de Entrega</Label>
                  <Textarea
                    id="delivery_address"
                    value={orderForm.delivery_address}
                    onChange={(e) => setOrderForm({ ...orderForm, delivery_address: e.target.value })}
                    placeholder="Ej: Calle 123, Ciudad, Provincia"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_terms">Condiciones de Pago</Label>
                  <Input
                    id="payment_terms"
                    value={orderForm.payment_terms}
                    onChange={(e) => setOrderForm({ ...orderForm, payment_terms: e.target.value })}
                    placeholder="Ej: 30 días, Contado, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_notes">Notas de Entrega</Label>
                  <Textarea
                    id="delivery_notes"
                    value={orderForm.delivery_notes}
                    onChange={(e) => setOrderForm({ ...orderForm, delivery_notes: e.target.value })}
                    placeholder="Instrucciones especiales para la entrega"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_notes">Notas Adicionales</Label>
                  <Textarea
                    id="order_notes"
                    value={orderForm.notes}
                    onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                    placeholder="Cualquier información adicional"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateOrder}
              disabled={actionLoading || quotationsLoading || (quotations.length > 0 && !orderForm.quotation_id)}
            >
              Crear Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotation Dialog */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuotation ? 'Editar' : 'Agregar'} Cotización</DialogTitle>
            <DialogDescription>
              Registra los detalles de la cotización recibida del proveedor
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_id">Proveedor *</Label>
                <Select
                  value={quotationForm.supplier_id}
                  onValueChange={(value) => setQuotationForm({ ...quotationForm, supplier_id: value })}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={String(supplier.id)}>
                        {supplier.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotation_number">Número de Cotización</Label>
                <Input
                  id="quotation_number"
                  value={quotationForm.quotation_number}
                  onChange={(e) => setQuotationForm({ ...quotationForm, quotation_number: e.target.value })}
                  placeholder="Ej: COT-2024-001"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Items Cotizados</h4>
              <div className="space-y-3">
                {quotationForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="col-span-4">
                      <Label className="text-xs">Descripción</Label>
                      <p className="text-sm font-medium">{item.description}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuotationItem(index, 'quantity', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unidad</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) => updateQuotationItem(index, 'unit', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Precio Unit.</Label>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateQuotationItem(index, 'unit_price', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Total</Label>
                      <p className="text-sm font-bold mt-1">
                        ${((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="subtotal">Subtotal</Label>
                <Input
                  id="subtotal"
                  type="number"
                  value={quotationForm.subtotal}
                  onChange={(e) => setQuotationForm({ ...quotationForm, subtotal: e.target.value })}
                  placeholder="Calculado automáticamente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_amount">Impuestos</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  value={quotationForm.tax_amount}
                  onChange={(e) => setQuotationForm({ ...quotationForm, tax_amount: e.target.value })}
                  placeholder="IVA, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  value={quotationForm.total_amount || calculateQuotationTotals().total}
                  onChange={(e) => setQuotationForm({ ...quotationForm, total_amount: e.target.value })}
                  className="font-bold"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Condiciones de Pago</Label>
                <Input
                  id="payment_terms"
                  value={quotationForm.payment_terms}
                  onChange={(e) => setQuotationForm({ ...quotationForm, payment_terms: e.target.value })}
                  placeholder="Ej: 30 días"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_time">Tiempo de Entrega</Label>
                <Input
                  id="delivery_time"
                  value={quotationForm.delivery_time}
                  onChange={(e) => setQuotationForm({ ...quotationForm, delivery_time: e.target.value })}
                  placeholder="Ej: 15 días"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Válida Hasta</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={quotationForm.valid_until}
                  onChange={(e) => setQuotationForm({ ...quotationForm, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quotation_notes">Notas</Label>
              <Textarea
                id="quotation_notes"
                value={quotationForm.notes}
                onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })}
                placeholder="Cualquier observación adicional"
                rows={2}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded">
              <p className="text-sm font-medium">
                Total calculado: ${calculateQuotationTotals().total.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSaveQuotation}
              disabled={actionLoading || !quotationForm.supplier_id}
            >
              {editingQuotation ? 'Guardar Cambios' : 'Registrar Cotización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Quotation Dialog */}
      <Dialog open={selectQuotationDialogOpen} onOpenChange={setSelectQuotationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Cotización Ganadora</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de seleccionar la cotización de{' '}
              <strong>{selectedQuotationForSelection?.supplier?.business_name}</strong> por{' '}
              <strong>${Number(selectedQuotationForSelection?.total_amount || 0).toLocaleString('es-AR')}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="selection_reason">Motivo de Selección (opcional)</Label>
            <Textarea
              id="selection_reason"
              value={selectionReason}
              onChange={(e) => setSelectionReason(e.target.value)}
              placeholder="Explica por qué se selecciona esta cotización..."
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectQuotationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirmSelectQuotation}
              disabled={actionLoading}
            >
              Confirmar Selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFQ Dialog */}
      <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Cotizaciones</DialogTitle>
            <DialogDescription>
              Genera y envía solicitudes de cotización (RFQ) a los proveedores seleccionados
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="rfq_deadline">Fecha Límite *</Label>
              <Input
                id="rfq_deadline"
                type="date"
                value={rfqForm.deadline}
                onChange={(e) => setRfqForm({ ...rfqForm, deadline: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500">Fecha límite para recibir cotizaciones de los proveedores</p>
            </div>

            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>Proveedores *</Label>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hay proveedores activos</p>
                ) : (
                  suppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`supplier-${supplier.id}`}
                        checked={rfqForm.selectedSuppliers.includes(supplier.id)}
                        onCheckedChange={() => handleToggleSupplier(supplier.id)}
                      />
                      <label
                        htmlFor={`supplier-${supplier.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {supplier.business_name}
                        {supplier.email && (
                          <span className="text-xs text-gray-500 ml-2">({supplier.email})</span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500">
                Seleccionados: {rfqForm.selectedSuppliers.length} de {suppliers.length}
              </p>
            </div>

            {/* Send Method */}
            <div className="space-y-2">
              <Label htmlFor="send_method">Método de Envío *</Label>
              <Select
                value={rfqForm.sendMethod}
                onValueChange={(value: 'email' | 'whatsapp' | 'both') =>
                  setRfqForm({ ...rfqForm, sendMethod: value })
                }
              >
                <SelectTrigger id="send_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <MessageCircle className="h-4 w-4" />
                      Email y WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results */}
            {rfqResults && rfqResults.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-gray-50 dark:bg-gray-800">
                <Label className="text-sm font-semibold">Resultados del Envío:</Label>
                <div className="space-y-1">
                  {rfqResults.map((result, index) => (
                    <div
                      key={index}
                      className={`text-sm flex items-center gap-2 ${
                        result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>
                        {result.method} - {result.supplier}: {result.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRfqDialogOpen(false)} disabled={rfqSending}>
              {rfqResults ? 'Cerrar' : 'Cancelar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadRFQPDF}
              disabled={rfqSending || !rfqForm.deadline || rfqForm.selectedSuppliers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleSendRFQ}
              disabled={rfqSending || !rfqForm.deadline || rfqForm.selectedSuppliers.length === 0}
            >
              {rfqSending ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar RFQ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

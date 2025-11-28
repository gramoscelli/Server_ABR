import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Trophy,
  CheckCircle,
  AlertCircle,
  Edit,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { Quotation, QuotationComparisonResponse, Supplier } from '@/types/purchases'
import { useToast } from '@/components/ui/use-toast'

interface QuotationItemData {
  request_item_id?: number
  description: string
  quantity: string
  unit: string
  unit_price: string
  notes?: string
}

interface QuotationFormData {
  supplier_id: string
  quotation_number: string
  subtotal: string
  tax_amount: string
  total_amount: string
  payment_terms: string
  delivery_time: string
  valid_until: string
  notes: string
  items: QuotationItemData[]
}

export default function QuotationComparePage() {
  const navigate = useNavigate()
  const { requestId } = useParams<{ requestId: string }>()
  const { toast } = useToast()
  const [data, setData] = useState<QuotationComparisonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectDialogOpen, setSelectDialogOpen] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [selectionReason, setSelectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [quotationForm, setQuotationForm] = useState<QuotationFormData>({
    supplier_id: '',
    quotation_number: '',
    subtotal: '',
    tax_amount: '',
    total_amount: '',
    payment_terms: '',
    delivery_time: '',
    valid_until: '',
    notes: '',
    items: []
  })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    fetchComparison()
  }, [requestId])

  const fetchComparison = async () => {
    if (!requestId) return
    try {
      setLoading(true)
      const response = await purchasesService.compareQuotations(parseInt(requestId))
      setData(response)
    } catch (error) {
      console.error('Error fetching quotation comparison:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar la comparación de cotizaciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSelectDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setSelectDialogOpen(true)
  }

  const handleSelectQuotation = async () => {
    if (!selectedQuotation) return

    setActionLoading(true)
    try {
      await purchasesService.selectQuotation(selectedQuotation.id, selectionReason)
      toast({
        title: 'Cotización seleccionada',
        description: `La cotización de ${selectedQuotation.supplier?.business_name} ha sido seleccionada`,
      })
      setSelectDialogOpen(false)
      setSelectionReason('')
      // Navigate back to request detail
      navigate(`/purchases/requests/${requestId}`)
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

  const handleOpenEditDialog = async (quotation: Quotation) => {
    // Fetch suppliers if not loaded
    if (suppliers.length === 0) {
      try {
        const suppliersResponse = await purchasesService.getSuppliers({ limit: 1000 })
        setSuppliers(suppliersResponse.data)
      } catch (error) {
        console.error('Error fetching suppliers:', error)
      }
    }

    // Populate form with quotation data
    setEditingQuotation(quotation)
    setQuotationForm({
      supplier_id: String(quotation.supplier_id),
      quotation_number: quotation.quotation_number || '',
      subtotal: String(quotation.subtotal || ''),
      tax_amount: String(quotation.tax_amount || ''),
      total_amount: String(quotation.total_amount),
      payment_terms: quotation.payment_terms || '',
      delivery_time: quotation.delivery_time || '',
      valid_until: quotation.valid_until ? quotation.valid_until.split('T')[0] : '',
      notes: quotation.notes || '',
      items: (quotation.items || []).map(item => ({
        request_item_id: item.request_item_id || undefined,
        description: item.description,
        quantity: String(item.quantity),
        unit: item.unit,
        unit_price: String(item.unit_price),
        notes: item.notes || ''
      }))
    })
    setEditDialogOpen(true)
  }

  const handleSaveQuotation = async () => {
    if (!editingQuotation) return

    // Validation
    if (!quotationForm.supplier_id || !quotationForm.total_amount) {
      toast({
        title: 'Error',
        description: 'Proveedor y monto total son requeridos',
        variant: 'destructive',
      })
      return
    }

    setActionLoading(true)
    try {
      const quotationData = {
        quotation_number: quotationForm.quotation_number,
        supplier_id: parseInt(quotationForm.supplier_id),
        subtotal: parseFloat(quotationForm.subtotal) || parseFloat(quotationForm.total_amount),
        tax_amount: parseFloat(quotationForm.tax_amount) || 0,
        total_amount: parseFloat(quotationForm.total_amount),
        payment_terms: quotationForm.payment_terms,
        delivery_time: quotationForm.delivery_time,
        valid_until: quotationForm.valid_until || undefined,
        notes: quotationForm.notes,
        items: quotationForm.items.map(item => ({
          request_item_id: item.request_item_id,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || 'unidad',
          unit_price: parseFloat(item.unit_price),
          notes: item.notes
        }))
      }

      await purchasesService.updateQuotation(editingQuotation.id, quotationData)
      toast({
        title: 'Cotización actualizada',
        description: 'La cotización ha sido actualizada exitosamente',
      })
      setEditDialogOpen(false)
      await fetchComparison()
    } catch (error: any) {
      console.error('Error updating quotation:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la cotización',
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

  const calculateQuotationTotals = () => {
    const itemsTotal = quotationForm.items.reduce((sum, item) => {
      return sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))
    }, 0)
    const subtotal = Number(quotationForm.subtotal) || itemsTotal
    const taxAmount = Number(quotationForm.tax_amount) || 0
    const total = subtotal + taxAmount
    return { subtotal, taxAmount, total }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando comparación...</p>
      </div>
    )
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/purchases/requests/${requestId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-gray-500">
              No hay cotizaciones para comparar en esta solicitud
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quotations = data.data
  const summary = data.summary
  const requestInfo = quotations[0]?.purchaseRequest

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/purchases/requests/${requestId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Comparación de Cotizaciones
            </h1>
            {requestInfo && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {requestInfo.request_number} - {requestInfo.title}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cotizaciones</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.count}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-green-300 dark:border-green-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Mínimo</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${Number(summary.minAmount).toLocaleString('es-AR')}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 border-red-300 dark:border-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Máximo</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${Number(summary.maxAmount).toLocaleString('es-AR')}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Diferencia</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${Number(summary.spread).toLocaleString('es-AR')}
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {((Number(summary.spread) / Number(summary.minAmount)) * 100).toFixed(1)}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Comparación Detallada</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Criterio</TableHead>
                {quotations.map((quotation) => (
                  <TableHead key={quotation.id} className="min-w-[200px]">
                    <div className="flex items-center gap-2">
                      {quotation.is_lowest && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <span>{quotation.supplier?.business_name}</span>
                    </div>
                    {quotation.is_selected && (
                      <>
                        <Badge className="mt-1 bg-green-100 text-green-700">Seleccionada</Badge>
                        {quotation.selection_reason && (
                          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded text-xs">
                            <p className="font-semibold text-green-700 dark:text-green-400 mb-1">
                              Motivo:
                            </p>
                            <p className="text-green-900 dark:text-green-200">
                              {quotation.selection_reason}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Total Amount */}
              <TableRow>
                <TableCell className="font-medium">Monto Total</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    <div>
                      <p className="text-lg font-bold">
                        ${Number(quotation.total_amount).toLocaleString('es-AR')}
                      </p>
                      {quotation.percentage_above_min && Number(quotation.percentage_above_min) > 0 && (
                        <p className="text-xs text-red-600">
                          +{quotation.percentage_above_min}% sobre mínimo
                        </p>
                      )}
                      {quotation.is_lowest && (
                        <Badge variant="outline" className="mt-1 border-green-500 text-green-600">
                          Mejor precio
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>

              {/* Subtotal */}
              <TableRow>
                <TableCell className="font-medium">Subtotal</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    ${Number(quotation.subtotal).toLocaleString('es-AR')}
                  </TableCell>
                ))}
              </TableRow>

              {/* Tax */}
              <TableRow>
                <TableCell className="font-medium">Impuestos</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    ${Number(quotation.tax_amount).toLocaleString('es-AR')}
                  </TableCell>
                ))}
              </TableRow>

              {/* Payment Terms */}
              <TableRow>
                <TableCell className="font-medium">Condiciones de Pago</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    {quotation.payment_terms || '-'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Delivery Time */}
              <TableRow>
                <TableCell className="font-medium">Tiempo de Entrega</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    {quotation.delivery_time || '-'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Valid Until */}
              <TableRow>
                <TableCell className="font-medium">Válida Hasta</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    {quotation.valid_until
                      ? new Date(quotation.valid_until).toLocaleDateString('es-AR')
                      : '-'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Items Count */}
              <TableRow>
                <TableCell className="font-medium">Items</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    {quotation.items?.length || 0} items
                  </TableCell>
                ))}
              </TableRow>

              {/* Actions */}
              <TableRow>
                <TableCell className="font-medium">Acción</TableCell>
                {quotations.map((quotation) => (
                  <TableCell key={quotation.id}>
                    <div className="flex flex-col gap-2">
                      {quotation.is_selected ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Seleccionada
                        </Badge>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSelectDialog(quotation)}
                          >
                            Seleccionar
                          </Button>
                          {requestInfo && !['order_created', 'completed'].includes(requestInfo.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditDialog(quotation)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Editar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Items Comparison */}
      {quotations.some(q => q.items && q.items.length > 0) && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Comparación de Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotations[0]?.items?.map((_, itemIndex) => (
              <div key={itemIndex} className="border-b pb-4 last:border-0">
                <h4 className="font-medium mb-2">Item {itemIndex + 1}</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotations.map((quotation) => {
                        const item = quotation.items?.[itemIndex]
                        if (!item) return null
                        return (
                          <TableRow key={quotation.id}>
                            <TableCell>{quotation.supplier?.business_name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              {Number(item.quantity)} {item.unit}
                            </TableCell>
                            <TableCell>
                              ${Number(item.unit_price).toLocaleString('es-AR')}
                            </TableCell>
                            <TableCell className="font-medium">
                              ${Number(item.total_price || 0).toLocaleString('es-AR')}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Select Quotation Dialog */}
      <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Cotización</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de seleccionar la cotización de{' '}
              <strong>{selectedQuotation?.supplier?.business_name}</strong> por{' '}
              <strong>${Number(selectedQuotation?.total_amount || 0).toLocaleString('es-AR')}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Motivo de Selección (opcional)</label>
            <Textarea
              value={selectionReason}
              onChange={(e) => setSelectionReason(e.target.value)}
              placeholder="Explica por qué se selecciona esta cotización..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSelectQuotation}
              disabled={actionLoading}
            >
              Confirmar Selección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quotation Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cotización</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la cotización de {editingQuotation?.supplier?.business_name}
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSaveQuotation}
              disabled={actionLoading || !quotationForm.supplier_id}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

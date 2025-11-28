import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type {
  PurchaseCategory,
  Supplier,
  CreatePurchaseRequestData,
  PurchaseRequestItemData,
  Priority,
  PurchaseType,
} from '@/types/purchases'
import { PRIORITY_LABELS, PURCHASE_TYPE_LABELS } from '@/types/purchases'
import { useToast } from '@/components/ui/use-toast'

export default function NewRequestPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const [categories, setCategories] = useState<PurchaseCategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  const [formData, setFormData] = useState<CreatePurchaseRequestData>({
    title: '',
    description: '',
    justification: '',
    estimated_amount: 0,
    currency: 'ARS',
    priority: 'normal',
    notes: '',
    items: [],
  })
  const [items, setItems] = useState<PurchaseRequestItemData[]>([])

  const isEditMode = !!id

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (id) {
      loadRequest()
    }
  }, [id])

  const fetchData = async () => {
    try {
      const [categoriesRes, suppliersRes] = await Promise.all([
        purchasesService.getPurchaseCategories(true),
        purchasesService.getSuppliers({ is_active: true, limit: 100 }),
      ])
      setCategories(categoriesRes)
      setSuppliers(suppliersRes.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const loadRequest = async () => {
    if (!id) return
    setInitialLoading(true)
    try {
      const request = await purchasesService.getRequest(parseInt(id))
      setFormData({
        title: request.title,
        description: request.description || '',
        justification: request.justification || '',
        category_id: request.category_id || undefined,
        estimated_amount: Number(request.estimated_amount),
        currency: request.currency,
        priority: request.priority,
        purchase_type: request.purchase_type,
        required_date: request.required_date || undefined,
        preferred_supplier_id: request.preferred_supplier_id || undefined,
        notes: request.notes || '',
        items: [],
      })
      setItems(request.items?.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        estimated_unit_price: item.estimated_unit_price ? Number(item.estimated_unit_price) : undefined,
        specifications: item.specifications || '',
      })) || [])
    } catch (error: any) {
      console.error('Error loading request:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar la solicitud',
        variant: 'destructive',
      })
      navigate('/purchases/requests')
    } finally {
      setInitialLoading(false)
    }
  }

  const addItem = () => {
    setItems([
      ...items,
      {
        description: '',
        quantity: 1,
        unit: 'unidad',
        estimated_unit_price: 0,
        specifications: '',
      },
    ])
  }

  const updateItem = (index: number, field: keyof PurchaseRequestItemData, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)

    // Recalculate total if price or quantity changed
    if (field === 'quantity' || field === 'estimated_unit_price') {
      const total = newItems.reduce((sum, item) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.estimated_unit_price) || 0)
      }, 0)
      setFormData({ ...formData, estimated_amount: total })
    }
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)

    // Recalculate total
    const total = newItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.estimated_unit_price) || 0)
    }, 0)
    setFormData({ ...formData, estimated_amount: total })
  }

  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!formData.title || !formData.description || formData.estimated_amount <= 0) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    let requestId: number | null = isEditMode ? parseInt(id!) : null

    try {
      const data: CreatePurchaseRequestData = {
        ...formData,
        items: items.length > 0 ? items : undefined,
      }

      if (isEditMode) {
        // Editar solicitud existente
        await purchasesService.updateRequest(parseInt(id!), data)
        toast({
          title: 'Solicitud actualizada',
          description: 'La solicitud ha sido actualizada exitosamente',
        })
      } else {
        // Crear nueva solicitud
        const request = await purchasesService.createRequest(data)
        requestId = request.id

        toast({
          title: 'Solicitud creada',
          description: `La solicitud ${request.request_number} ha sido creada exitosamente`,
        })
      }

      // Enviar a aprobación si se solicitó
      if (submitForApproval && requestId) {
        try {
          await purchasesService.submitRequest(requestId)
          toast({
            title: 'Enviada a aprobación',
            description: 'La solicitud ha sido enviada para aprobación',
          })
        } catch (submitError: any) {
          console.error('Error submitting request:', submitError)
          toast({
            title: 'Error al enviar',
            description: 'La solicitud fue creada pero no se pudo enviar a aprobación. Puedes enviarla manualmente desde la página de detalles.',
            variant: 'destructive',
          })
        }
      }

      // Navegar a la página de detalles
      navigate(`/purchases/requests/${requestId}`)
    } catch (error: any) {
      console.error('Error saving request:', error)
      toast({
        title: isEditMode ? 'Error al actualizar solicitud' : 'Error al crear solicitud',
        description: error.message || `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la solicitud. Por favor intenta nuevamente.`,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(isEditMode ? `/purchases/requests/${id}` : '/purchases/requests')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Editar Solicitud de Compra' : 'Nueva Solicitud de Compra'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode ? 'Modifica los datos de la solicitud' : 'Completa los datos para crear una nueva solicitud'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Informacion General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titulo breve de la solicitud"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripcion *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe que se necesita comprar y por que..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="justification">Justificacion</Label>
                <Textarea
                  id="justification"
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Justifica la necesidad de esta compra..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No hay items. Puedes agregar items para detallar la compra.
                </p>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Descripcion</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Descripcion del item"
                          />
                        </div>
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Unidad</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            placeholder="unidad, kg, litro..."
                          />
                        </div>
                        <div>
                          <Label>Precio Unitario Estimado</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimated_unit_price}
                            onChange={(e) => updateItem(index, 'estimated_unit_price', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Subtotal</Label>
                          <Input
                            readOnly
                            value={`$${((Number(item.quantity) || 0) * (Number(item.estimated_unit_price) || 0)).toLocaleString('es-AR')}`}
                            className="bg-gray-50 dark:bg-gray-700"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Especificaciones</Label>
                          <Textarea
                            value={item.specifications || ''}
                            onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                            placeholder="Especificaciones tecnicas o detalles adicionales..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas o comentarios adicionales..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Configuracion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Monto Estimado Total *</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_amount}
                    onChange={(e) => setFormData({ ...formData, estimated_amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1"
                  />
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tipo de Compra</Label>
                <Select
                  value={formData.purchase_type || 'direct'}
                  onValueChange={(value) => setFormData({ ...formData, purchase_type: value as PurchaseType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURCHASE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={formData.category_id?.toString() || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? undefined : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proveedor Preferido</Label>
                <Select
                  value={formData.preferred_supplier_id?.toString() || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, preferred_supplier_id: value === 'none' ? undefined : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin preferencia</SelectItem>
                    {suppliers.map((sup) => (
                      <SelectItem key={sup.id} value={String(sup.id)}>
                        {sup.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha Requerida</Label>
                <Input
                  type="date"
                  value={formData.required_date || ''}
                  onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="dark:bg-gray-800">
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full"
                onClick={() => handleSubmit(true)}
                disabled={loading || !formData.title || !formData.description || formData.estimated_amount <= 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Crear y Enviar a Aprobacion
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={loading || !formData.title || !formData.description || formData.estimated_amount <= 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar como Borrador
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/purchases/requests')}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

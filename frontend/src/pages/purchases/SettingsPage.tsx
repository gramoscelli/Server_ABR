import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Tag,
  FolderTree,
  Save,
} from 'lucide-react'
import purchasesService from '@/lib/purchasesService'
import type {
  SupplierCategory,
  PurchaseCategory,
  PurchaseSettings,
  CreateSupplierCategoryData,
  CreatePurchaseCategoryData,
} from '@/types/purchases'

export default function PurchasesSettingsPage() {
  const [activeTab, setActiveTab] = useState('supplier-categories')

  // Supplier Categories state
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([])
  const [supplierCatLoading, setSupplierCatLoading] = useState(true)
  const [supplierCatDialogOpen, setSupplierCatDialogOpen] = useState(false)
  const [editingSupplierCat, setEditingSupplierCat] = useState<SupplierCategory | null>(null)
  const [supplierCatForm, setSupplierCatForm] = useState<CreateSupplierCategoryData>({
    name: '',
    description: '',
    color: '#3B82F6',
  })

  // Purchase Categories state
  const [purchaseCategories, setPurchaseCategories] = useState<PurchaseCategory[]>([])
  const [purchaseCatLoading, setPurchaseCatLoading] = useState(true)
  const [purchaseCatDialogOpen, setPurchaseCatDialogOpen] = useState(false)
  const [editingPurchaseCat, setEditingPurchaseCat] = useState<PurchaseCategory | null>(null)
  const [purchaseCatForm, setPurchaseCatForm] = useState<CreatePurchaseCategoryData>({
    name: '',
    color: '#3B82F6',
  })

  // Settings state
  const [settings, setSettings] = useState<PurchaseSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    direct_purchase_limit: '',
    min_quotations_required: '',
    quotation_validity_days: '',
    require_board_approval_above: '',
  })

  useEffect(() => {
    fetchSupplierCategories()
    fetchPurchaseCategories()
    fetchSettings()
  }, [])

  // ============================================================================
  // SUPPLIER CATEGORIES
  // ============================================================================
  const fetchSupplierCategories = async () => {
    try {
      const data = await purchasesService.getSupplierCategories()
      setSupplierCategories(data)
    } catch (error) {
      console.error('Error fetching supplier categories:', error)
    } finally {
      setSupplierCatLoading(false)
    }
  }

  const handleOpenSupplierCatDialog = (category?: SupplierCategory) => {
    if (category) {
      setEditingSupplierCat(category)
      setSupplierCatForm({
        name: category.name,
        description: category.description || '',
        color: category.color,
        order_index: category.order_index,
      })
    } else {
      setEditingSupplierCat(null)
      setSupplierCatForm({
        name: '',
        description: '',
        color: '#3B82F6',
      })
    }
    setSupplierCatDialogOpen(true)
  }

  const handleSaveSupplierCat = async () => {
    if (!supplierCatForm.name) return
    try {
      if (editingSupplierCat) {
        await purchasesService.updateSupplierCategory(editingSupplierCat.id, supplierCatForm)
      } else {
        await purchasesService.createSupplierCategory(supplierCatForm)
      }
      setSupplierCatDialogOpen(false)
      fetchSupplierCategories()
    } catch (error) {
      console.error('Error saving supplier category:', error)
    }
  }

  const handleDeleteSupplierCat = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return
    try {
      await purchasesService.deleteSupplierCategory(id)
      fetchSupplierCategories()
    } catch (error) {
      console.error('Error deleting supplier category:', error)
    }
  }

  // ============================================================================
  // PURCHASE CATEGORIES
  // ============================================================================
  const fetchPurchaseCategories = async () => {
    try {
      const data = await purchasesService.getPurchaseCategories()
      setPurchaseCategories(data)
    } catch (error) {
      console.error('Error fetching purchase categories:', error)
    } finally {
      setPurchaseCatLoading(false)
    }
  }

  const handleOpenPurchaseCatDialog = (category?: PurchaseCategory) => {
    if (category) {
      setEditingPurchaseCat(category)
      setPurchaseCatForm({
        name: category.name,
        parent_id: category.parent_id || undefined,
        color: category.color,
        order_index: category.order_index,
      })
    } else {
      setEditingPurchaseCat(null)
      setPurchaseCatForm({
        name: '',
        color: '#3B82F6',
      })
    }
    setPurchaseCatDialogOpen(true)
  }

  const handleSavePurchaseCat = async () => {
    if (!purchaseCatForm.name) return
    try {
      if (editingPurchaseCat) {
        await purchasesService.updatePurchaseCategory(editingPurchaseCat.id, purchaseCatForm)
      } else {
        await purchasesService.createPurchaseCategory(purchaseCatForm)
      }
      setPurchaseCatDialogOpen(false)
      fetchPurchaseCategories()
    } catch (error) {
      console.error('Error saving purchase category:', error)
    }
  }

  const handleDeletePurchaseCat = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return
    try {
      await purchasesService.deletePurchaseCategory(id)
      fetchPurchaseCategories()
    } catch (error) {
      console.error('Error deleting purchase category:', error)
    }
  }

  // Get parent categories (those without parent_id)
  const parentCategories = purchaseCategories.filter(c => !c.parent_id)

  // ============================================================================
  // SETTINGS
  // ============================================================================
  const fetchSettings = async () => {
    try {
      const data = await purchasesService.getSettings()
      setSettings(data)
      setSettingsForm({
        direct_purchase_limit: data.direct_purchase_limit?.value || '',
        min_quotations_required: data.min_quotations_required?.value || '',
        quotation_validity_days: data.quotation_validity_days?.value || '',
        require_board_approval_above: data.require_board_approval_above?.value || '',
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    try {
      await purchasesService.updateSettings(settingsForm)
      fetchSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración de Compras</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Administra categorías, proveedores y configuración del módulo
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="supplier-categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categorías de Proveedores
          </TabsTrigger>
          <TabsTrigger value="purchase-categories" className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Categorías de Compras
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración General
          </TabsTrigger>
        </TabsList>

        {/* Supplier Categories Tab */}
        <TabsContent value="supplier-categories" className="mt-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categorías de Proveedores</CardTitle>
                  <CardDescription>
                    Clasifica los proveedores por tipo de servicio o producto
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenSupplierCatDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Proveedores</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierCatLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : supplierCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay categorías de proveedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    supplierCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-gray-500 max-w-xs truncate">
                          {category.description || '-'}
                        </TableCell>
                        <TableCell>{category.supplier_count || 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenSupplierCatDialog(category)}
                              title="Editar categoría"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeleteSupplierCat(category.id)}
                              title="Eliminar categoría"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Categories Tab */}
        <TabsContent value="purchase-categories" className="mt-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categorías de Compras</CardTitle>
                  <CardDescription>
                    Organiza las compras por tipo o destino
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenPurchaseCatDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Categoría
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría Padre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseCatLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : purchaseCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay categorías de compras
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {category.parent_id && <span className="text-gray-400 mr-2">└</span>}
                          {category.name}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {category.parent_id
                            ? purchaseCategories.find(c => c.id === category.parent_id)?.name || '-'
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            category.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {category.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenPurchaseCatDialog(category)}
                              title="Editar categoría"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDeletePurchaseCat(category.id)}
                              title="Eliminar categoría"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Define los parámetros y límites del módulo de compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <p className="text-center py-8 text-gray-500">Cargando...</p>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="direct_purchase_limit">Límite para Compra Directa ($)</Label>
                      <Input
                        id="direct_purchase_limit"
                        type="number"
                        value={settingsForm.direct_purchase_limit}
                        onChange={(e) => setSettingsForm({ ...settingsForm, direct_purchase_limit: e.target.value })}
                        placeholder="Ej: 100000"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Monto máximo para compras sin concurso de precios
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="require_board_approval_above">Requiere Aprobación de Junta ($)</Label>
                      <Input
                        id="require_board_approval_above"
                        type="number"
                        value={settingsForm.require_board_approval_above}
                        onChange={(e) => setSettingsForm({ ...settingsForm, require_board_approval_above: e.target.value })}
                        placeholder="Ej: 500000"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Monto a partir del cual se requiere aprobación de la Junta Directiva
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="min_quotations_required">Cotizaciones Mínimas Requeridas</Label>
                      <Input
                        id="min_quotations_required"
                        type="number"
                        min="1"
                        max="10"
                        value={settingsForm.min_quotations_required}
                        onChange={(e) => setSettingsForm({ ...settingsForm, min_quotations_required: e.target.value })}
                        placeholder="Ej: 3"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Número mínimo de cotizaciones para concurso de precios
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="quotation_validity_days">Validez de Cotizaciones (días)</Label>
                      <Input
                        id="quotation_validity_days"
                        type="number"
                        min="1"
                        value={settingsForm.quotation_validity_days}
                        onChange={(e) => setSettingsForm({ ...settingsForm, quotation_validity_days: e.target.value })}
                        placeholder="Ej: 15"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Días de validez por defecto para las cotizaciones
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                      <Save className="h-4 w-4 mr-2" />
                      {settingsSaving ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Supplier Category Dialog */}
      <Dialog open={supplierCatDialogOpen} onOpenChange={setSupplierCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSupplierCat ? 'Editar Categoría de Proveedor' : 'Nueva Categoría de Proveedor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="supplier-cat-name">Nombre *</Label>
              <Input
                id="supplier-cat-name"
                value={supplierCatForm.name}
                onChange={(e) => setSupplierCatForm({ ...supplierCatForm, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <Label htmlFor="supplier-cat-desc">Descripción</Label>
              <Textarea
                id="supplier-cat-desc"
                value={supplierCatForm.description || ''}
                onChange={(e) => setSupplierCatForm({ ...supplierCatForm, description: e.target.value })}
                placeholder="Descripción opcional"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="supplier-cat-color">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="supplier-cat-color"
                  type="color"
                  value={supplierCatForm.color}
                  onChange={(e) => setSupplierCatForm({ ...supplierCatForm, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={supplierCatForm.color}
                  onChange={(e) => setSupplierCatForm({ ...supplierCatForm, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierCatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSupplierCat} disabled={!supplierCatForm.name}>
              {editingSupplierCat ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Category Dialog */}
      <Dialog open={purchaseCatDialogOpen} onOpenChange={setPurchaseCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPurchaseCat ? 'Editar Categoría de Compra' : 'Nueva Categoría de Compra'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="purchase-cat-name">Nombre *</Label>
              <Input
                id="purchase-cat-name"
                value={purchaseCatForm.name}
                onChange={(e) => setPurchaseCatForm({ ...purchaseCatForm, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <Label htmlFor="purchase-cat-parent">Categoría Padre</Label>
              <select
                id="purchase-cat-parent"
                value={purchaseCatForm.parent_id || ''}
                onChange={(e) => setPurchaseCatForm({ ...purchaseCatForm, parent_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Sin categoría padre (principal)</option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="purchase-cat-color">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="purchase-cat-color"
                  type="color"
                  value={purchaseCatForm.color}
                  onChange={(e) => setPurchaseCatForm({ ...purchaseCatForm, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={purchaseCatForm.color}
                  onChange={(e) => setPurchaseCatForm({ ...purchaseCatForm, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseCatDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePurchaseCat} disabled={!purchaseCatForm.name}>
              {editingPurchaseCat ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import purchasesService from '@/lib/purchasesService'
import type { Supplier, SupplierCategory, CreateSupplierData, TaxCondition } from '@/types/purchases'
import { TAX_CONDITION_LABELS } from '@/types/purchases'

export default function SuppliersPage() {
  const navigate = useNavigate()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<SupplierCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const limit = 20
  const [formData, setFormData] = useState<CreateSupplierData>({
    business_name: '',
    trade_name: '',
    cuit: '',
    tax_condition: 'responsable_inscripto',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    setPage(1)
  }, [search, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [search, categoryFilter, page])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [suppliersRes, categoriesRes] = await Promise.all([
        purchasesService.getSuppliers({
          search: search || undefined,
          category_id: categoryFilter ? parseInt(categoryFilter) : undefined,
          page,
          limit,
        }),
        purchasesService.getSupplierCategories(true),
      ])
      setSuppliers(suppliersRes.data)
      setTotalPages(suppliersRes.pagination?.pages || 1)
      setTotalItems(suppliersRes.pagination?.total || 0)
      setCategories(categoriesRes)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        business_name: supplier.business_name,
        trade_name: supplier.trade_name || '',
        cuit: supplier.cuit || '',
        tax_condition: supplier.tax_condition,
        category_id: supplier.category_id || undefined,
        contact_name: supplier.contact_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      })
    } else {
      setEditingSupplier(null)
      setFormData({
        business_name: '',
        trade_name: '',
        cuit: '',
        tax_condition: 'responsable_inscripto',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      if (editingSupplier) {
        await purchasesService.updateSupplier(editingSupplier.id, formData)
      } else {
        await purchasesService.createSupplier(formData)
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving supplier:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estas seguro de eliminar este proveedor?')) return
    try {
      await purchasesService.deleteSupplier(id)
      fetchData()
    } catch (error) {
      console.error('Error deleting supplier:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona el registro de proveedores
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Filters */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, CUIT o contacto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="dark:bg-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Condicion Fiscal</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron proveedores
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => handleOpenDialog(supplier)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {supplier.business_name}
                          </p>
                          {supplier.trade_name && (
                            <p className="text-sm text-gray-500">{supplier.trade_name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{supplier.cuit || '-'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {supplier.contact_name && (
                          <p className="text-sm text-gray-900 dark:text-white">{supplier.contact_name}</p>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.category ? (
                        <Badge
                          variant="outline"
                          style={{ borderColor: supplier.category.color, color: supplier.category.color }}
                        >
                          {supplier.category.name}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{TAX_CONDITION_LABELS[supplier.tax_condition]}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDialog(supplier)
                          }}
                          title="Editar proveedor"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(supplier.id)
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="Eliminar proveedor"
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

      {/* Pagination */}
      {!loading && suppliers.length > 0 && (
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label htmlFor="business_name">Razon Social *</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Razon social o nombre"
              />
            </div>
            <div>
              <Label htmlFor="trade_name">Nombre de Fantasia</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="Nombre comercial"
              />
            </div>
            <div>
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
            <div>
              <Label htmlFor="tax_condition">Condicion Fiscal</Label>
              <Select
                value={formData.tax_condition}
                onValueChange={(value) => setFormData({ ...formData, tax_condition: value as TaxCondition })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TAX_CONDITION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category_id">Categoria</Label>
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
              <Label htmlFor="contact_name">Nombre de Contacto</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Persona de contacto"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Telefono"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Direccion</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Direccion completa"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
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
            <Button onClick={handleSubmit} disabled={!formData.business_name}>
              {editingSupplier ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

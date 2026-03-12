import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Wallet,
  Building2,
  CreditCard,
  FileText,
  Search,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import * as accountingService from '@/lib/accountingService'
import type { CuentaContable, CreateCuentaContableData, UpdateCuentaContableData } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

// ============================================================================
// CONSTANTS
// ============================================================================

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(Number(amount))
}

interface Section {
  key: string
  label: string
  codePrefix: string
  colorText: string
  colorBg: string
  colorBorder: string
}

const SECTIONS: Section[] = [
  { key: 'activo', label: '1 - Activo', codePrefix: '1', colorText: 'text-blue-700 dark:text-blue-400', colorBg: 'bg-blue-50 dark:bg-blue-900/20', colorBorder: 'border-blue-200 dark:border-blue-800' },
  { key: 'pasivo', label: '2 - Pasivo', codePrefix: '2', colorText: 'text-orange-700 dark:text-orange-400', colorBg: 'bg-orange-50 dark:bg-orange-900/20', colorBorder: 'border-orange-200 dark:border-orange-800' },
  { key: 'patrimonio', label: '3 - Patrimonio Neto', codePrefix: '3', colorText: 'text-purple-700 dark:text-purple-400', colorBg: 'bg-purple-50 dark:bg-purple-900/20', colorBorder: 'border-purple-200 dark:border-purple-800' },
  { key: 'ingreso', label: '4 - Ingresos', codePrefix: '4', colorText: 'text-green-700 dark:text-green-400', colorBg: 'bg-green-50 dark:bg-green-900/20', colorBorder: 'border-green-200 dark:border-green-800' },
  { key: 'egreso', label: '5 - Egresos', codePrefix: '5', colorText: 'text-red-700 dark:text-red-400', colorBg: 'bg-red-50 dark:bg-red-900/20', colorBorder: 'border-red-200 dark:border-red-800' },
]

const SUBTIPO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  bancaria: 'Bancaria',
  cobro_electronico: 'Cobro Electrónico',
  credito_cobrar: 'Crédito a Cobrar',
  pasivo_liquidar: 'Pasivo a Liquidar',
}

const SUBTIPO_ICONS: Record<string, React.ReactNode> = {
  efectivo: <Wallet className="h-4 w-4" />,
  bancaria: <Building2 className="h-4 w-4" />,
  cobro_electronico: <CreditCard className="h-4 w-4" />,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<string>('active')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    SECTIONS.forEach(s => { initial[s.key] = true })
    return initial
  })
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<CuentaContable | null>(null)
  const [detailCuenta, setDetailCuenta] = useState<CuentaContable | null>(null)
  const [deleteCuenta, setDeleteCuenta] = useState<CuentaContable | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchData()
  }, [navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await accountingService.getCuentas()
      setCuentas(response.data || [])
    } catch (error) {
      console.error('Error fetching cuentas:', error)
      toast({
        title: 'Error',
        description: 'No se pudo cargar el plan de cuentas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCuenta = async (data: CreateCuentaContableData) => {
    const result = await accountingService.createCuenta(data)
    if (!result.success) {
      toast({ title: 'Error', description: result.error || 'No se pudo crear la cuenta', variant: 'destructive' })
      throw new Error(result.error)
    }
    toast({ title: 'Éxito', description: 'Cuenta creada correctamente' })
    fetchData()
  }

  const handleEditCuenta = async (data: UpdateCuentaContableData) => {
    if (!editingCuenta) return
    const result = await accountingService.updateCuenta(editingCuenta.id, data)
    if (!result.success) {
      toast({ title: 'Error', description: result.error || 'No se pudo actualizar la cuenta', variant: 'destructive' })
      throw new Error(result.error)
    }
    toast({ title: 'Éxito', description: 'Cuenta actualizada correctamente' })
    setEditingCuenta(null)
    fetchData()
  }

  const handleDeleteCuenta = async () => {
    if (!deleteCuenta) return
    setDeleteLoading(true)
    setDeleteError(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await accountingService.deleteCuenta(deleteCuenta.id)
    setDeleteLoading(false)
    if (result.success === false) {
      setDeleteError(result.error || 'No se pudo eliminar la cuenta')
      return
    }
    setDeleteCuenta(null)
    fetchData()
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Filter cuentas
  const filteredCuentas = useMemo(() => {
    return cuentas.filter(c => {
      if (filterActive === 'active' && !c.is_active) return false
      if (filterActive === 'inactive' && c.is_active) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesCode = String(c.codigo).includes(q)
        const matchesTitle = c.titulo.toLowerCase().includes(q)
        const matchesSubtipo = c.subtipo && SUBTIPO_LABELS[c.subtipo]?.toLowerCase().includes(q)
        if (!matchesCode && !matchesTitle && !matchesSubtipo) return false
      }
      return true
    })
  }, [cuentas, filterActive, searchQuery])

  // Group cuentas by first digit of code
  const sectionedCuentas = useMemo(() => {
    const result: Record<string, CuentaContable[]> = {}
    for (const section of SECTIONS) {
      result[section.key] = filteredCuentas
        .filter(c => String(c.codigo).startsWith(section.codePrefix))
        .sort((a, b) => a.codigo - b.codigo)
    }
    // Uncategorized (codes not starting with 1-5)
    const assigned = new Set(Object.values(result).flat().map(c => c.id))
    const uncategorized = filteredCuentas.filter(c => !assigned.has(c.id)).sort((a, b) => a.codigo - b.codigo)
    if (uncategorized.length > 0) {
      result['other'] = uncategorized
    }
    return result
  }, [filteredCuentas])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plan de Cuentas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestiona las cuentas contables y visualiza saldos
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código, título o subtipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterActive} onValueChange={setFilterActive}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="inactive">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <p className="text-center text-sm text-gray-500">
            {filteredCuentas.length} de {cuentas.length} cuentas
          </p>
        </CardContent>
      </Card>

      {/* Sections */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            Cargando plan de cuentas...
          </CardContent>
        </Card>
      ) : filteredCuentas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4 mx-auto">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No hay cuentas que coincidan</p>
            <p className="text-sm text-gray-400">Probá cambiando los filtros o la búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionCuentas = sectionedCuentas[section.key] || []
            if (sectionCuentas.length === 0) return null
            const isExpanded = expandedSections[section.key]

            return (
              <Card key={section.key} className={cn('border', section.colorBorder)}>
                <CardHeader
                  className={cn('cursor-pointer hover:opacity-80 transition-opacity pb-3', section.colorBg)}
                  onClick={() => toggleSection(section.key)}
                >
                  <CardTitle className={cn('flex items-center justify-between text-lg', section.colorText)}>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <span>{section.label}</span>
                      <span className="text-sm font-normal opacity-75">
                        ({sectionCuentas.length})
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {sectionCuentas.map((cuenta) => (
                        <CuentaRow
                          key={cuenta.id}
                          cuenta={cuenta}
                          section={section}
                          onEdit={() => setEditingCuenta(cuenta)}
                          onDelete={() => { setDeleteError(null); setDeleteCuenta(cuenta) }}
                          onDetail={() => setDetailCuenta(cuenta)}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {/* Uncategorized */}
          {(sectionedCuentas['other'] || []).length > 0 && (
            <Card>
              <CardHeader
                className="bg-gray-50 dark:bg-gray-900/50 pb-3 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => toggleSection('other')}
              >
                <CardTitle className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-lg">
                  {expandedSections['other'] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  Otras Cuentas
                  <span className="text-sm font-normal opacity-75">({sectionedCuentas['other'].length})</span>
                </CardTitle>
              </CardHeader>
              {expandedSections['other'] && (
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {sectionedCuentas['other'].map((cuenta) => (
                      <CuentaRow
                        key={cuenta.id}
                        cuenta={cuenta}
                        onEdit={() => setEditingCuenta(cuenta)}
                        onDelete={() => { setDeleteError(null); setDeleteCuenta(cuenta) }}
                        onDetail={() => setDetailCuenta(cuenta)}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Add Dialog */}
      <AddCuentaContableDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddCuenta}
      />

      {/* Edit Dialog */}
      <EditCuentaContableDialog
        open={!!editingCuenta}
        onOpenChange={(open) => !open && setEditingCuenta(null)}
        onSubmit={handleEditCuenta}
        cuenta={editingCuenta}
      />

      {/* Detail Dialog */}
      <CuentaDetailDialog
        cuenta={detailCuenta}
        onClose={() => setDetailCuenta(null)}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCuenta} onOpenChange={(open) => { if (!open) setDeleteCuenta(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar cuenta</DialogTitle>
          </DialogHeader>
          {deleteError ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                {deleteError}
              </p>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDeleteCuenta(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ¿Está seguro de eliminar la cuenta{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deleteCuenta?.codigo} - {deleteCuenta?.titulo}
                </span>
                ? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteCuenta(null)} disabled={deleteLoading}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteCuenta} disabled={deleteLoading}>
                  {deleteLoading ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// CUENTA ROW
// ============================================================================

function CuentaRow({
  cuenta,
  section,
  onEdit,
  onDelete,
  onDetail,
}: {
  cuenta: CuentaContable
  section?: Section
  onEdit: () => void
  onDelete: () => void
  onDetail: () => void
}) {
  const colorText = section?.colorText || 'text-gray-600'
  const colorBg = section?.colorBg || 'bg-gray-50 dark:bg-gray-900/20'

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer',
        !cuenta.is_active && 'opacity-50'
      )}
      onClick={onDetail}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {cuenta.subtipo && SUBTIPO_ICONS[cuenta.subtipo] ? (
          <div className={cn('p-2 rounded-lg shrink-0', colorBg, colorText)}>
            {SUBTIPO_ICONS[cuenta.subtipo]}
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-mono font-semibold', colorText)}>{cuenta.codigo}</span>
            <span className="text-gray-900 dark:text-white">{cuenta.titulo}</span>
            {cuenta.subtipo && (
              <span className={cn('text-xs px-2 py-0.5 rounded-full', colorBg, colorText)}>
                {SUBTIPO_LABELS[cuenta.subtipo] || cuenta.subtipo}
              </span>
            )}
            {!cuenta.is_active && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Inactiva</span>
            )}
          </div>
          {cuenta.descripcion && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{cuenta.descripcion}</p>
          )}
          {/* Extended info preview */}
          {cuenta.subtipo === 'bancaria' && cuenta.bancaria && (
            <p className="text-xs text-gray-500 mt-0.5">
              {cuenta.bancaria.banco}
              {cuenta.bancaria.cbu && <span> - CBU: {cuenta.bancaria.cbu}</span>}
            </p>
          )}
          {cuenta.subtipo === 'efectivo' && cuenta.efectivo && (
            <p className="text-xs text-gray-500 mt-0.5">
              {cuenta.efectivo.moneda}{cuenta.efectivo.permite_arqueo ? ' - Permite arqueo' : ''}
            </p>
          )}
          {cuenta.subtipo === 'cobro_electronico' && cuenta.pagoElectronico && (
            <p className="text-xs text-gray-500 mt-0.5">
              {cuenta.pagoElectronico.proveedor}
              {cuenta.pagoElectronico.tipo_medio && <span> ({cuenta.pagoElectronico.tipo_medio})</span>}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {cuenta.saldo !== undefined && (
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(cuenta.saldo || 0)}
          </span>
        )}
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DETAIL DIALOG
// ============================================================================

function CuentaDetailDialog({
  cuenta,
  onClose,
}: {
  cuenta: CuentaContable | null
  onClose: () => void
}) {
  if (!cuenta) return null

  const tipoLabels: Record<string, string> = {
    activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio', ingreso: 'Ingreso', egreso: 'Egreso',
  }

  return (
    <Dialog open={!!cuenta} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono">{cuenta.codigo}</span>
            <span>{cuenta.titulo}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cuenta.saldo !== undefined && (
            <div className="text-center py-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Saldo</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(cuenta.saldo || 0)}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <DetailRow label="Tipo" value={
              <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 capitalize">
                {tipoLabels[cuenta.tipo] || cuenta.tipo}
              </span>
            } />
            {cuenta.subtipo && (
              <DetailRow label="Subtipo" value={SUBTIPO_LABELS[cuenta.subtipo] || cuenta.subtipo} />
            )}
            <DetailRow label="Estado" value={cuenta.is_active ? 'Activa' : 'Inactiva'} />
            {cuenta.grupo && <DetailRow label="Grupo" value={cuenta.grupo} />}
            {cuenta.descripcion && <DetailRow label="Descripción" value={cuenta.descripcion} />}

            {/* Extended info */}
            {cuenta.subtipo === 'bancaria' && cuenta.bancaria && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">Datos Bancarios</p>
                </div>
                <DetailRow label="Banco" value={cuenta.bancaria.banco} />
                {cuenta.bancaria.nro_cuenta && <DetailRow label="Nro Cuenta" value={cuenta.bancaria.nro_cuenta} />}
                {cuenta.bancaria.cbu && <DetailRow label="CBU" value={cuenta.bancaria.cbu} />}
                {cuenta.bancaria.alias && <DetailRow label="Alias" value={cuenta.bancaria.alias} />}
                {cuenta.bancaria.tipo_cuenta && <DetailRow label="Tipo" value={cuenta.bancaria.tipo_cuenta} />}
              </>
            )}
            {cuenta.subtipo === 'efectivo' && cuenta.efectivo && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">Datos Efectivo</p>
                </div>
                <DetailRow label="Moneda" value={cuenta.efectivo.moneda} />
                <DetailRow label="Permite Arqueo" value={cuenta.efectivo.permite_arqueo ? 'Sí' : 'No'} />
              </>
            )}
            {cuenta.subtipo === 'cobro_electronico' && cuenta.pagoElectronico && (
              <>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">Datos Pago Electrónico</p>
                </div>
                <DetailRow label="Proveedor" value={cuenta.pagoElectronico.proveedor} />
                {cuenta.pagoElectronico.tipo_medio && <DetailRow label="Tipo Medio" value={cuenta.pagoElectronico.tipo_medio} />}
                <DetailRow label="Plazo Acreditación" value={`${cuenta.pagoElectronico.plazo_acreditacion} días`} />
                <DetailRow label="Liquidación Diferida" value={cuenta.pagoElectronico.liquidacion_diferida ? 'Sí' : 'No'} />
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</span>
    </div>
  )
}

// ============================================================================
// ADD CUENTA DIALOG
// ============================================================================

function AddCuentaContableDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCuentaContableData) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [subtipo, setSubtipo] = useState<string>('none')
  const [formError, setFormError] = useState<string | null>(null)
  // Extended fields - Bancaria
  const [banco, setBanco] = useState('')
  const [nroCuenta, setNroCuenta] = useState('')
  const [cbu, setCbu] = useState('')
  const [alias, setAlias] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [tipoCuenta, setTipoCuenta] = useState<string>('none')
  // Extended fields - Efectivo
  const [sucursal, setSucursal] = useState('')
  const [responsable, setResponsable] = useState('')
  const [monedaEfectivo, setMonedaEfectivo] = useState('ARS')
  const [permiteArqueo, setPermiteArqueo] = useState(true)
  // Extended fields - Cobro Electrónico
  const [proveedor, setProveedor] = useState('')
  const [tipoMedio, setTipoMedio] = useState('')
  const [plazoAcreditacion, setPlazoAcreditacion] = useState(1)
  const [liquidacionDiferida, setLiquidacionDiferida] = useState(false)

  useEffect(() => {
    if (open) {
      setCodigo('')
      setTitulo('')
      setDescripcion('')
      setSubtipo('none')
      setFormError(null)
      setBanco('')
      setNroCuenta('')
      setCbu('')
      setAlias('')
      setMoneda('ARS')
      setTipoCuenta('none')
      setSucursal('')
      setResponsable('')
      setMonedaEfectivo('ARS')
      setPermiteArqueo(true)
      setProveedor('')
      setTipoMedio('')
      setPlazoAcreditacion(1)
      setLiquidacionDiferida(false)
    }
  }, [open])

  const derivedTipo = useMemo(() => {
    const first = codigo.charAt(0)
    const map: Record<string, string> = { '1': 'activo', '2': 'pasivo', '3': 'patrimonio', '4': 'ingreso', '5': 'egreso' }
    return map[first] || null
  }, [codigo])

  const hasExtended = subtipo === 'bancaria' || subtipo === 'efectivo' || subtipo === 'cobro_electronico'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!derivedTipo) return
    setFormError(null)
    setLoading(true)
    try {
      const data: CreateCuentaContableData = {
        codigo: Number(codigo),
        titulo,
        descripcion: descripcion || undefined,
        subtipo: subtipo !== 'none' ? subtipo : null,
      }
      // Extended fields
      if (subtipo === 'bancaria') {
        data.banco = banco
        data.nro_cuenta = nroCuenta || undefined
        data.cbu = cbu || undefined
        data.alias = alias || undefined
        data.moneda = moneda
        data.tipo_cuenta = tipoCuenta !== 'none' ? tipoCuenta : undefined
      } else if (subtipo === 'efectivo') {
        data.sucursal = sucursal || undefined
        data.responsable = responsable || undefined
        data.moneda = monedaEfectivo
        data.permite_arqueo = permiteArqueo
      } else if (subtipo === 'cobro_electronico') {
        data.proveedor = proveedor
        data.tipo_medio = tipoMedio || undefined
        data.plazo_acreditacion = plazoAcreditacion
        data.liquidacion_diferida = liquidacionDiferida
      }
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo crear la cuenta'
      setFormError(msg)
    } finally {
      setLoading(false)
    }
  }

  const tipoLabels: Record<string, string> = {
    activo: 'Activo', pasivo: 'Pasivo', patrimonio: 'Patrimonio', ingreso: 'Ingreso', egreso: 'Egreso',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('transition-all', hasExtended ? 'sm:max-w-[750px]' : 'sm:max-w-[500px]')}>
        <DialogHeader>
          <DialogTitle>Nueva Cuenta Contable</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className={cn(hasExtended ? 'grid grid-cols-2 gap-6' : 'space-y-4')}>
          {/* Left column: basic fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-codigo">Código *</Label>
              <Input
                id="add-codigo"
                inputMode="numeric"
                maxLength={4}
                value={codigo}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setCodigo(val)
                }}
                required
                disabled={loading}
                placeholder="Ej: 1101, 2101, 4101"
              />
              {codigo && (
                <p className={cn('text-sm mt-1', derivedTipo ? 'text-gray-600' : 'text-red-600 font-medium')}>
                  {derivedTipo
                    ? `Tipo: ${tipoLabels[derivedTipo]}`
                    : 'Código inválido: debe empezar con 1, 2, 3, 4 o 5'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="add-titulo">Título *</Label>
              <Input
                id="add-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                disabled={loading}
                placeholder="Nombre de la cuenta"
              />
            </div>

            <div>
              <Label htmlFor="add-descripcion">Descripción</Label>
              <Textarea
                id="add-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={loading}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="add-subtipo">Subtipo (para cuentas especializadas)</Label>
              <Select value={subtipo} onValueChange={setSubtipo} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin subtipo</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="bancaria">Bancaria</SelectItem>
                  <SelectItem value="cobro_electronico">Cobro Electrónico</SelectItem>
                  <SelectItem value="credito_cobrar">Crédito a Cobrar</SelectItem>
                  <SelectItem value="pasivo_liquidar">Pasivo a Liquidar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                {formError}
              </p>
            )}

            {!hasExtended && (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !derivedTipo || codigo.length !== 4}>
                  {loading ? 'Guardando...' : 'Crear Cuenta'}
                </Button>
              </div>
            )}
          </div>

          {/* Right column: extended fields */}
          {hasExtended && (
            <div className="space-y-4">
              {/* Bancaria */}
              {subtipo === 'bancaria' && (
                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Datos Bancarios</p>
                  <div>
                    <Label htmlFor="add-banco">Banco *</Label>
                    <Input id="add-banco" value={banco} onChange={(e) => setBanco(e.target.value)} required disabled={loading} placeholder="Ej: Banco Nación" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-nro-cuenta">Nro Cuenta</Label>
                      <Input id="add-nro-cuenta" value={nroCuenta} onChange={(e) => setNroCuenta(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="add-tipo-cuenta">Tipo Cuenta</Label>
                      <Select value={tipoCuenta} onValueChange={setTipoCuenta} disabled={loading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="caja_ahorro">Caja de Ahorro</SelectItem>
                          <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="add-cbu">CBU</Label>
                    <Input id="add-cbu" value={cbu} onChange={(e) => setCbu(e.target.value)} disabled={loading} placeholder="22 dígitos" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-alias">Alias</Label>
                      <Input id="add-alias" value={alias} onChange={(e) => setAlias(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="add-moneda">Moneda</Label>
                      <Input id="add-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                </div>
              )}

              {/* Efectivo */}
              {subtipo === 'efectivo' && (
                <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Datos Efectivo</p>
                  <div>
                    <Label htmlFor="add-moneda-ef">Moneda</Label>
                    <Input id="add-moneda-ef" value={monedaEfectivo} onChange={(e) => setMonedaEfectivo(e.target.value)} disabled={loading} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="add-permite-arqueo" type="checkbox" checked={permiteArqueo} onChange={(e) => setPermiteArqueo(e.target.checked)} disabled={loading} className="h-4 w-4" />
                    <Label htmlFor="add-permite-arqueo">Permite Arqueo</Label>
                  </div>
                </div>
              )}

              {/* Cobro Electrónico */}
              {subtipo === 'cobro_electronico' && (
                <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-400">Datos Cobro Electrónico</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-proveedor">Proveedor *</Label>
                      <Input id="add-proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} required disabled={loading} placeholder="Ej: MercadoPago" />
                    </div>
                    <div>
                      <Label htmlFor="add-tipo-medio">Tipo Medio</Label>
                      <Input id="add-tipo-medio" value={tipoMedio} onChange={(e) => setTipoMedio(e.target.value)} disabled={loading} placeholder="Ej: QR, Link" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="add-plazo">Plazo Acreditación (días)</Label>
                      <Input id="add-plazo" type="number" min={0} value={plazoAcreditacion} onChange={(e) => setPlazoAcreditacion(Number(e.target.value))} disabled={loading} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <input id="add-liq-diferida" type="checkbox" checked={liquidacionDiferida} onChange={(e) => setLiquidacionDiferida(e.target.checked)} disabled={loading} className="h-4 w-4" />
                      <Label htmlFor="add-liq-diferida">Liquidación Diferida</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || !derivedTipo || codigo.length !== 4}>
                  {loading ? 'Guardando...' : 'Crear Cuenta'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// EDIT CUENTA DIALOG
// ============================================================================

function EditCuentaContableDialog({
  open,
  onOpenChange,
  onSubmit,
  cuenta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UpdateCuentaContableData) => Promise<void>
  cuenta: CuentaContable | null
}) {
  const [loading, setLoading] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [subtipo, setSubtipo] = useState<string>('none')
  // Extended fields - Bancaria
  const [banco, setBanco] = useState('')
  const [nroCuenta, setNroCuenta] = useState('')
  const [cbu, setCbu] = useState('')
  const [alias, setAlias] = useState('')
  const [moneda, setMoneda] = useState('ARS')
  const [tipoCuenta, setTipoCuenta] = useState<string>('none')
  // Extended fields - Efectivo
  const [sucursal, setSucursal] = useState('')
  const [responsable, setResponsable] = useState('')
  const [monedaEfectivo, setMonedaEfectivo] = useState('ARS')
  const [permiteArqueo, setPermiteArqueo] = useState(true)
  // Extended fields - Cobro Electrónico
  const [proveedor, setProveedor] = useState('')
  const [tipoMedio, setTipoMedio] = useState('')
  const [plazoAcreditacion, setPlazoAcreditacion] = useState(1)
  const [liquidacionDiferida, setLiquidacionDiferida] = useState(false)

  useEffect(() => {
    if (cuenta) {
      setTitulo(cuenta.titulo)
      setDescripcion(cuenta.descripcion || '')
      setIsActive(cuenta.is_active)
      setSubtipo(cuenta.subtipo || 'none')
      // Load extended fields
      if (cuenta.bancaria) {
        setBanco(cuenta.bancaria.banco || '')
        setNroCuenta(cuenta.bancaria.nro_cuenta || '')
        setCbu(cuenta.bancaria.cbu || '')
        setAlias(cuenta.bancaria.alias || '')
        setMoneda(cuenta.bancaria.moneda || 'ARS')
        setTipoCuenta(cuenta.bancaria.tipo_cuenta || 'none')
      } else {
        setBanco(''); setNroCuenta(''); setCbu(''); setAlias(''); setMoneda('ARS'); setTipoCuenta('none')
      }
      if (cuenta.efectivo) {
        setSucursal(cuenta.efectivo.sucursal || '')
        setResponsable(cuenta.efectivo.responsable || '')
        setMonedaEfectivo(cuenta.efectivo.moneda || 'ARS')
        setPermiteArqueo(cuenta.efectivo.permite_arqueo ?? true)
      } else {
        setSucursal(''); setResponsable(''); setMonedaEfectivo('ARS'); setPermiteArqueo(true)
      }
      if (cuenta.pagoElectronico) {
        setProveedor(cuenta.pagoElectronico.proveedor || '')
        setTipoMedio(cuenta.pagoElectronico.tipo_medio || '')
        setPlazoAcreditacion(cuenta.pagoElectronico.plazo_acreditacion ?? 1)
        setLiquidacionDiferida(cuenta.pagoElectronico.liquidacion_diferida ?? false)
      } else {
        setProveedor(''); setTipoMedio(''); setPlazoAcreditacion(1); setLiquidacionDiferida(false)
      }
    }
  }, [cuenta])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data: UpdateCuentaContableData = {
        titulo,
        descripcion: descripcion || undefined,
        is_active: isActive,
        subtipo: subtipo !== 'none' ? subtipo : null,
      }
      // Extended fields
      if (subtipo === 'bancaria') {
        data.banco = banco
        data.nro_cuenta = nroCuenta || undefined
        data.cbu = cbu || undefined
        data.alias = alias || undefined
        data.moneda = moneda
        data.tipo_cuenta = tipoCuenta !== 'none' ? tipoCuenta : undefined
      } else if (subtipo === 'efectivo') {
        data.sucursal = sucursal || undefined
        data.responsable = responsable || undefined
        data.moneda = monedaEfectivo
        data.permite_arqueo = permiteArqueo
      } else if (subtipo === 'cobro_electronico') {
        data.proveedor = proveedor
        data.tipo_medio = tipoMedio || undefined
        data.plazo_acreditacion = plazoAcreditacion
        data.liquidacion_diferida = liquidacionDiferida
      }
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasExtended = subtipo === 'bancaria' || subtipo === 'efectivo' || subtipo === 'cobro_electronico'

  if (!cuenta) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('transition-all', hasExtended ? 'sm:max-w-[750px]' : 'sm:max-w-[500px]')}>
        <DialogHeader>
          <DialogTitle>Editar Cuenta {cuenta.codigo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className={cn(hasExtended ? 'grid grid-cols-2 gap-6' : 'space-y-4')}>
          {/* Left column: basic fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-titulo">Título *</Label>
              <Input
                id="edit-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="edit-descripcion">Descripción</Label>
              <Textarea
                id="edit-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={loading}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit-subtipo">Subtipo</Label>
              <Select value={subtipo} onValueChange={setSubtipo} disabled={loading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin subtipo</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="bancaria">Bancaria</SelectItem>
                  <SelectItem value="cobro_electronico">Cobro Electrónico</SelectItem>
                  <SelectItem value="credito_cobrar">Crédito a Cobrar</SelectItem>
                  <SelectItem value="pasivo_liquidar">Pasivo a Liquidar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-is-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-is-active">Cuenta activa</Label>
            </div>

            {!hasExtended && (
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar'}
                </Button>
              </div>
            )}
          </div>

          {/* Right column: extended fields */}
          {hasExtended && (
            <div className="space-y-4">
              {/* Bancaria */}
              {subtipo === 'bancaria' && (
                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Datos Bancarios</p>
                  <div>
                    <Label htmlFor="edit-banco">Banco *</Label>
                    <Input id="edit-banco" value={banco} onChange={(e) => setBanco(e.target.value)} required disabled={loading} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-nro-cuenta">Nro Cuenta</Label>
                      <Input id="edit-nro-cuenta" value={nroCuenta} onChange={(e) => setNroCuenta(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="edit-tipo-cuenta">Tipo Cuenta</Label>
                      <Select value={tipoCuenta} onValueChange={setTipoCuenta} disabled={loading}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="caja_ahorro">Caja de Ahorro</SelectItem>
                          <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-cbu">CBU</Label>
                    <Input id="edit-cbu" value={cbu} onChange={(e) => setCbu(e.target.value)} disabled={loading} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-alias">Alias</Label>
                      <Input id="edit-alias" value={alias} onChange={(e) => setAlias(e.target.value)} disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="edit-moneda">Moneda</Label>
                      <Input id="edit-moneda" value={moneda} onChange={(e) => setMoneda(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                </div>
              )}

              {/* Efectivo */}
              {subtipo === 'efectivo' && (
                <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">Datos Efectivo</p>
                  <div>
                    <Label htmlFor="edit-moneda-ef">Moneda</Label>
                    <Input id="edit-moneda-ef" value={monedaEfectivo} onChange={(e) => setMonedaEfectivo(e.target.value)} disabled={loading} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input id="edit-permite-arqueo" type="checkbox" checked={permiteArqueo} onChange={(e) => setPermiteArqueo(e.target.checked)} disabled={loading} className="h-4 w-4" />
                    <Label htmlFor="edit-permite-arqueo">Permite Arqueo</Label>
                  </div>
                </div>
              )}

              {/* Cobro Electrónico */}
              {subtipo === 'cobro_electronico' && (
                <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-400">Datos Cobro Electrónico</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-proveedor">Proveedor *</Label>
                      <Input id="edit-proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} required disabled={loading} />
                    </div>
                    <div>
                      <Label htmlFor="edit-tipo-medio">Tipo Medio</Label>
                      <Input id="edit-tipo-medio" value={tipoMedio} onChange={(e) => setTipoMedio(e.target.value)} disabled={loading} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-plazo">Plazo Acreditación (días)</Label>
                      <Input id="edit-plazo" type="number" min={0} value={plazoAcreditacion} onChange={(e) => setPlazoAcreditacion(Number(e.target.value))} disabled={loading} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <input id="edit-liq-diferida" type="checkbox" checked={liquidacionDiferida} onChange={(e) => setLiquidacionDiferida(e.target.checked)} disabled={loading} className="h-4 w-4" />
                      <Label htmlFor="edit-liq-diferida">Liquidación Diferida</Label>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Guardando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

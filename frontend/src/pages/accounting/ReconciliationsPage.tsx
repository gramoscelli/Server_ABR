import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddReconciliationDialog, ReconciliationFormData } from '@/components/cash/AddReconciliationDialog'
import * as accountingService from '@/lib/accountingService'
import type { CashReconciliation, CuentaContable } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterPeriod = 'month' | '3months' | '6months' | 'year' | 'all'

export default function ReconciliationsPage() {
  const navigate = useNavigate()
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([])
  const [cuentasEfectivo, setCuentasEfectivo] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('3months')
  const [filterCuenta, setFilterCuenta] = useState<string>('all')
  const [isAddReconciliationOpen, setIsAddReconciliationOpen] = useState(false)
  const [editingReconciliation, setEditingReconciliation] = useState<CashReconciliation | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchCuentasEfectivo()
  }, [navigate])

  useEffect(() => {
    fetchReconciliations()
  }, [selectedDate, filterPeriod, filterCuenta])

  const fetchCuentasEfectivo = async () => {
    try {
      const response = await accountingService.getCuentas({ subtipo: 'efectivo', is_active: true })
      setCuentasEfectivo(response.data || [])
    } catch (error) {
      console.error('Error fetching cuentas efectivo:', error)
    }
  }

  const getDateRange = () => {
    const today = new Date()
    let startDate: Date
    let endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    switch (filterPeriod) {
      case 'month':
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        break
      case '3months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)
        break
      case '6months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1)
        break
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1)
        break
      case 'all':
        startDate = new Date(2020, 0, 1)
        break
      default:
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    }

    return {
      start_date: startDate.toLocaleDateString('en-CA'),
      end_date: endDate.toLocaleDateString('en-CA'),
    }
  }

  const fetchReconciliations = async () => {
    try {
      setLoading(true)
      const dateRange = getDateRange()

      const response = await accountingService.getCashReconciliations({
        ...dateRange,
        id_cuenta: filterCuenta !== 'all' ? Number(filterCuenta) : undefined,
      })
      setReconciliations(response.data || response || [])
    } catch (error) {
      console.error('Error fetching reconciliations:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los arqueos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddReconciliation = async (data: ReconciliationFormData) => {
    try {
      await accountingService.createCashReconciliation({
        id_cuenta: data.id_cuenta,
        date: data.date,
        opening_balance: data.opening_balance,
        closing_balance: data.closing_balance,
        expected_balance: data.expected_balance,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Exito',
        description: 'Arqueo de caja creado correctamente',
      })

      fetchReconciliations()
    } catch (error) {
      console.error('Error creating reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el arqueo de caja',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleEditReconciliation = async (data: ReconciliationFormData) => {
    if (!editingReconciliation) return

    try {
      await accountingService.updateCashReconciliation(editingReconciliation.id, {
        closing_balance: data.closing_balance,
        notes: data.notes || undefined,
      })

      toast({
        title: 'Exito',
        description: 'Arqueo de caja actualizado correctamente',
      })

      setEditingReconciliation(null)
      fetchReconciliations()
    } catch (error) {
      console.error('Error updating reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el arqueo de caja',
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleDeleteReconciliation = async (id: number) => {
    if (!confirm('Esta seguro de eliminar este arqueo de caja?')) return

    try {
      await accountingService.deleteCashReconciliation(id)
      toast({
        title: 'Exito',
        description: 'Arqueo de caja eliminado correctamente',
      })
      fetchReconciliations()
    } catch (error) {
      console.error('Error deleting reconciliation:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el arqueo de caja',
        variant: 'destructive',
      })
    }
  }

  const navigateMonth = (direction: number) => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1))
  }

  // Group reconciliations by cuenta
  const groupedByCuenta = reconciliations.reduce((acc, rec) => {
    const cuentaName = rec.cuenta?.titulo || 'Sin cuenta'
    if (!acc[cuentaName]) {
      acc[cuentaName] = []
    }
    acc[cuentaName].push(rec)
    return acc
  }, {} as Record<string, CashReconciliation[]>)

  // Calculate statistics
  const stats = {
    total: reconciliations.length,
    balanced: reconciliations.filter(r =>
      Number(r.closing_balance) === Number(r.expected_balance)
    ).length,
    withDifference: reconciliations.filter(r =>
      Number(r.closing_balance) !== Number(r.expected_balance)
    ).length,
    totalDifference: reconciliations.reduce((sum, r) =>
      sum + (Number(r.closing_balance) - Number(r.expected_balance)), 0
    ),
  }

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case 'month': return monthYear
      case '3months': return 'Ultimos 3 meses'
      case '6months': return 'Ultimos 6 meses'
      case 'year': return 'Este anio'
      case 'all': return 'Todos los registros'
      default: return ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Arqueos de Caja</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {getPeriodLabel()} - {reconciliations.length} arqueos
          </p>
        </div>
        <Button
          className="bg-purple-600 hover:bg-purple-700 text-white"
          onClick={() => setIsAddReconciliationOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Arqueo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as FilterPeriod)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Un mes especifico</SelectItem>
            <SelectItem value="3months">Ultimos 3 meses</SelectItem>
            <SelectItem value="6months">Ultimos 6 meses</SelectItem>
            <SelectItem value="year">Este anio</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        {filterPeriod === 'month' && (
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-medium capitalize min-w-[140px] text-center">
              {monthYear}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth(1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Select value={filterCuenta} onValueChange={setFilterCuenta}>
          <SelectTrigger className="w-[200px]">
            <Wallet className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Cuenta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cuentas</SelectItem>
            {cuentasEfectivo.map(cuenta => (
              <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                {cuenta.codigo} - {cuenta.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statistics */}
      {reconciliations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <p className="text-xs text-gray-500">Total arqueos</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.balanced}</div>
              <p className="text-xs text-gray-500">Sin diferencias</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.withDifference}</div>
              <p className="text-xs text-gray-500">Con diferencias</p>
            </CardContent>
          </Card>
          <Card className={stats.totalDifference >= 0 ? 'border-green-200' : 'border-red-200'}>
            <CardContent className="pt-4">
              <div className={`text-2xl font-bold ${stats.totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalDifference >= 0 ? '+' : ''}${stats.totalDifference.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500">Diferencia total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reconciliations List */}
      {loading ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex items-center justify-center">
              <p className="text-gray-500">Cargando arqueos...</p>
            </div>
          </CardContent>
        </Card>
      ) : reconciliations.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Calculator className="h-10 w-10 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No hay arqueos de caja en este periodo</p>
              <p className="text-sm text-gray-400 mb-4">
                Proba cambiando el filtro de periodo o crea un nuevo arqueo
              </p>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setIsAddReconciliationOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Arqueo
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCuenta).map(([cuentaName, cuentaReconciliations]) => (
            <Card key={cuentaName}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-purple-600" />
                  {cuentaName}
                  <span className="text-sm font-normal text-gray-500">
                    ({cuentaReconciliations.length} arqueos)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cuentaReconciliations.map((reconciliation) => {
                    const opening = Number(reconciliation.opening_balance) || 0
                    const expected = Number(reconciliation.expected_balance) || 0
                    const closing = Number(reconciliation.closing_balance) || 0
                    const difference = closing - expected
                    const isBalanced = difference === 0

                    return (
                      <div
                        key={reconciliation.id}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          isBalanced
                            ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-800'
                            : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Date and Status */}
                            <div className="flex items-center gap-2 mb-3">
                              {isBalanced ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                              )}
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {reconciliation.date ? new Date(reconciliation.date + 'T00:00:00').toLocaleDateString('es-ES', {
                                  weekday: 'long',
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                }) : 'Sin fecha'}
                              </span>
                            </div>

                            {/* Balances Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                              <div>
                                <p className="text-xs text-gray-500">Apertura</p>
                                <p className="font-medium text-gray-700 dark:text-gray-300">${opening.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Esperado</p>
                                <p className="font-semibold text-gray-900 dark:text-white">${expected.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Real (contado)</p>
                                <p className="font-semibold text-gray-900 dark:text-white">${closing.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Diferencia</p>
                                <p className={`font-bold text-lg ${
                                  isBalanced
                                    ? 'text-green-600'
                                    : difference > 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Notes */}
                            {reconciliation.notes && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                "{reconciliation.notes}"
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReconciliation(reconciliation)}
                              className="h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReconciliation(reconciliation.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddReconciliationDialog
        open={isAddReconciliationOpen}
        onOpenChange={setIsAddReconciliationOpen}
        onSubmit={handleAddReconciliation}
      />
      <AddReconciliationDialog
        open={!!editingReconciliation}
        onOpenChange={(open) => !open && setEditingReconciliation(null)}
        onSubmit={handleEditReconciliation}
        reconciliation={editingReconciliation}
      />
    </div>
  )
}

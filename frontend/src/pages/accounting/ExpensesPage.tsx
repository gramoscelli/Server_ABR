import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PeriodFilter, PeriodFilterValue, createPeriodValue } from '@/components/ui/period-filter'
import {
  DollarSign,
  Plus,
  Filter,
  Download,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddOperationDialog, OperationFormData, OperationType } from '@/components/cash/AddOperationDialog'
import { accountingService } from '@/lib/accountingService'
import type { Expense, CategoryStat } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

interface PeriodStats {
  totalExpenses: number
  totalIncomes: number
  balance: number
  totalBalance: number
}

export default function ExpensesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PeriodStats>({
    totalExpenses: 0,
    totalIncomes: 0,
    balance: 0,
    totalBalance: 0,
  })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodFilterValue>(createPeriodValue('this_month'))
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogType, setAddDialogType] = useState<OperationType>('expense')

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchData()
  }, [navigate, period])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Build query params based on period filter
      const params: { start_date?: string; end_date?: string; limit: number } = { limit: 100 }

      if (period.range.start && period.range.end) {
        params.start_date = period.range.start.toISOString().split('T')[0]
        params.end_date = period.range.end.toISOString().split('T')[0]
      }

      // Fetch dashboard data for period stats
      const dashboardParams = params.start_date && params.end_date ? { start_date: params.start_date, end_date: params.end_date } : {}
      const [dashboardData, expensesResponse, categoryStatsData] = await Promise.all([
        accountingService.getDashboard(dashboardParams),
        accountingService.getExpenses(params),
        accountingService.getExpenseStatsByCategory(dashboardParams),
      ])

      console.log('Dashboard data:', dashboardData)
      console.log('Expenses response:', expensesResponse)
      console.log('Category stats:', categoryStatsData)

      // Update stats with safe parsing
      setStats({
        totalExpenses: Number(dashboardData.period.total_expenses || '0'),
        totalIncomes: Number(dashboardData.period.total_incomes || '0'),
        balance: Number(dashboardData.period.net_result || '0'),
        totalBalance: Number(dashboardData.balances.total || '0'),
      })

      setExpenses(expensesResponse.data || [])
      setCategoryStats(categoryStatsData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const periodLabel = period.label

  const openAddDialog = (type: OperationType) => {
    setAddDialogType(type)
    setAddDialogOpen(true)
  }

  const handleSubmitOperation = async (data: OperationFormData) => {
    try {
      if (addDialogType === 'income') {
        await accountingService.createIncome({
          amount: Number(data.amount),
          origin_plan_cta_id: data.origin_plan_cta_id,
          destination_plan_cta_id: data.destination_plan_cta_id,
          date: data.date,
          description: data.description || undefined,
        })
        toast({ title: 'Éxito', description: 'Ingreso registrado correctamente' })
      } else if (addDialogType === 'expense') {
        await accountingService.createExpense({
          amount: Number(data.amount),
          origin_plan_cta_id: data.origin_plan_cta_id,
          destination_plan_cta_id: data.destination_plan_cta_id,
          date: data.date,
          description: data.description || undefined,
        })
        toast({ title: 'Éxito', description: 'Egreso registrado correctamente' })
      } else {
        await accountingService.createTransfer({
          amount: Number(data.amount),
          origin_plan_cta_id: data.origin_plan_cta_id,
          destination_plan_cta_id: data.destination_plan_cta_id,
          transfer_type_id: data.transfer_type_id,
          date: data.date,
          description: data.description || undefined,
        })
        toast({ title: 'Éxito', description: 'Operación registrada correctamente' })
      }
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast({ title: 'Error', description: 'No se pudo registrar la operación', variant: 'destructive' })
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este egreso?')) return

    try {
      await accountingService.deleteExpense(id)
      toast({
        title: 'Éxito',
        description: 'Egreso eliminado correctamente',
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el egreso',
        variant: 'destructive',
      })
    }
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Egresos</h1>
              <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
            </div>
            <PeriodFilter
              value={period}
              onChange={setPeriod}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => openAddDialog('expense')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Egreso
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => openAddDialog('income')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ingreso
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => openAddDialog('transfer')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Otra operación
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts & Expenses List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expenses by Category Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Egresos por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">Cargando...</p>
                  </div>
                ) : categoryStats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                      <DollarSign className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No hay egresos disponibles en el periodo seleccionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryStats.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-4">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                            <span className="text-sm text-gray-600">
                              ${(Number(cat.total) || 0).toFixed(2)} ({cat.count})
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                backgroundColor: cat.color,
                                width: `${Math.min(((Number(cat.total) || 0) / (stats.totalExpenses || 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Egresos</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtrar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">Cargando...</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                      <DollarSign className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay egresos disponibles</p>
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => openAddDialog('expense')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Egreso
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {expense.description || 'Sin descripción'}
                            </p>
                          </div>
                          {expense.account && (
                            <p className="text-sm text-gray-500 mt-1">{expense.account.name}</p>
                          )}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-red-600">
                              -${(Number(expense.amount) || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {expense.date ? new Date(expense.date).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Sin fecha'}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Balance del Periodo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ingresos</span>
                  <span className="font-semibold text-green-600">
                    ${stats.totalIncomes.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Egresos</span>
                  <span className="font-semibold text-red-600">
                    ${stats.totalExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Balance</span>
                    <span
                      className={`font-bold text-lg ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      ${stats.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Balance Total de Cuentas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">
                    ${stats.totalBalance.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Suma de todas las cuentas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog */}
        <AddOperationDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          operationType={addDialogType}
          onSubmit={handleSubmitOperation}
        />
      </div>
  )
}

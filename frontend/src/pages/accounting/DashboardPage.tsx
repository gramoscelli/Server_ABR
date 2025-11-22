import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { MovementsCalendar } from '@/components/cash/MovementsCalendar'
import { accountingService } from '@/lib/accountingService'
import { toast } from '@/components/ui/use-toast'

interface CashStats {
  income: number
  expense: number
  balance: number
  cashAccount: number
  totalAvailable: number
  totalReal: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CashStats>({
    income: 0,
    expense: 0,
    balance: 0,
    cashAccount: 0,
    totalAvailable: 0,
    totalReal: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchStats()
  }, [navigate, selectedDate])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Get the start and end of the selected month
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch dashboard data
      const dashboardData = await accountingService.getDashboard({
        start_date: startDateStr,
        end_date: endDateStr
      })

      // Update stats with safe parsing
      setStats({
        income: Number(dashboardData.period.total_incomes || '0'),
        expense: Number(dashboardData.period.total_expenses || '0'),
        balance: Number(dashboardData.period.net_result || '0'),
        cashAccount: Number(dashboardData.balances.by_type.cash || '0'),
        totalAvailable: Number(dashboardData.balances.total || '0'),
        totalReal: Number(dashboardData.balances.total || '0'),
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currentMonthName = selectedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const handleAddIncome = async (data: IncomeFormData) => {
    try {
      await accountingService.createIncome({
        amount: Number(data.amount),
        account_id: data.account_id,
        category_id: data.category_id,
        date: data.date,
        description: data.description || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Ingreso registrado correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating income:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar el ingreso',
        variant: 'destructive',
      })
    }
  }

  const handleAddExpense = async (data: ExpenseFormData) => {
    try {
      await accountingService.createExpense({
        amount: Number(data.amount),
        account_id: data.account_id,
        category_id: data.category_id,
        date: data.date,
        description: data.description || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Egreso registrado correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar el egreso',
        variant: 'destructive',
      })
    }
  }

  const handleAddTransfer = async (data: TransferFormData) => {
    try {
      await accountingService.createTransfer({
        amount: Number(data.amount),
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        transfer_type_id: data.transfer_type_id,
        date: data.date,
        description: data.description || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Transferencia registrada correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar la transferencia',
        variant: 'destructive',
      })
    }
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
              Período: {currentMonthName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CompactDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white h-auto py-4"
            onClick={() => setIsAddIncomeOpen(true)}
          >
            <div className="flex items-center gap-3">
              <ArrowUpCircle className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Registrar Ingreso</div>
                <div className="text-xs opacity-90">Cobros, ventas, etc.</div>
              </div>
            </div>
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white h-auto py-4"
            onClick={() => setIsAddExpenseOpen(true)}
          >
            <div className="flex items-center gap-3">
              <ArrowDownCircle className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Registrar Egreso</div>
                <div className="text-xs opacity-90">Pagos, compras, etc.</div>
              </div>
            </div>
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-4"
            onClick={() => setIsAddTransferOpen(true)}
          >
            <div className="flex items-center gap-3">
              <Repeat className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Transferencia</div>
                <div className="text-xs opacity-90">Entre cuentas</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">
                Total Disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                $ {stats.totalAvailable.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Suma de todas las cuentas
              </p>
            </CardContent>
          </Card>

          {/* Period Income */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Ingresos del Período
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                $ {stats.income.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          {/* Period Expenses */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Egresos del Período
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                $ {stats.expense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          {/* Period Balance */}
          <Card className={`border-2 ${stats.balance >= 0 ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Resultado del Período
                </CardTitle>
                <DollarSign className={`h-4 w-4 ${stats.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                $ {stats.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Movements Calendar */}
          <div className="lg:col-span-1">
            <MovementsCalendar
              selectedDate={selectedDate}
              onDateSelect={(date) => {
                setSelectedDate(date)
              }}
            />
          </div>

          {/* Quick Access Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operations */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/operations')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span>Operaciones Recientes</span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ver el libro diario completo con todas las transacciones registradas
                </p>
              </CardContent>
            </Card>

            {/* Accounts */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/accounts')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span>Gestión de Cuentas</span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Administrar cuentas bancarias, efectivo y ver saldos actualizados
                </p>
              </CardContent>
            </Card>

            {/* Reports */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/reports')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span>Reportes Financieros</span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generar informes, balances y análisis financieros detallados
                </p>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/expenses')}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                  <span>Ver Egresos</span>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Listado detallado de todos los egresos registrados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <AddIncomeDialog
          open={isAddIncomeOpen}
          onOpenChange={setIsAddIncomeOpen}
          onSubmit={handleAddIncome}
        />
        <AddExpenseDialog
          open={isAddExpenseOpen}
          onOpenChange={setIsAddExpenseOpen}
          onSubmit={handleAddExpense}
        />
        <AddTransferDialog
          open={isAddTransferOpen}
          onOpenChange={setIsAddTransferOpen}
          onSubmit={handleAddTransfer}
        />
      </div>
  )
}

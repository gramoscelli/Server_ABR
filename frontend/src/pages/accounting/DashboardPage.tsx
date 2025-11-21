import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Plus,
  Info
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
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

      console.log('Dashboard data:', dashboardData)

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
        description: 'Ingreso creado correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating income:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el ingreso',
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
        description: 'Egreso creado correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el egreso',
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
        description: 'Transferencia creada correctamente',
      })

      fetchStats()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la transferencia',
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
              <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
              <p className="mt-1 text-sm text-gray-500 capitalize">{currentMonthName}</p>
            </div>
            <CompactDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setIsAddExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Egreso
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setIsAddIncomeOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ingreso
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white"
              onClick={() => setIsAddTransferOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Transferencia
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transactions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Egresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No hay egresos disponibles</p>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    onClick={() => setIsAddExpenseOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Egreso
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Incomes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <Wallet className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No hay ingresos disponibles</p>
                  <Button
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    onClick={() => setIsAddIncomeOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Ingreso
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bills */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Facturas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <Receipt className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-4">No hay facturas recientes disponibles</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ingresos</span>
                  <span className="font-semibold">ARS {stats.income.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Egresos</span>
                  <span className="font-semibold">ARS {stats.expense.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Balance</span>
                    <span className="font-bold text-lg">ARS {stats.balance.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accounts Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Cuentas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Efectivo</span>
                  <span className="font-semibold">ARS {stats.cashAccount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Total Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total Disponible</span>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="font-semibold">ARS {stats.totalAvailable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total Real</span>
                    <Info className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="font-semibold">ARS {stats.totalReal.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Budgets Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Presupuestos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay presupuestos configurados
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

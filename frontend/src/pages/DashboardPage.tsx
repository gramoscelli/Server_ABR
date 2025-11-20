import { AdminLayout } from '@/components/AdminLayout'
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
  }, [navigate])

  const fetchStats = async () => {
    try {
      // TODO: Implement API call to fetch cash statistics
      // For now, using mock data
      setStats({
        income: 0,
        expense: 0,
        balance: 0,
        cashAccount: 0,
        totalAvailable: 0,
        totalReal: 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentMonthName = selectedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const handleAddIncome = (data: IncomeFormData) => {
    console.log('New income:', data)
    // TODO: Implement API call to save income
    fetchStats()
  }

  const handleAddExpense = (data: ExpenseFormData) => {
    console.log('New expense:', data)
    // TODO: Implement API call to save expense
    fetchStats()
  }

  const handleAddTransfer = (data: TransferFormData) => {
    console.log('New transfer:', data)
    // TODO: Implement API call to save transfer
    fetchStats()
  }

  return (
    <AdminLayout>
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
    </AdminLayout>
  )
}

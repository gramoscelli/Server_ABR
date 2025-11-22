import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowLeftRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Banknote,
  Eye
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService, fetchWithAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { MovementsCalendar } from '@/components/cash/MovementsCalendar'

interface Account {
  id: number
  name: string
  type: 'cash' | 'bank' | 'other'
  current_balance: number
  currency: string
}

interface Movement {
  id: number
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  date: string
  category?: string
  fromAccount?: string
  toAccount?: string
}

interface MonthStats {
  totalIncome: number
  totalExpense: number
  balance: number
  incomeCount: number
  expenseCount: number
  transferCount: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [recentMovements, setRecentMovements] = useState<Movement[]>([])
  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeCount: 0,
    expenseCount: 0,
    transferCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchDashboardData()
  }, [navigate, selectedDate])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const year = selectedDate.getFullYear()
      const month = selectedDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      // Fetch all data in parallel
      const [accountsRes, expensesRes, incomesRes, transfersRes] = await Promise.all([
        fetchWithAuth('/api/accounting/accounts'),
        fetchWithAuth(`/api/accounting/expenses?start_date=${startDate}&end_date=${endDate}&limit=100`),
        fetchWithAuth(`/api/accounting/incomes?start_date=${startDate}&end_date=${endDate}&limit=100`),
        fetchWithAuth(`/api/accounting/transfers?start_date=${startDate}&end_date=${endDate}&limit=100`)
      ])

      // Process accounts
      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setAccounts(data.data || [])
      }

      // Process movements and calculate stats
      let totalIncome = 0
      let totalExpense = 0
      const movements: Movement[] = []

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        const expenses = data.data || []
        totalExpense = expenses.reduce((sum: number, e: { amount: number }) => sum + parseFloat(String(e.amount)), 0)
        expenses.forEach((e: { id: number; amount: number; description: string; date: string; category?: { name: string } }) => {
          movements.push({
            id: e.id,
            type: 'expense',
            amount: parseFloat(String(e.amount)),
            description: e.description || 'Sin descripción',
            date: e.date,
            category: e.category?.name
          })
        })
      }

      if (incomesRes.ok) {
        const data = await incomesRes.json()
        const incomes = data.data || []
        totalIncome = incomes.reduce((sum: number, i: { amount: number }) => sum + parseFloat(String(i.amount)), 0)
        incomes.forEach((i: { id: number; amount: number; description: string; date: string; category?: { name: string } }) => {
          movements.push({
            id: i.id,
            type: 'income',
            amount: parseFloat(String(i.amount)),
            description: i.description || 'Sin descripción',
            date: i.date,
            category: i.category?.name
          })
        })
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json()
        const transfers = data.data || []
        transfers.forEach((t: { id: number; amount: number; description: string; date: string; fromAccount?: { name: string }; toAccount?: { name: string } }) => {
          movements.push({
            id: t.id,
            type: 'transfer',
            amount: parseFloat(String(t.amount)),
            description: t.description || 'Transferencia',
            date: t.date,
            fromAccount: t.fromAccount?.name,
            toAccount: t.toAccount?.name
          })
        })
      }

      // Sort by date and take last 10
      movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setRecentMovements(movements.slice(0, 10))

      setMonthStats({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        incomeCount: movements.filter(m => m.type === 'income').length,
        expenseCount: movements.filter(m => m.type === 'expense').length,
        transferCount: movements.filter(m => m.type === 'transfer').length
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const totalAccountsBalance = accounts.reduce((sum, acc) => sum + parseFloat(String(acc.current_balance)), 0)

  const currentMonthName = selectedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const handleAddIncome = (data: IncomeFormData) => {
    console.log('New income:', data)
    fetchDashboardData()
  }

  const handleAddExpense = (data: ExpenseFormData) => {
    console.log('New expense:', data)
    fetchDashboardData()
  }

  const handleAddTransfer = (data: TransferFormData) => {
    console.log('New transfer:', data)
    fetchDashboardData()
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote className="h-4 w-4" />
      case 'bank': return <Building2 className="h-4 w-4" />
      default: return <Wallet className="h-4 w-4" />
    }
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'income': return <ArrowDownRight className="h-4 w-4 text-green-500" />
      case 'expense': return <ArrowUpRight className="h-4 w-4 text-red-500" />
      case 'transfer': return <ArrowLeftRight className="h-4 w-4 text-blue-500" />
      default: return null
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
            <p className="mt-1 text-sm text-gray-500 capitalize">{currentMonthName}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setIsAddExpenseOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Egreso
            </Button>
            <Button
              variant="outline"
              className="border-green-200 text-green-600 hover:bg-green-50"
              onClick={() => setIsAddIncomeOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ingreso
            </Button>
            <Button
              variant="outline"
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => setIsAddTransferOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Transferencia
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Balance */}
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-300">Saldo Total</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalAccountsBalance)}</p>
                  <p className="text-xs text-gray-400 mt-1">{accounts.length} cuenta(s)</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Income */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ingresos del Mes</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(monthStats.totalIncome)}</p>
                  <p className="text-xs text-gray-400 mt-1">{monthStats.incomeCount} movimiento(s)</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Expenses */}
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Egresos del Mes</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(monthStats.totalExpense)}</p>
                  <p className="text-xs text-gray-400 mt-1">{monthStats.expenseCount} movimiento(s)</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month Balance */}
          <Card className={`border-l-4 ${monthStats.balance >= 0 ? 'border-l-emerald-500' : 'border-l-orange-500'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Balance del Mes</p>
                  <p className={`text-2xl font-bold mt-1 ${monthStats.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {formatCurrency(monthStats.balance)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {monthStats.balance >= 0 ? 'Superávit' : 'Déficit'}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${monthStats.balance >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  {monthStats.balance >= 0
                    ? <TrendingUp className="h-6 w-6 text-emerald-600" />
                    : <TrendingDown className="h-6 w-6 text-orange-600" />
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar */}
            <MovementsCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {/* Recent Movements */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/cash/expenses')}>
                    <Eye className="h-4 w-4 mr-1" />
                    Ver todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No hay movimientos en este mes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentMovements.map((mov) => (
                      <div
                        key={`${mov.type}-${mov.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            mov.type === 'income' ? 'bg-green-100' :
                            mov.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            {getMovementIcon(mov.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{mov.description}</p>
                            <p className="text-xs text-gray-500">
                              {mov.type === 'transfer'
                                ? `${mov.fromAccount} → ${mov.toAccount}`
                                : mov.category || (mov.type === 'income' ? 'Ingreso' : 'Egreso')
                              }
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-sm ${
                            mov.type === 'income' ? 'text-green-600' :
                            mov.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {mov.type === 'income' ? '+' : mov.type === 'expense' ? '-' : ''}
                            {formatCurrency(mov.amount)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(mov.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Accounts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Cuentas</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/settings/accounts')}>
                    Gestionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No hay cuentas configuradas</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            account.type === 'cash' ? 'bg-green-100 text-green-600' :
                            account.type === 'bank' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getAccountIcon(account.type)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{account.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{account.type === 'cash' ? 'Efectivo' : account.type === 'bank' ? 'Banco' : 'Otro'}</p>
                          </div>
                        </div>
                        <p className={`font-semibold text-sm ${parseFloat(String(account.current_balance)) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                          {formatCurrency(parseFloat(String(account.current_balance)))}
                        </p>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="pt-3 border-t mt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-600">Total</span>
                        <span className="font-bold text-lg">{formatCurrency(totalAccountsBalance)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/cash/expenses')}
                >
                  <TrendingDown className="h-4 w-4 mr-2 text-red-500" />
                  Ver Egresos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/cash/incomes')}
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                  Ver Ingresos
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/cash/transfers')}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2 text-blue-500" />
                  Ver Transferencias
                </Button>
              </CardContent>
            </Card>

            {/* Month Summary */}
            <Card className="bg-gray-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumen del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Ingresos</span>
                    <span className="font-medium text-green-600">+{formatCurrency(monthStats.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Egresos</span>
                    <span className="font-medium text-red-600">-{formatCurrency(monthStats.totalExpense)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transferencias</span>
                    <span className="font-medium text-blue-600">{monthStats.transferCount} mov.</span>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="font-medium">Balance</span>
                      <span className={`font-bold ${monthStats.balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {formatCurrency(monthStats.balance)}
                      </span>
                    </div>
                  </div>
                </div>
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

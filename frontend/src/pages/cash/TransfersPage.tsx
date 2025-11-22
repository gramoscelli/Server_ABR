import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  ArrowLeftRight,
  Plus,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Info
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService, fetchWithAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { MovementsCalendar } from '@/components/cash/MovementsCalendar'

interface CashStats {
  income: number
  expense: number
  balance: number
  cashAccount: number
  totalAvailable: number
  totalReal: number
}

interface Transfer {
  id: number
  date: string
  fromAccount: string
  toAccount: string
  description: string
  amount: number
}

export default function TransfersPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CashStats>({
    income: 0,
    expense: 0,
    balance: 0,
    cashAccount: 3000000,
    totalAvailable: 3000000,
    totalReal: 3000000
  })
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)

  useEffect(() => {
    // Check if user has access (root or admin_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }

    fetchData()
  }, [navigate, selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Format selected date as YYYY-MM-DD for API
      const dateStr = selectedDate.toISOString().split('T')[0]

      // Fetch transfers for the selected day
      const transfersResponse = await fetchWithAuth(
        `/api/accounting/transfers?start_date=${dateStr}&end_date=${dateStr}`
      )

      if (transfersResponse.ok) {
        const transfersData = await transfersResponse.json()
        // Backend returns 'data' array with 'fromAccount'/'toAccount' aliases (camelCase)
        const formattedTransfers = transfersData.data?.map((tr: { id: number; date: string; fromAccount?: { name: string }; toAccount?: { name: string }; description: string; amount: number }) => ({
          id: tr.id,
          date: tr.date,
          fromAccount: tr.fromAccount?.name || 'Cuenta origen',
          toAccount: tr.toAccount?.name || 'Cuenta destino',
          description: tr.description || 'Sin descripción',
          amount: parseFloat(String(tr.amount))
        })) || []
        setTransfers(formattedTransfers)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const handleAddTransfer = (data: TransferFormData) => {
    console.log('New transfer:', data)
    // TODO: Implement API call to save transfer
    // After successful save, refresh the transfers list
    fetchData()
  }

  const handleAddIncome = (data: IncomeFormData) => {
    console.log('New income:', data)
    // TODO: Implement API call to save income
    fetchData()
  }

  const handleAddExpense = (data: ExpenseFormData) => {
    console.log('New expense:', data)
    // TODO: Implement API call to save expense
    fetchData()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transferencias</h1>
              <p className="mt-1 text-sm text-gray-500 capitalize">{monthYear}</p>
            </div>
            <CompactDatePicker
              value={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
          <div className="flex gap-2">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Transferencia Recurrente
            </Button>
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transfers List */}
          <div className="lg:col-span-2 space-y-6">

            {/* Movements Calendar */}
            <MovementsCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {/* Transfers List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Transferencias</CardTitle>
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
                {transfers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gray-200 flex items-center justify-center mb-4">
                      <ArrowLeftRight className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No hay transferencias disponibles para el periodo seleccionado</p>
                    <Button
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => setIsAddTransferOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Transferencia
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{transfer.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{transfer.fromAccount}</span>
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>{transfer.toAccount}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">ARS {transfer.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{transfer.date}</p>
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
        <AddTransferDialog
          open={isAddTransferOpen}
          onOpenChange={setIsAddTransferOpen}
          onSubmit={handleAddTransfer}
        />
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
      </div>
    </AdminLayout>
  )
}

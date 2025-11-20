import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  ArrowLeftRight,
  Plus,
  Filter,
  Download,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { accountingService } from '@/lib/accountingService'
import type { Transfer } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'

interface PeriodStats {
  totalExpenses: number
  totalIncomes: number
  balance: number
  totalBalance: number
}

export default function TransfersPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<PeriodStats>({
    totalExpenses: 0,
    totalIncomes: 0,
    balance: 0,
    totalBalance: 0,
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
    try {
      setLoading(true)

      // Get the start and end of the selected month
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch dashboard data for period stats
      const [dashboardData, transfersResponse] = await Promise.all([
        accountingService.getDashboard({ start_date: startDateStr, end_date: endDateStr }),
        accountingService.getTransfers({ start_date: startDateStr, end_date: endDateStr, limit: 100 }),
      ])

      console.log('Dashboard data:', dashboardData)
      console.log('Transfers response:', transfersResponse)

      // Update stats with safe parsing
      setStats({
        totalExpenses: parseFloat(dashboardData.period.total_expenses || '0'),
        totalIncomes: parseFloat(dashboardData.period.total_incomes || '0'),
        balance: parseFloat(dashboardData.period.net_result || '0'),
        totalBalance: parseFloat(dashboardData.balances.total || '0'),
      })

      setTransfers(transfersResponse.data || [])
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

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const handleAddTransfer = async (data: TransferFormData) => {
    try {
      await accountingService.createTransfer({
        amount: parseFloat(data.amount),
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

      fetchData()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear la transferencia',
        variant: 'destructive',
      })
    }
  }

  const handleAddIncome = async (data: IncomeFormData) => {
    try {
      await accountingService.createIncome({
        amount: parseFloat(data.amount),
        account_id: data.account_id,
        category_id: data.category_id,
        date: data.date,
        description: data.description || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Ingreso creado correctamente',
      })

      fetchData()
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
        amount: parseFloat(data.amount),
        account_id: data.account_id,
        category_id: data.category_id,
        date: data.date,
        description: data.description || undefined,
      })

      toast({
        title: 'Éxito',
        description: 'Egreso creado correctamente',
      })

      fetchData()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast({
        title: 'Error',
        description: 'No se pudo crear el egreso',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteTransfer = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta transferencia?')) return

    try {
      await accountingService.deleteTransfer(id)
      toast({
        title: 'Éxito',
        description: 'Transferencia eliminada correctamente',
      })
      fetchData()
    } catch (error) {
      console.error('Error deleting transfer:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la transferencia',
        variant: 'destructive',
      })
    }
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
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <p className="text-gray-500">Cargando...</p>
                  </div>
                ) : transfers.length === 0 ? (
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
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {transfer.description || 'Sin descripción'}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>{transfer.fromAccount?.name || 'Cuenta origen'}</span>
                            <ArrowLeftRight className="h-3 w-3" />
                            <span>{transfer.toAccount?.name || 'Cuenta destino'}</span>
                            {transfer.transferType && (
                              <>
                                <span className="text-gray-400">•</span>
                                <span>{transfer.transferType.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-semibold text-gray-900">
                              ${transfer.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(transfer.date).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransfer(transfer.id)}
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

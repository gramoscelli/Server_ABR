import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  Plus,
  Filter,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  Search,
  Calendar,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { accountingService } from '@/lib/accountingService'
import type { Income, Expense, Transfer } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Operation {
  id: number
  date: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  categoryId?: number | null
  accountId?: number
  fromAccountId?: number
  toAccountId?: number
  description?: string | null
}

export default function OperationsPage() {
  const navigate = useNavigate()
  const [operations, setOperations] = useState<Operation[]>([])
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterType, setFilterType] = useState<string>('all')
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

    fetchOperations()
  }, [navigate, selectedDate])

  useEffect(() => {
    // Filter operations when filter type changes
    if (filterType === 'all') {
      setFilteredOperations(operations)
    } else {
      setFilteredOperations(operations.filter(op => op.type === filterType))
    }
  }, [filterType, operations])

  const fetchOperations = async () => {
    try {
      setLoading(true)

      // Get the start and end of the selected month
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // Fetch all data in parallel
      const [incomesResponse, expensesResponse, transfersResponse] = await Promise.all([
        accountingService.getIncomes({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
        accountingService.getExpenses({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
        accountingService.getTransfers({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
      ])

      // Combine all operations
      const allOperations: Operation[] = [
        ...(incomesResponse.data || []).map((income: Income) => ({
          id: income.id,
          date: income.date,
          type: 'income' as const,
          amount: Number(income.amount),
          categoryId: income.category_id,
          accountId: income.account_id,
          description: income.description || null,
        })),
        ...(expensesResponse.data || []).map((expense: Expense) => ({
          id: expense.id,
          date: expense.date,
          type: 'expense' as const,
          amount: Number(expense.amount),
          categoryId: expense.category_id,
          accountId: expense.account_id,
          description: expense.description || null,
        })),
        ...(transfersResponse.data || []).map((transfer: Transfer) => ({
          id: transfer.id,
          date: transfer.date,
          type: 'transfer' as const,
          amount: Number(transfer.amount),
          fromAccountId: transfer.from_account_id,
          toAccountId: transfer.to_account_id,
          description: transfer.description || null,
        })),
      ]

      // Sort by date descending
      allOperations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setOperations(allOperations)
    } catch (error) {
      console.error('Error fetching operations:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las operaciones',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

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

      fetchOperations()
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

      fetchOperations()
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

      fetchOperations()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast({
        title: 'Error',
        description: 'No se pudo registrar la transferencia',
        variant: 'destructive',
      })
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'expense':
        return <ArrowDownCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
      case 'transfer':
        return <Repeat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      default:
        return null
    }
  }

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'income':
        return 'Ingreso'
      case 'expense':
        return 'Egreso'
      case 'transfer':
        return 'Transferencia'
      default:
        return ''
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const totals = {
    income: operations.filter(op => op.type === 'income').reduce((sum, op) => sum + op.amount, 0),
    expense: operations.filter(op => op.type === 'expense').reduce((sum, op) => sum + op.amount, 0),
    transfer: operations.filter(op => op.type === 'transfer').reduce((sum, op) => sum + op.amount, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Libro Diario</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            {monthYear} • {filteredOperations.length} operaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CompactDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Quick Actions & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setIsAddIncomeOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ingreso
          </Button>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setIsAddExpenseOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Egreso
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setIsAddTransferOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Transferencia
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las operaciones</SelectItem>
              <SelectItem value="income">Solo ingresos</SelectItem>
              <SelectItem value="expense">Solo egresos</SelectItem>
              <SelectItem value="transfer">Solo transferencias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              $ {totals.income.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {operations.filter(op => op.type === 'income').length} operaciones
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              $ {totals.expense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {operations.filter(op => op.type === 'expense').length} operaciones
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Transferencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              $ {totals.transfer.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {operations.filter(op => op.type === 'transfer').length} operaciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operations List */}
      <Card>
        <CardHeader>
          <CardTitle>Registros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando operaciones...
            </div>
          ) : filteredOperations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No hay operaciones registradas en este período
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Comienza registrando un ingreso, egreso o transferencia
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOperations.map((operation) => (
                <div
                  key={`${operation.type}-${operation.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div>{getOperationIcon(operation.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {getOperationLabel(operation.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {operation.description && (
                          <span>{operation.description}</span>
                        )}
                        {!operation.description && (
                          <span className="text-gray-400 italic">Sin descripción</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatDate(operation.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${
                        operation.type === 'income'
                          ? 'text-green-600 dark:text-green-400'
                          : operation.type === 'expense'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {operation.type === 'expense' && '-'}
                      $ {operation.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

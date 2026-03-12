import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat,
  Calendar,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddOperationDialog, OperationFormData, OperationType } from '@/components/cash/AddOperationDialog'
import { accountingService } from '@/lib/accountingService'
import type { Income, Expense, Transfer, PlanDeCuentas } from '@/types/accounting'
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
  description?: string | null
  originPlanCta?: PlanDeCuentas | null
  destinationPlanCta?: PlanDeCuentas | null
  transferTypeName?: string | null
  transferTypeColor?: string | null
  raw: Income | Expense | Transfer
}

export default function OperationsPage() {
  const navigate = useNavigate()
  const [operations, setOperations] = useState<Operation[]>([])
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filterType, setFilterType] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogType, setAddDialogType] = useState<OperationType>('income')
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
      return
    }
    fetchOperations()
  }, [navigate, selectedDate])

  useEffect(() => {
    if (filterType === 'all') {
      setFilteredOperations(operations)
    } else {
      setFilteredOperations(operations.filter(op => op.type === filterType))
    }
  }, [filterType, operations])

  const fetchOperations = async () => {
    try {
      setLoading(true)
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      const [incomesResponse, expensesResponse, transfersResponse] = await Promise.all([
        accountingService.getIncomes({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
        accountingService.getExpenses({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
        accountingService.getTransfers({ start_date: startDateStr, end_date: endDateStr, limit: 1000 }),
      ])

      const allOperations: Operation[] = [
        ...(incomesResponse.data || []).map((income: Income) => ({
          id: income.id,
          date: income.date,
          type: 'income' as const,
          amount: Number(income.amount),
          description: income.description || null,
          originPlanCta: income.originPlanCta || null,
          destinationPlanCta: income.destinationPlanCta || null,
          raw: income,
        })),
        ...(expensesResponse.data || []).map((expense: Expense) => ({
          id: expense.id,
          date: expense.date,
          type: 'expense' as const,
          amount: Number(expense.amount),
          description: expense.description || null,
          originPlanCta: expense.originPlanCta || null,
          destinationPlanCta: expense.destinationPlanCta || null,
          raw: expense,
        })),
        ...(transfersResponse.data || []).map((transfer: Transfer) => ({
          id: transfer.id,
          date: transfer.date,
          type: 'transfer' as const,
          amount: Number(transfer.amount),
          description: transfer.description || null,
          originPlanCta: transfer.originPlanCta || null,
          destinationPlanCta: transfer.destinationPlanCta || null,
          transferTypeName: transfer.transferType?.name || null,
          transferTypeColor: transfer.transferType?.color || null,
          raw: transfer,
        })),
      ]

      allOperations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setOperations(allOperations)
    } catch (error) {
      console.error('Error fetching operations:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar las operaciones', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

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
      fetchOperations()
    } catch (error) {
      console.error('Error creating operation:', error)
      toast({ title: 'Error', description: 'No se pudo registrar la operación', variant: 'destructive' })
    }
  }

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'income': return <ArrowUpCircle className="h-5 w-5 text-green-600" />
      case 'expense': return <ArrowDownCircle className="h-5 w-5 text-red-600" />
      case 'transfer': return <Repeat className="h-5 w-5 text-blue-600" />
      default: return null
    }
  }

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'income': return 'Ingreso'
      case 'expense': return 'Egreso'
      case 'transfer': return 'Otra operación'
      default: return ''
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const getPlanCtaSummary = (op: Operation) => {
    const parts: string[] = []
    if (op.originPlanCta) {
      const acct = op.originPlanCta.accounts?.[0]
      parts.push(acct ? acct.name : op.originPlanCta.nombre)
    }
    if (op.destinationPlanCta) {
      const acct = op.destinationPlanCta.accounts?.[0]
      parts.push(acct ? acct.name : op.destinationPlanCta.nombre)
    }
    return parts.length === 2 ? `${parts[0]} → ${parts[1]}` : parts[0] || null
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
          <h1 className="text-3xl font-bold text-gray-900">Libro Diario</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">
            {monthYear} &bull; {filteredOperations.length} operaciones
          </p>
        </div>
        <CompactDatePicker value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Quick Actions & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-1">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openAddDialog('income')}>
            <Plus className="h-4 w-4 mr-1" /> Ingreso
          </Button>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openAddDialog('expense')}>
            <Plus className="h-4 w-4 mr-1" /> Egreso
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openAddDialog('transfer')}>
            <Plus className="h-4 w-4 mr-1" /> Otra operación
          </Button>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las operaciones</SelectItem>
            <SelectItem value="income">Solo ingresos</SelectItem>
            <SelectItem value="expense">Solo egresos</SelectItem>
            <SelectItem value="transfer">Solo otras operaciones</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              $ {totals.income.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {operations.filter(op => op.type === 'income').length} operaciones
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              $ {totals.expense.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {operations.filter(op => op.type === 'expense').length} operaciones
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Otras Operaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              $ {totals.transfer.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
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
            <div className="text-center py-8 text-gray-500">Cargando operaciones...</div>
          ) : filteredOperations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay operaciones registradas en este período</p>
              <p className="text-sm text-gray-400 mt-1">Comienza registrando un ingreso, egreso u otra operación</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOperations.map((operation) => (
                <div
                  key={`${operation.type}-${operation.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOperation(operation)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="shrink-0">{getOperationIcon(operation.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{getOperationLabel(operation.type)}</span>
                        {operation.transferTypeName && (
                          <span className="text-xs px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: operation.transferTypeColor || '#6b7280' }}>
                            {operation.transferTypeName}
                          </span>
                        )}
                      </div>
                      {operation.description && (
                        <p className="text-sm text-gray-600 mt-0.5 truncate">{operation.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatDate(operation.date)}</span>
                        {getPlanCtaSummary(operation) && (
                          <>
                            <span className="text-gray-300">&bull;</span>
                            <span className="truncate">{getPlanCtaSummary(operation)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className={`text-lg font-bold ${
                      operation.type === 'income' ? 'text-green-600'
                        : operation.type === 'expense' ? 'text-red-600'
                        : 'text-blue-600'
                    }`}>
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

      {/* Detail Dialog */}
      <OperationDetailDialog
        operation={selectedOperation}
        onClose={() => setSelectedOperation(null)}
        formatDateTime={formatDateTime}
        getOperationLabel={getOperationLabel}
      />

      {/* Add Operation Dialog */}
      <AddOperationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        operationType={addDialogType}
        onSubmit={handleSubmitOperation}
      />
    </div>
  )
}

function formatPlanCtaDetail(planCta: PlanDeCuentas | null | undefined): React.ReactNode {
  if (!planCta) return <span className="text-gray-400 italic">No especificado</span>
  const account = planCta.accounts?.[0]
  return (
    <span>
      {planCta.codigo} - {planCta.nombre}
      {account && <span className="text-gray-500"> ({account.name})</span>}
    </span>
  )
}

function OperationDetailDialog({
  operation,
  onClose,
  formatDateTime,
  getOperationLabel,
}: {
  operation: Operation | null
  onClose: () => void
  formatDateTime: (d: string) => string
  getOperationLabel: (t: string) => string
}) {
  if (!operation) return null

  const raw = operation.raw
  const transfer = operation.type === 'transfer' ? (raw as Transfer) : null

  const colorClass =
    operation.type === 'income' ? 'text-green-600'
      : operation.type === 'expense' ? 'text-red-600'
      : 'text-blue-600'

  return (
    <Dialog open={!!operation} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {operation.type === 'income' && <ArrowUpCircle className="h-5 w-5 text-green-600" />}
            {operation.type === 'expense' && <ArrowDownCircle className="h-5 w-5 text-red-600" />}
            {operation.type === 'transfer' && <Repeat className="h-5 w-5 text-blue-600" />}
            {getOperationLabel(operation.type)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center py-3 bg-gray-50 rounded-lg">
            <p className={`text-3xl font-bold ${colorClass}`}>
              {operation.type === 'expense' && '-'}
              $ {operation.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-3">
            <DetailRow label="Fecha" value={formatDateTime(operation.date)} />
            <DetailRow label="Origen" value={formatPlanCtaDetail(operation.originPlanCta)} />
            <DetailRow label="Destino" value={formatPlanCtaDetail(operation.destinationPlanCta)} />

            {transfer?.transferType && (
              <DetailRow
                label="Tipo de operación"
                value={
                  <span className="text-xs px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: transfer.transferType.color || '#6b7280' }}>
                    {transfer.transferType.name}
                  </span>
                }
              />
            )}

            <DetailRow
              label="Descripción"
              value={operation.description || <span className="text-gray-400 italic">Sin descripción</span>}
            />
            <DetailRow label="Fecha de registro" value={formatDateTime(raw.created_at)} />
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
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

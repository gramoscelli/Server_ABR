import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddIncomeDialog, IncomeFormData } from '@/components/cash/AddIncomeDialog'
import { AddExpenseDialog, ExpenseFormData } from '@/components/cash/AddExpenseDialog'
import { AddTransferDialog, TransferFormData } from '@/components/cash/AddTransferDialog'
import { accountingService } from '@/lib/accountingService'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'day' | 'week' | 'month' | 'custom'

interface DateRange {
  start: Date
  end: Date
}

interface CashStats {
  income: number
  expense: number
  balance: number
  totalAvailable: number
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount)
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isInRange(date: Date, range: DateRange): boolean {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate())
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate())
  return d >= start && d <= end
}

function getWeekRange(date: Date): DateRange {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1 // Monday is first day
  const start = new Date(d)
  start.setDate(d.getDate() - diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

function getMonthRange(date: Date): DateRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return { start, end }
}

function getDayRange(date: Date): DateRange {
  return { start: date, end: date }
}

// ============================================================================
// PERIOD LABEL
// ============================================================================

function getPeriodLabel(mode: ViewMode, range: DateRange): string {
  switch (mode) {
    case 'day':
      return formatDisplayDate(range.start)
    case 'week': {
      const startStr = range.start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      const endStr = range.end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      return `Semana: ${startStr} - ${endStr}`
    }
    case 'month':
      return `${MONTH_NAMES[range.start.getMonth()]} ${range.start.getFullYear()}`
    case 'custom': {
      const startStr = formatDisplayDate(range.start)
      const endStr = formatDisplayDate(range.end)
      return `${startStr} - ${endStr}`
    }
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedRange, setSelectedRange] = useState<DateRange>(() => getMonthRange(today))
  const [calendarMonth, setCalendarMonth] = useState(today)
  const [customStartInput, setCustomStartInput] = useState('')
  const [customEndInput, setCustomEndInput] = useState('')
  const [showCustomPicker, setShowCustomPicker] = useState(false)

  const [stats, setStats] = useState<CashStats>({
    income: 0,
    expense: 0,
    balance: 0,
    totalAvailable: 0
  })
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddTransferOpen, setIsAddTransferOpen] = useState(false)

  // Check access
  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
    }
  }, [navigate])

  // Fetch stats when range changes
  useEffect(() => {
    fetchStats()
  }, [selectedRange])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const params = {
        start_date: formatDate(selectedRange.start),
        end_date: formatDate(selectedRange.end)
      }
      const dashboardData = await accountingService.getDashboard(params)
      setStats({
        income: Number(dashboardData.period.total_incomes || '0'),
        expense: Number(dashboardData.period.total_expenses || '0'),
        balance: Number(dashboardData.period.net_result || '0'),
        totalAvailable: Number(dashboardData.balances.total || '0'),
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

  // ============================================================================
  // PERIOD SELECTION HANDLERS
  // ============================================================================

  const selectDay = (date: Date) => {
    setViewMode('day')
    setSelectedRange(getDayRange(date))
  }

  const selectWeek = (date: Date) => {
    setViewMode('week')
    setSelectedRange(getWeekRange(date))
  }

  const selectMonth = (date: Date) => {
    setViewMode('month')
    setSelectedRange(getMonthRange(date))
    setCalendarMonth(date)
  }

  const selectCustomRange = () => {
    if (customStartInput && customEndInput) {
      const start = new Date(customStartInput)
      const end = new Date(customEndInput)
      if (start <= end) {
        setViewMode('custom')
        setSelectedRange({ start, end })
        setShowCustomPicker(false)
      }
    }
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1

    switch (viewMode) {
      case 'day': {
        const newDate = new Date(selectedRange.start)
        newDate.setDate(newDate.getDate() + delta)
        setSelectedRange(getDayRange(newDate))
        // Update calendar month if needed
        if (newDate.getMonth() !== calendarMonth.getMonth()) {
          setCalendarMonth(newDate)
        }
        break
      }
      case 'week': {
        const newStart = new Date(selectedRange.start)
        newStart.setDate(newStart.getDate() + (delta * 7))
        setSelectedRange(getWeekRange(newStart))
        if (newStart.getMonth() !== calendarMonth.getMonth()) {
          setCalendarMonth(newStart)
        }
        break
      }
      case 'month': {
        const newDate = new Date(calendarMonth)
        newDate.setMonth(newDate.getMonth() + delta)
        setCalendarMonth(newDate)
        setSelectedRange(getMonthRange(newDate))
        break
      }
      case 'custom': {
        // For custom, navigate by the same duration
        const duration = selectedRange.end.getTime() - selectedRange.start.getTime()
        const newStart = new Date(selectedRange.start.getTime() + (delta * duration) + (delta * 24 * 60 * 60 * 1000))
        const newEnd = new Date(newStart.getTime() + duration)
        setSelectedRange({ start: newStart, end: newEnd })
        break
      }
    }
  }

  const goToToday = () => {
    setCalendarMonth(today)
    selectMonth(today)
  }

  // ============================================================================
  // CALENDAR GENERATION
  // ============================================================================

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const daysInMonth = lastDay.getDate()

    const days: Array<{ date: Date | null; dayNum: number }> = []

    // Empty slots for days before first of month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, dayNum: 0 })
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), dayNum: day })
    }

    return days
  }, [calendarMonth])

  // ============================================================================
  // TRANSACTION HANDLERS
  // ============================================================================

  const handleAddIncome = async (data: IncomeFormData) => {
    try {
      await accountingService.createIncome({
        amount: Number(data.amount),
        account_id: data.account_id,
        category_id: data.category_id,
        date: data.date,
        description: data.description || undefined,
      })
      toast({ title: 'Éxito', description: 'Ingreso registrado correctamente' })
      fetchStats()
    } catch (error) {
      console.error('Error creating income:', error)
      toast({ title: 'Error', description: 'No se pudo registrar el ingreso', variant: 'destructive' })
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
      toast({ title: 'Éxito', description: 'Egreso registrado correctamente' })
      fetchStats()
    } catch (error) {
      console.error('Error creating expense:', error)
      toast({ title: 'Error', description: 'No se pudo registrar el egreso', variant: 'destructive' })
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
      toast({ title: 'Éxito', description: 'Transferencia registrada correctamente' })
      fetchStats()
    } catch (error) {
      console.error('Error creating transfer:', error)
      toast({ title: 'Error', description: 'No se pudo registrar la transferencia', variant: 'destructive' })
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {getPeriodLabel(viewMode, selectedRange)}
          </p>
        </div>
      </div>

      {/* Main Layout: Calendar + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Period Selector Card */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Seleccionar Período
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View Mode Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {[
                { mode: 'day' as ViewMode, label: 'Día' },
                { mode: 'week' as ViewMode, label: 'Semana' },
                { mode: 'month' as ViewMode, label: 'Mes' },
                { mode: 'custom' as ViewMode, label: 'Rango' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    if (mode === 'custom') {
                      setShowCustomPicker(true)
                    } else if (mode === 'day') {
                      selectDay(selectedRange.start)
                    } else if (mode === 'week') {
                      selectWeek(selectedRange.start)
                    } else {
                      selectMonth(calendarMonth)
                    }
                  }}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Range Picker */}
            {showCustomPicker && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                    <input
                      type="date"
                      value={customStartInput}
                      onChange={(e) => setCustomStartInput(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                    <input
                      type="date"
                      value={customEndInput}
                      onChange={(e) => setCustomEndInput(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowCustomPicker(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={selectCustomRange}
                    disabled={!customStartInput || !customEndInput}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePeriod('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => selectMonth(calendarMonth)}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigatePeriod('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 h-6 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, idx) => {
                  if (!dayObj.date) {
                    return <div key={idx} className="h-9" />
                  }

                  const isToday = isSameDay(dayObj.date, today)
                  const isSelected = isInRange(dayObj.date, selectedRange)
                  const isRangeStart = isSameDay(dayObj.date, selectedRange.start)
                  const isRangeEnd = isSameDay(dayObj.date, selectedRange.end)

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (viewMode === 'day') {
                          selectDay(dayObj.date!)
                        } else if (viewMode === 'week') {
                          selectWeek(dayObj.date!)
                        } else if (viewMode === 'month') {
                          selectDay(dayObj.date!)
                        } else {
                          selectDay(dayObj.date!)
                        }
                      }}
                      className={cn(
                        'h-9 w-full text-sm font-medium rounded transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isToday
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                        isSelected && !isRangeStart && !isRangeEnd && viewMode !== 'day' && 'rounded-none',
                        isSelected && isRangeStart && viewMode !== 'day' && 'rounded-r-none',
                        isSelected && isRangeEnd && viewMode !== 'day' && 'rounded-l-none'
                      )}
                    >
                      {dayObj.dayNum}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={goToToday}
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => selectWeek(today)}
              >
                Esta semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => selectMonth(today)}
              >
                Este mes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Stats and Actions */}
        <div className="lg:col-span-8 space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Balance */}
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">
                  Total Disponible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats.totalAvailable)}
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Suma de todas las cuentas
                </p>
              </CardContent>
            </Card>

            {/* Period Balance */}
            <Card className={cn(
              'border-2',
              stats.balance >= 0 ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Resultado del Período
                  </CardTitle>
                  <DollarSign className={cn(
                    'h-4 w-4',
                    stats.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  )} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'text-2xl font-bold',
                  stats.balance >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatCurrency(stats.balance)}
                </div>
              </CardContent>
            </Card>

            {/* Period Income */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ingresos del Período
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.income)}
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
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.expense)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/operations')}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white text-base">
                  <span>Operaciones Recientes</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ver el libro diario con todas las transacciones
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/accounts')}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white text-base">
                  <span>Gestión de Cuentas</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Administrar cuentas y ver saldos
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/reconciliations')}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white text-base">
                  <span>Arqueos de Caja</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control diario de caja
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/accounting/expenses')}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white text-base">
                  <span>Ver Egresos</span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Listado detallado de egresos
                </p>
              </CardContent>
            </Card>
          </div>
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

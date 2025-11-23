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
  Wallet,
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

type ViewMode = 'day' | 'week' | 'month' | 'range'

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

const DAY_NAMES_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
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
  const diff = day === 0 ? 6 : day - 1
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

// ============================================================================
// PERIOD LABEL
// ============================================================================

function getPeriodLabel(mode: ViewMode, range: DateRange): string {
  switch (mode) {
    case 'day':
      return formatDisplayDate(range.start)
    case 'week':
      return `${formatShortDate(range.start)} - ${formatShortDate(range.end)}`
    case 'month':
      return `${MONTH_NAMES[range.start.getMonth()]} ${range.start.getFullYear()}`
    case 'range':
      return `${formatShortDate(range.start)} - ${formatShortDate(range.end)}`
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])

  // View mode and selection state
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedRange, setSelectedRange] = useState<DateRange>(() => getMonthRange(today))
  const [calendarMonth, setCalendarMonth] = useState(today)

  // Range selection state (for interactive range picking)
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Stats
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
  // VIEW MODE HANDLERS
  // ============================================================================

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    setRangeStart(null)
    setHoverDate(null)

    if (mode === 'day') {
      setSelectedRange({ start: today, end: today })
    } else if (mode === 'week') {
      setSelectedRange(getWeekRange(today))
    } else if (mode === 'month') {
      setSelectedRange(getMonthRange(calendarMonth))
    }
    // For 'range', wait for user to select
  }

  // ============================================================================
  // CALENDAR CLICK HANDLER
  // ============================================================================

  const handleDayClick = (date: Date) => {
    if (viewMode === 'day') {
      setSelectedRange({ start: date, end: date })
    } else if (viewMode === 'week') {
      setSelectedRange(getWeekRange(date))
    } else if (viewMode === 'month') {
      // Click on a day in month mode selects that day
      setViewMode('day')
      setSelectedRange({ start: date, end: date })
    } else if (viewMode === 'range') {
      // Interactive range selection
      if (!rangeStart) {
        // First click - set start
        setRangeStart(date)
        setSelectedRange({ start: date, end: date })
      } else {
        // Second click - set end and finalize
        const start = rangeStart < date ? rangeStart : date
        const end = rangeStart < date ? date : rangeStart
        setSelectedRange({ start, end })
        setRangeStart(null)
        setHoverDate(null)
      }
    }
  }

  const handleDayHover = (date: Date | null) => {
    if (viewMode === 'range' && rangeStart && date) {
      setHoverDate(date)
    }
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const navigateCalendar = (direction: 'prev' | 'next') => {
    const delta = direction === 'next' ? 1 : -1
    const newMonth = new Date(calendarMonth)
    newMonth.setMonth(newMonth.getMonth() + delta)
    setCalendarMonth(newMonth)

    if (viewMode === 'month') {
      setSelectedRange(getMonthRange(newMonth))
    }
  }

  const goToToday = () => {
    setCalendarMonth(today)
    if (viewMode === 'day') {
      setSelectedRange({ start: today, end: today })
    } else if (viewMode === 'week') {
      setSelectedRange(getWeekRange(today))
    } else if (viewMode === 'month') {
      setSelectedRange(getMonthRange(today))
    }
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

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, dayNum: 0 })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), dayNum: day })
    }

    return days
  }, [calendarMonth])

  // Get visual range for highlighting (considers hover state for range mode)
  const visualRange = useMemo(() => {
    if (viewMode === 'range' && rangeStart && hoverDate) {
      const start = rangeStart < hoverDate ? rangeStart : hoverDate
      const end = rangeStart < hoverDate ? hoverDate : rangeStart
      return { start, end }
    }
    return selectedRange
  }, [viewMode, rangeStart, hoverDate, selectedRange])

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

  const todayFormatted = today.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* ================================================================== */}
      {/* HEADER + TOTAL DISPONIBLE (ALWAYS CURRENT) */}
      {/* ================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            {todayFormatted}
          </p>
        </div>

        {/* Total Disponible - Siempre al día de hoy */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 lg:min-w-[280px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Total Disponible Hoy</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* QUICK ACTIONS */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white h-auto py-3"
          onClick={() => setIsAddIncomeOpen(true)}
        >
          <ArrowUpCircle className="h-5 w-5 mr-2" />
          <span className="font-semibold">Registrar Ingreso</span>
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white h-auto py-3"
          onClick={() => setIsAddExpenseOpen(true)}
        >
          <ArrowDownCircle className="h-5 w-5 mr-2" />
          <span className="font-semibold">Registrar Egreso</span>
        </Button>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-3"
          onClick={() => setIsAddTransferOpen(true)}
        >
          <Repeat className="h-5 w-5 mr-2" />
          <span className="font-semibold">Transferencia</span>
        </Button>
      </div>

      {/* ================================================================== */}
      {/* MAIN CONTENT: CALENDAR + PERIOD STATS */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Calendar & Period Selector */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seleccionar Período</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View Mode Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {[
                { mode: 'day' as ViewMode, label: 'Día' },
                { mode: 'week' as ViewMode, label: 'Semana' },
                { mode: 'month' as ViewMode, label: 'Mes' },
                { mode: 'range' as ViewMode, label: 'Rango' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={cn(
                    'px-2 py-2 text-sm font-medium rounded-md transition-all',
                    viewMode === mode
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Range mode instructions */}
            {viewMode === 'range' && (
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                {rangeStart
                  ? `Inicio: ${formatShortDate(rangeStart)} — Haz clic en la fecha final`
                  : 'Haz clic en la fecha de inicio'}
              </div>
            )}

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">
                {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateCalendar('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES_SHORT.map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 h-8 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayObj, idx) => {
                  if (!dayObj.date) {
                    return <div key={idx} className="h-10" />
                  }

                  const date = dayObj.date
                  const isToday = isSameDay(date, today)
                  const isSelected = isInRange(date, visualRange)
                  const isRangeStart = isSameDay(date, visualRange.start)
                  const isRangeEnd = isSameDay(date, visualRange.end)
                  const isMiddle = isSelected && !isRangeStart && !isRangeEnd

                  // Determine background color based on selection
                  let bgClass = ''
                  let textClass = ''
                  let roundedClass = 'rounded-md'

                  if (isSelected) {
                    if (viewMode === 'day' || (isRangeStart && isRangeEnd)) {
                      // Single day selection
                      bgClass = 'bg-blue-600'
                      textClass = 'text-white'
                    } else {
                      // Range selection
                      bgClass = isRangeStart || isRangeEnd ? 'bg-blue-600' : 'bg-blue-100 dark:bg-blue-900/50'
                      textClass = isRangeStart || isRangeEnd ? 'text-white' : 'text-blue-800 dark:text-blue-200'

                      if (isRangeStart && !isRangeEnd) {
                        roundedClass = 'rounded-l-md rounded-r-none'
                      } else if (isRangeEnd && !isRangeStart) {
                        roundedClass = 'rounded-r-md rounded-l-none'
                      } else if (isMiddle) {
                        roundedClass = 'rounded-none'
                      }
                    }
                  } else if (isToday) {
                    bgClass = 'bg-gray-200 dark:bg-gray-700'
                    textClass = 'text-gray-900 dark:text-white font-bold'
                  } else {
                    textClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDayClick(date)}
                      onMouseEnter={() => handleDayHover(date)}
                      onMouseLeave={() => handleDayHover(null)}
                      className={cn(
                        'h-10 w-full text-sm font-medium transition-colors',
                        bgClass,
                        textClass,
                        roundedClass
                      )}
                    >
                      {dayObj.dayNum}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                setViewMode('week')
                setSelectedRange(getWeekRange(today))
                setCalendarMonth(today)
              }}>
                Esta semana
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                setViewMode('month')
                setSelectedRange(getMonthRange(today))
                setCalendarMonth(today)
              }}>
                Este mes
              </Button>
            </div>

            {/* Current selection display */}
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Período seleccionado</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {getPeriodLabel(viewMode, selectedRange)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Period Stats */}
        <div className="lg:col-span-7 space-y-4">
          {/* Period Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumen del Período
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {getPeriodLabel(viewMode, selectedRange)}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Period Income */}
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Ingresos</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.income)}
                </p>
              </CardContent>
            </Card>

            {/* Period Expenses */}
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Egresos</span>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.expense)}
                </p>
              </CardContent>
            </Card>

            {/* Period Balance */}
            <Card className={cn(
              'border-l-4',
              stats.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
                  <DollarSign className={cn(
                    'h-4 w-4',
                    stats.balance >= 0 ? 'text-blue-500' : 'text-orange-500'
                  )} />
                </div>
                <p className={cn(
                  'text-2xl font-bold',
                  stats.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                )}>
                  {formatCurrency(stats.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Access */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/accounting/operations')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Operaciones</p>
                  <p className="text-xs text-gray-500">Ver libro diario</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/accounting/accounts')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cuentas</p>
                  <p className="text-xs text-gray-500">Gestionar saldos</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/accounting/reconciliations')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Arqueos</p>
                  <p className="text-xs text-gray-500">Control de caja</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/accounting/expenses')}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Egresos</p>
                  <p className="text-xs text-gray-500">Ver detalle</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
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

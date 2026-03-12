import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Building2,
  CreditCard,
  FileText,
  Plus,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { AddAsientoDialog } from '@/components/cash/AddAsientoDialog'
import * as accountingService from '@/lib/accountingService'
import type { DashboardData, CuentaStat, Asiento, CuentaContable } from '@/types/accounting'
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
// PIE CHART (Simple SVG)
// ============================================================================

interface PieSlice {
  label: string
  value: number
  color: string
}

function SimplePieChart({ slices, title }: { slices: PieSlice[]; title: string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (total === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-400">Sin datos para {title.toLowerCase()}</p>
      </div>
    )
  }

  let cumulativePercent = 0
  const paths = slices.filter(s => s.value > 0).map((slice) => {
    const percent = slice.value / total
    const startAngle = cumulativePercent * 2 * Math.PI
    cumulativePercent += percent
    const endAngle = cumulativePercent * 2 * Math.PI

    const x1 = Math.cos(startAngle - Math.PI / 2)
    const y1 = Math.sin(startAngle - Math.PI / 2)
    const x2 = Math.cos(endAngle - Math.PI / 2)
    const y2 = Math.sin(endAngle - Math.PI / 2)
    const largeArc = percent > 0.5 ? 1 : 0

    if (percent >= 0.9999) {
      return <circle key={slice.label} cx="0" cy="0" r="1" fill={slice.color} />
    }

    return (
      <path
        key={slice.label}
        d={`M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
      />
    )
  })

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{title}</h4>
      <div className="flex items-center gap-4">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-24 h-24 shrink-0">
          {paths}
        </svg>
        <div className="space-y-1 text-xs">
          {slices.filter(s => s.value > 0).map((slice) => (
            <div key={slice.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{slice.label}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {((slice.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4',
]

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

  // Range selection state
  const [rangeStart, setRangeStart] = useState<Date | null>(null)
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Asiento dialog
  const [addAsientoOpen, setAddAsientoOpen] = useState(false)
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])

  // Check access
  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
    }
  }, [navigate])

  // Fetch cuentas for the dialog
  useEffect(() => {
    const loadCuentas = async () => {
      try {
        const response = await accountingService.getCuentas()
        setCuentas(response.data || [])
      } catch (error) {
        console.error('Error loading cuentas:', error)
      }
    }
    loadCuentas()
  }, [])

  // Fetch stats when range changes
  useEffect(() => {
    fetchDashboard()
  }, [selectedRange])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const params = {
        start_date: formatDate(selectedRange.start),
        end_date: formatDate(selectedRange.end)
      }
      const response = await accountingService.getDashboard(params)
      setDashboardData(response)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadisticas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Computed values
  const stats = useMemo(() => {
    if (!dashboardData) return { income: 0, expense: 0, balance: 0, totalAvailable: 0, efectivo: 0, bancaria: 0, cobro_electronico: 0 }
    return {
      income: Number(dashboardData.period.total_ingresos || '0'),
      expense: Number(dashboardData.period.total_egresos || '0'),
      balance: Number(dashboardData.period.net_result || '0'),
      totalAvailable: Number(dashboardData.balances.total || '0'),
      efectivo: Number(dashboardData.balances.by_subtipo.efectivo || '0'),
      bancaria: Number(dashboardData.balances.by_subtipo.bancaria || '0'),
      cobro_electronico: Number(dashboardData.balances.by_subtipo.cobro_electronico || '0'),
    }
  }, [dashboardData])

  const egresosPieSlices = useMemo((): PieSlice[] => {
    if (!dashboardData?.period.egresos_by_cuenta) return []
    return dashboardData.period.egresos_by_cuenta.map((cs: CuentaStat, i: number) => ({
      label: cs.cuenta?.titulo || `Cuenta ${cs.id_cuenta}`,
      value: Number(cs.total),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [dashboardData])

  const ingresosPieSlices = useMemo((): PieSlice[] => {
    if (!dashboardData?.period.ingresos_by_cuenta) return []
    return dashboardData.period.ingresos_by_cuenta.map((cs: CuentaStat, i: number) => ({
      label: cs.cuenta?.titulo || `Cuenta ${cs.id_cuenta}`,
      value: Number(cs.total),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
  }, [dashboardData])

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
  }

  const handleDayClick = (date: Date) => {
    if (viewMode === 'day') {
      setSelectedRange({ start: date, end: date })
    } else if (viewMode === 'week') {
      setSelectedRange(getWeekRange(date))
    } else if (viewMode === 'month') {
      setViewMode('day')
      setSelectedRange({ start: date, end: date })
    } else if (viewMode === 'range') {
      if (!rangeStart) {
        setRangeStart(date)
        setSelectedRange({ start: date, end: date })
      } else {
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
    setViewMode('day')
    setCalendarMonth(today)
    setSelectedRange({ start: today, end: today })
    setRangeStart(null)
    setHoverDate(null)
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

  const visualRange = useMemo(() => {
    if (viewMode === 'range' && rangeStart && hoverDate) {
      const start = rangeStart < hoverDate ? rangeStart : hoverDate
      const end = rangeStart < hoverDate ? hoverDate : rangeStart
      return { start, end }
    }
    return selectedRange
  }, [viewMode, rangeStart, hoverDate, selectedRange])

  // ============================================================================
  // RENDER
  // ============================================================================

  const todayFormatted = today.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  const handleAsientoSuccess = () => {
    toast({ title: 'Exito', description: 'Asiento creado correctamente' })
    fetchDashboard()
  }

  return (
    <div className="space-y-6">
      {/* HEADER + TOTAL DISPONIBLE */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            {todayFormatted}
          </p>
        </div>

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

      {/* BALANCE CARDS BY SUBTIPO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Efectivo</span>
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.efectivo)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Bancaria</span>
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(stats.bancaria)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Cobro Electronico</span>
              <CreditCard className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(stats.cobro_electronico)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTION - Nuevo Asiento */}
      <div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-3 px-6"
          onClick={() => setAddAsientoOpen(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          <span className="font-semibold">Nuevo Asiento Contable</span>
        </Button>
      </div>

      {/* MAIN CONTENT: CALENDAR + PERIOD STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Calendar & Period Selector */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seleccionar Periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* View Mode Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {[
                { mode: 'day' as ViewMode, label: 'Dia' },
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
                  ? `Inicio: ${formatShortDate(rangeStart)} -- Haz clic en la fecha final`
                  : 'Haz clic en la fecha de inicio'}
              </div>
            )}

            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => navigateCalendar('prev')} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">
                {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateCalendar('next')} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_NAMES_SHORT.map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 h-8 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>
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

                  let bgClass = ''
                  let textClass = ''
                  let roundedClass = 'rounded-md'

                  if (isSelected) {
                    if (viewMode === 'day' || (isRangeStart && isRangeEnd)) {
                      bgClass = 'bg-blue-600'
                      textClass = 'text-white'
                    } else {
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
                      className={cn('h-10 w-full text-sm font-medium transition-colors', bgClass, textClass, roundedClass)}
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Periodo seleccionado</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {getPeriodLabel(viewMode, selectedRange)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT: Period Stats */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resumen del Periodo
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {getPeriodLabel(viewMode, selectedRange)}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Card className={cn('border-l-4', stats.balance >= 0 ? 'border-l-blue-500' : 'border-l-orange-500')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Balance</span>
                  <DollarSign className={cn('h-4 w-4', stats.balance >= 0 ? 'text-blue-500' : 'text-orange-500')} />
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

          {/* Pie Charts */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <SimplePieChart slices={egresosPieSlices} title="Egresos por Cuenta" />
                <SimplePieChart slices={ingresosPieSlices} title="Ingresos por Cuenta" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Asientos */}
          {dashboardData?.recent_asientos && dashboardData.recent_asientos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Asientos Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.recent_asientos.slice(0, 5).map((asiento: Asiento) => (
                    <div
                      key={asiento.id_asiento}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => navigate('/accounting/operations')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">{asiento.nro_comprobante}</span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            asiento.estado === 'confirmado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            asiento.estado === 'borrador' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}>
                            {asiento.estado}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white truncate mt-0.5">{asiento.concepto}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(asiento.fecha).toLocaleDateString('es-AR')} - {asiento.origen}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Access */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/operations')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Asientos</p>
                  <p className="text-xs text-gray-500">Ver libro diario</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/categories')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cuentas</p>
                  <p className="text-xs text-gray-500">Gestionar saldos</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/reconciliations')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Arqueos</p>
                  <p className="text-xs text-gray-500">Control de caja</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/reports')}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Reportes</p>
                  <p className="text-xs text-gray-500">Informes financieros</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Asiento Dialog */}
      <AddAsientoDialog
        open={addAsientoOpen}
        onOpenChange={setAddAsientoOpen}
        onSuccess={handleAsientoSuccess}
        cuentas={cuentas}
      />
    </div>
  )
}

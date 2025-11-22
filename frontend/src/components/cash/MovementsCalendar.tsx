import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { fetchWithAuth } from '@/lib/auth'

interface DaySummary {
  date: string
  expenses: number
  incomes: number
  transfers: number
  expenseCount: number
  incomeCount: number
  transferCount: number
}

interface MovementsCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
}

export function MovementsCalendar({ selectedDate, onDateSelect }: MovementsCalendarProps) {
  const [viewDate, setViewDate] = useState(selectedDate)
  const [monthData, setMonthData] = useState<Record<string, DaySummary>>({})
  const [loading, setLoading] = useState(false)
  const [hoveredDay, setHoveredDay] = useState<DaySummary | null>(null)

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  // Fetch monthly data when viewDate month changes
  useEffect(() => {
    fetchMonthData()
  }, [viewDate.getMonth(), viewDate.getFullYear()])

  const fetchMonthData = async () => {
    setLoading(true)
    try {
      const year = viewDate.getFullYear()
      const month = viewDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      // Fetch all movements for the month in parallel
      const [expensesRes, incomesRes, transfersRes] = await Promise.all([
        fetchWithAuth(`/api/accounting/expenses?start_date=${startDate}&end_date=${endDate}&limit=1000`),
        fetchWithAuth(`/api/accounting/incomes?start_date=${startDate}&end_date=${endDate}&limit=1000`),
        fetchWithAuth(`/api/accounting/transfers?start_date=${startDate}&end_date=${endDate}&limit=1000`)
      ])

      const summaryByDate: Record<string, DaySummary> = {}

      // Process expenses
      if (expensesRes.ok) {
        const data = await expensesRes.json()
        data.data?.forEach((exp: { date: string; amount: number }) => {
          if (!summaryByDate[exp.date]) {
            summaryByDate[exp.date] = {
              date: exp.date,
              expenses: 0, incomes: 0, transfers: 0,
              expenseCount: 0, incomeCount: 0, transferCount: 0
            }
          }
          summaryByDate[exp.date].expenses += parseFloat(String(exp.amount))
          summaryByDate[exp.date].expenseCount++
        })
      }

      // Process incomes
      if (incomesRes.ok) {
        const data = await incomesRes.json()
        data.data?.forEach((inc: { date: string; amount: number }) => {
          if (!summaryByDate[inc.date]) {
            summaryByDate[inc.date] = {
              date: inc.date,
              expenses: 0, incomes: 0, transfers: 0,
              expenseCount: 0, incomeCount: 0, transferCount: 0
            }
          }
          summaryByDate[inc.date].incomes += parseFloat(String(inc.amount))
          summaryByDate[inc.date].incomeCount++
        })
      }

      // Process transfers
      if (transfersRes.ok) {
        const data = await transfersRes.json()
        data.data?.forEach((tr: { date: string; amount: number }) => {
          if (!summaryByDate[tr.date]) {
            summaryByDate[tr.date] = {
              date: tr.date,
              expenses: 0, incomes: 0, transfers: 0,
              expenseCount: 0, incomeCount: 0, transferCount: 0
            }
          }
          summaryByDate[tr.date].transfers += parseFloat(String(tr.amount))
          summaryByDate[tr.date].transferCount++
        })
      }

      setMonthData(summaryByDate)
    } catch (error) {
      console.error('Error fetching month data:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousMonth = () => {
    const newDate = new Date(viewDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setViewDate(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(viewDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setViewDate(newDate)
  }

  const selectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onDateSelect(newDate)
  }

  const generateCalendar = () => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    const daysInMonth = lastDay.getDate()

    const days = []

    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, isCurrentMonth: false })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = date.toDateString() === selectedDate.toDateString()
      const summary = monthData[dateStr]

      days.push({ day, isCurrentMonth: true, isToday, isSelected, date, dateStr, summary })
    }

    return days
  }

  // Calculate month totals
  const monthTotals = Object.values(monthData).reduce(
    (acc, day) => ({
      expenses: acc.expenses + day.expenses,
      incomes: acc.incomes + day.incomes,
      transfers: acc.transfers + day.transfers,
      expenseCount: acc.expenseCount + day.expenseCount,
      incomeCount: acc.incomeCount + day.incomeCount,
      transferCount: acc.transferCount + day.transferCount
    }),
    { expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 }
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getDayIndicators = (summary?: DaySummary) => {
    if (!summary) return null

    return (
      <div className="flex gap-0.5 justify-center mt-0.5">
        {summary.incomes > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title={`Ingresos: ${formatCurrency(summary.incomes)}`} />
        )}
        {summary.expenses > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" title={`Egresos: ${formatCurrency(summary.expenses)}`} />
        )}
        {summary.transfers > 0 && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title={`Transferencias: ${formatCurrency(summary.transfers)}`} />
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Calendario de Movimientos</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legend */}
        <div className="flex gap-4 mb-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Ingresos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>Egresos</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Transferencias</span>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
            <div
              key={i}
              className="text-center text-xs font-medium text-muted-foreground h-6 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {generateCalendar().map((dayObj, idx) => (
            <div key={idx}>
              {dayObj.isCurrentMonth ? (
                <button
                  onClick={() => selectDate(dayObj.day)}
                  onMouseEnter={() => dayObj.summary && setHoveredDay(dayObj.summary)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`
                    h-10 w-full rounded text-xs font-medium
                    transition-colors flex flex-col items-center justify-center
                    ${dayObj.isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : dayObj.isToday
                      ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                      : dayObj.summary
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <span>{dayObj.day}</span>
                  {getDayIndicators(dayObj.summary)}
                </button>
              ) : (
                <div className="h-10 w-full" />
              )}
            </div>
          ))}
        </div>

        {/* Month Summary */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resumen del Mes</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-green-700">{formatCurrency(monthTotals.incomes)}</p>
              <p className="text-xs text-green-600">{monthTotals.incomeCount} mov.</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-medium">Egresos</span>
              </div>
              <p className="text-sm font-bold text-red-700">{formatCurrency(monthTotals.expenses)}</p>
              <p className="text-xs text-red-600">{monthTotals.expenseCount} mov.</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <ArrowLeftRight className="h-3 w-3" />
                <span className="text-xs font-medium">Transf.</span>
              </div>
              <p className="text-sm font-bold text-blue-700">{formatCurrency(monthTotals.transfers)}</p>
              <p className="text-xs text-blue-600">{monthTotals.transferCount} mov.</p>
            </div>
          </div>

          {/* Balance */}
          <div className="mt-3 bg-gray-100 rounded-lg p-3 text-center">
            <span className="text-xs text-gray-500">Balance del Mes</span>
            <p className={`text-lg font-bold ${monthTotals.incomes - monthTotals.expenses >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(monthTotals.incomes - monthTotals.expenses)}
            </p>
          </div>
        </div>

        {/* Hovered Day Details */}
        {hoveredDay && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium text-gray-700 mb-2">
              {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </p>
            <div className="space-y-1 text-xs">
              {hoveredDay.incomes > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Ingresos ({hoveredDay.incomeCount})</span>
                  <span className="font-medium text-green-700">{formatCurrency(hoveredDay.incomes)}</span>
                </div>
              )}
              {hoveredDay.expenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">Egresos ({hoveredDay.expenseCount})</span>
                  <span className="font-medium text-red-700">{formatCurrency(hoveredDay.expenses)}</span>
                </div>
              )}
              {hoveredDay.transfers > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Transferencias ({hoveredDay.transferCount})</span>
                  <span className="font-medium text-blue-700">{formatCurrency(hoveredDay.transfers)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="text-sm text-gray-500">Cargando...</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

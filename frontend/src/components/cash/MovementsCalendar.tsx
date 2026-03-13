import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Calendar } from '../ui/calendar'
import { fetchWithAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'

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
  const [month, setMonth] = useState(selectedDate)
  const [monthData, setMonthData] = useState<Record<string, DaySummary>>({})
  const [loading, setLoading] = useState(false)

  // Fetch monthly data when month changes
  useEffect(() => {
    fetchMonthData()
  }, [month.getMonth(), month.getFullYear()])

  const fetchMonthData = async () => {
    setLoading(true)
    try {
      const year = month.getFullYear()
      const m = month.getMonth()
      const startDate = new Date(year, m, 1).toLocaleDateString('en-CA')
      const endDate = new Date(year, m + 1, 0).toLocaleDateString('en-CA')

      const [expensesRes, incomesRes, transfersRes] = await Promise.all([
        fetchWithAuth(`/api/accounting/expenses?start_date=${startDate}&end_date=${endDate}&limit=1000`),
        fetchWithAuth(`/api/accounting/incomes?start_date=${startDate}&end_date=${endDate}&limit=1000`),
        fetchWithAuth(`/api/accounting/transfers?start_date=${startDate}&end_date=${endDate}&limit=1000`)
      ])

      const summaryByDate: Record<string, DaySummary> = {}

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        data.data?.forEach((exp: { date: string; amount: number }) => {
          if (!summaryByDate[exp.date]) {
            summaryByDate[exp.date] = { date: exp.date, expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 }
          }
          summaryByDate[exp.date].expenses += parseFloat(String(exp.amount))
          summaryByDate[exp.date].expenseCount++
        })
      }

      if (incomesRes.ok) {
        const data = await incomesRes.json()
        data.data?.forEach((inc: { date: string; amount: number }) => {
          if (!summaryByDate[inc.date]) {
            summaryByDate[inc.date] = { date: inc.date, expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 }
          }
          summaryByDate[inc.date].incomes += parseFloat(String(inc.amount))
          summaryByDate[inc.date].incomeCount++
        })
      }

      if (transfersRes.ok) {
        const data = await transfersRes.json()
        data.data?.forEach((tr: { date: string; amount: number }) => {
          if (!summaryByDate[tr.date]) {
            summaryByDate[tr.date] = { date: tr.date, expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 }
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

  // Days with activity for visual highlighting
  const daysWithActivity = useMemo(() => {
    return Object.keys(monthData).map(dateStr => new Date(dateStr + 'T12:00:00'))
  }, [monthData])

  // Selected day summary
  const selectedDaySummary = useMemo(() => {
    const dateStr = selectedDate.toLocaleDateString('en-CA')
    return monthData[dateStr] || null
  }, [selectedDate, monthData])

  // Month totals
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

  return (
    <Card className="w-full relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Calendario de Movimientos</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Legend */}
        <div className="flex gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
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
            <span>Otras op.</span>
          </div>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={month}
          onSelect={(date) => date && onDateSelect(date)}
          onMonthChange={setMonth}
          modifiers={{ hasActivity: daysWithActivity }}
          modifiersClassNames={{ hasActivity: 'font-bold !bg-blue-50 dark:!bg-blue-900/20' }}
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2035, 11)}
        />

        {/* Selected Day Details */}
        {selectedDaySummary && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
              {new Date(selectedDaySummary.date + 'T12:00:00').toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </p>
            <div className="space-y-1 text-xs">
              {selectedDaySummary.incomes > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Ingresos ({selectedDaySummary.incomeCount})</span>
                  <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(selectedDaySummary.incomes)}</span>
                </div>
              )}
              {selectedDaySummary.expenses > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">Egresos ({selectedDaySummary.expenseCount})</span>
                  <span className="font-medium text-red-700 dark:text-red-400">{formatCurrency(selectedDaySummary.expenses)}</span>
                </div>
              )}
              {selectedDaySummary.transfers > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Otras op. ({selectedDaySummary.transferCount})</span>
                  <span className="font-medium text-blue-700 dark:text-blue-400">{formatCurrency(selectedDaySummary.transfers)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Month Summary */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resumen del Mes</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatCurrency(monthTotals.incomes)}</p>
              <p className="text-xs text-green-600">{monthTotals.incomeCount} mov.</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-medium">Egresos</span>
              </div>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{formatCurrency(monthTotals.expenses)}</p>
              <p className="text-xs text-red-600">{monthTotals.expenseCount} mov.</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <ArrowLeftRight className="h-3 w-3" />
                <span className="text-xs font-medium">Transf.</span>
              </div>
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">{formatCurrency(monthTotals.transfers)}</p>
              <p className="text-xs text-blue-600">{monthTotals.transferCount} mov.</p>
            </div>
          </div>

          {/* Balance */}
          <div className="mt-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Balance del Mes</span>
            <p className={`text-lg font-bold ${monthTotals.incomes - monthTotals.expenses >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {formatCurrency(monthTotals.incomes - monthTotals.expenses)}
            </p>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-lg">
            <div className="text-sm text-gray-500">Cargando...</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

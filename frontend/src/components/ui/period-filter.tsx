import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export type PeriodPreset = 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom'

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface PeriodFilterValue {
  preset: PeriodPreset
  range: DateRange
  label: string
}

interface PeriodFilterProps {
  value: PeriodFilterValue
  onChange: (value: PeriodFilterValue) => void
  className?: string
}

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function getPresetRange(preset: PeriodPreset, referenceDate: Date = new Date()): DateRange {
  const today = referenceDate

  switch (preset) {
    case 'today': {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      return { start, end }
    }
    case 'this_week': {
      // Week starts on Monday
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Adjust for Monday start
      const start = new Date(today)
      start.setDate(today.getDate() - diff)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start, end }
    }
    case 'last_week': {
      const dayOfWeek = today.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - diff)
      const start = new Date(thisWeekStart)
      start.setDate(thisWeekStart.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      return { start, end }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start, end }
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start, end }
    }
    case 'last_3_months': {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start, end }
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1)
      const end = new Date(today.getFullYear(), 11, 31)
      return { start, end }
    }
    case 'all':
    default:
      return { start: null, end: null }
  }
}

function formatShortDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function formatFullDate(date: Date): string {
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

export function getPresetLabel(preset: PeriodPreset, range: DateRange): string {
  switch (preset) {
    case 'today':
      return `Hoy (${formatFullDate(range.start!)})`
    case 'this_week':
      return `Esta semana (${formatShortDate(range.start!)} - ${formatShortDate(range.end!)})`
    case 'last_week':
      return `Semana anterior (${formatShortDate(range.start!)} - ${formatShortDate(range.end!)})`
    case 'this_month':
      return `${monthNames[range.start!.getMonth()]} ${range.start!.getFullYear()}`
    case 'last_month':
      return `${monthNames[range.start!.getMonth()]} ${range.start!.getFullYear()}`
    case 'last_3_months':
      return 'Últimos 3 meses'
    case 'this_year':
      return `Año ${range.start!.getFullYear()}`
    case 'all':
      return 'Todo el historial'
    case 'custom':
      if (range.start && range.end) {
        return `${formatFullDate(range.start)} - ${formatFullDate(range.end)}`
      }
      return 'Rango personalizado'
    default:
      return 'Seleccionar periodo'
  }
}

export function createPeriodValue(preset: PeriodPreset, referenceDate?: Date): PeriodFilterValue {
  const range = getPresetRange(preset, referenceDate)
  return {
    preset,
    range,
    label: getPresetLabel(preset, range)
  }
}

export function createCustomPeriodValue(start: Date, end: Date): PeriodFilterValue {
  const range = { start, end }
  return {
    preset: 'custom',
    range,
    label: getPresetLabel('custom', range)
  }
}

// Helper to navigate months while keeping the same preset pattern
export function navigateMonth(current: PeriodFilterValue, direction: 'prev' | 'next'): PeriodFilterValue {
  if (current.preset === 'all' || current.preset === 'last_3_months' || current.preset === 'this_year') {
    // For these presets, navigate to specific month
    const baseDate = current.range.start || new Date()
    const newDate = new Date(baseDate)
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))

    const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
    const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0)

    return {
      preset: 'this_month', // Switch to month view
      range: { start, end },
      label: `${monthNames[start.getMonth()]} ${start.getFullYear()}`
    }
  }

  // For month-based presets, navigate to adjacent month
  const baseDate = current.range.start || new Date()
  const newDate = new Date(baseDate)
  newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))

  const start = new Date(newDate.getFullYear(), newDate.getMonth(), 1)
  const end = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0)

  // Check if it's now "this month" or "last month"
  const today = new Date()
  const isThisMonth = start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth()
  const isLastMonth = start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth() - 1

  let preset: PeriodPreset = 'this_month'
  if (isThisMonth) preset = 'this_month'
  else if (isLastMonth) preset = 'last_month'

  return {
    preset,
    range: { start, end },
    label: `${monthNames[start.getMonth()]} ${start.getFullYear()}`
  }
}

export function PeriodFilter({ value, onChange, className = '' }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handlePresetSelect = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      setShowCustomRange(true)
      return
    }
    onChange(createPeriodValue(preset))
    setIsOpen(false)
    setShowCustomRange(false)
  }

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      if (start <= end) {
        onChange(createCustomPeriodValue(start, end))
        setIsOpen(false)
        setShowCustomRange(false)
      }
    }
  }

  const handlePrevMonth = () => {
    onChange(navigateMonth(value, 'prev'))
  }

  const handleNextMonth = () => {
    onChange(navigateMonth(value, 'next'))
  }

  const handleGoToToday = () => {
    onChange(createPeriodValue('this_month'))
  }

  // Check if we can go to next month (don't go beyond current month)
  const today = new Date()
  const currentEnd = value.range.end
  const canGoNext = value.preset === 'all' || value.preset === 'custom' || !currentEnd ||
    currentEnd.getFullYear() < today.getFullYear() ||
    (currentEnd.getFullYear() === today.getFullYear() && currentEnd.getMonth() < today.getMonth())

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Previous month button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevMonth}
        className="h-8 w-8 p-0"
        title="Período anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Period selector dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setShowCustomRange(false)
      }}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm font-normal min-w-[180px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {value.label}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-[280px] bg-white dark:bg-gray-900 border shadow-lg">
          {!showCustomRange ? (
            <>
              {/* Quick shortcuts */}
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Atajos rápidos
              </div>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('today')}
                className={value.preset === 'today' ? 'bg-accent' : ''}
              >
                Hoy
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('this_week')}
                className={value.preset === 'this_week' ? 'bg-accent' : ''}
              >
                Esta semana
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('last_week')}
                className={value.preset === 'last_week' ? 'bg-accent' : ''}
              >
                Semana anterior
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Por mes
              </div>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('this_month')}
                className={value.preset === 'this_month' ? 'bg-accent' : ''}
              >
                Este mes
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('last_month')}
                className={value.preset === 'last_month' ? 'bg-accent' : ''}
              >
                Mes anterior
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('last_3_months')}
                className={value.preset === 'last_3_months' ? 'bg-accent' : ''}
              >
                Últimos 3 meses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Otros períodos
              </div>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('this_year')}
                className={value.preset === 'this_year' ? 'bg-accent' : ''}
              >
                Este año
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePresetSelect('all')}
                className={value.preset === 'all' ? 'bg-accent' : ''}
              >
                Todo el historial
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handlePresetSelect('custom')}
                className={value.preset === 'custom' ? 'bg-accent' : ''}
              >
                <span className="font-medium">Rango personalizado...</span>
              </DropdownMenuItem>
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium">Seleccionar rango</div>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowCustomRange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleCustomRangeApply}
                  disabled={!customStart || !customEnd}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next month button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextMonth}
        className="h-8 w-8 p-0"
        disabled={!canGoNext}
        title="Período siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

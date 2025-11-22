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

export type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all'

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

export function getPresetLabel(preset: PeriodPreset, range: DateRange): string {
  switch (preset) {
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

  const handlePresetSelect = (preset: PeriodPreset) => {
    onChange(createPeriodValue(preset))
    setIsOpen(false)
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
  const canGoNext = value.preset === 'all' || !currentEnd ||
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
        title="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Period selector dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm font-normal min-w-[160px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {value.label}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-[200px]">
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
          <DropdownMenuItem
            onClick={() => handlePresetSelect('this_year')}
            className={value.preset === 'this_year' ? 'bg-accent' : ''}
          >
            Este año
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handlePresetSelect('all')}
            className={value.preset === 'all' ? 'bg-accent' : ''}
          >
            <span className="font-medium">Todo el historial</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleGoToToday}>
            Ir a hoy
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next month button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNextMonth}
        className="h-8 w-8 p-0"
        disabled={!canGoNext}
        title="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

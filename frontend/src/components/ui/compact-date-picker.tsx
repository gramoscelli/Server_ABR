import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'

interface CompactDatePickerProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
}

export function CompactDatePicker({ value, onChange, className = '' }: CompactDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value)

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

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

  const goToToday = () => {
    const today = new Date()
    setViewDate(today)
    onChange(today)
    setIsOpen(false)
  }

  const selectDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    onChange(newDate)
    setIsOpen(false)
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
      const isToday = date.toDateString() === new Date().toDateString()
      const isSelected = date.toDateString() === value.toDateString()
      days.push({ day, isCurrentMonth: true, isToday, isSelected, date })
    }

    return days
  }

  const formattedDate = value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-sm font-normal"
      >
        <Calendar className="mr-2 h-4 w-4" />
        {formattedDate}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-10 z-50 p-3 shadow-lg w-[280px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <span className="text-sm font-medium">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-medium text-muted-foreground h-7 flex items-center justify-center"
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
                      className={`
                        h-7 w-full rounded text-xs font-medium
                        transition-colors
                        ${dayObj.isSelected
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : dayObj.isToday
                          ? 'bg-accent text-accent-foreground hover:bg-accent/80'
                          : 'hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      {dayObj.day}
                    </button>
                  ) : (
                    <div className="h-7 w-full" />
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="w-full h-7 text-xs"
              >
                Hoy
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

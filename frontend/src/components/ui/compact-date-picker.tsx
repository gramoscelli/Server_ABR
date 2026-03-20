import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'
import { Calendar } from './calendar'

interface CompactDatePickerProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
}

export function CompactDatePicker({ value, onChange, className = '' }: CompactDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const calendarWidth = 320 // approximate calendar width
      let left = rect.left
      // If the calendar would overflow the right edge, align to the right edge of the button
      if (left + calendarWidth > window.innerWidth) {
        left = rect.right - calendarWidth
      }
      setPos({ top: rect.bottom + 4, left: Math.max(0, left) })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      updatePos()
      window.addEventListener('scroll', updatePos, true)
      window.addEventListener('resize', updatePos)
      return () => {
        window.removeEventListener('scroll', updatePos, true)
        window.removeEventListener('resize', updatePos)
      }
    }
  }, [isOpen, updatePos])

  const formattedDate = value.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  return (
    <div className={className}>
      <Button
        ref={btnRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 text-sm font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {formattedDate}
      </Button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          <Card
            className="fixed z-[9999] shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            <Calendar
              mode="single"
              selected={value}
              defaultMonth={value}
              onSelect={(date) => {
                if (date) {
                  onChange(date)
                  setIsOpen(false)
                }
              }}
              startMonth={new Date(2020, 0)}
              endMonth={new Date(2035, 11)}
            />
            <div className="px-3 pb-3 pt-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(new Date())
                  setIsOpen(false)
                }}
                className="w-full h-7 text-xs"
              >
                Hoy
              </Button>
            </div>
          </Card>
        </>,
        document.body
      )}
    </div>
  )
}

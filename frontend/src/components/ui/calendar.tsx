import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      captionLayout="dropdown"
      className={cn('p-3', className)}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }

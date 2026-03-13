import { NumericFormat, type NumberFormatValues } from 'react-number-format'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: number | string
  onValueChange: (value: number) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  id?: string
  required?: boolean
}

export function CurrencyInput({
  value,
  onValueChange,
  disabled,
  placeholder = '$ 0,00',
  className,
  id,
  required,
}: CurrencyInputProps) {
  return (
    <NumericFormat
      id={id}
      value={value === '' || value === 0 ? '' : value}
      onValueChange={(values: NumberFormatValues) => {
        onValueChange(values.floatValue ?? 0)
      }}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale={false}
      allowNegative={false}
      prefix="$ "
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  )
}

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { accountingService } from '@/lib/accountingService'
import type { PlanDeCuentas, TransferType } from '@/types/accounting'

export type OperationType = 'income' | 'expense' | 'transfer'

interface AddOperationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  operationType: OperationType
  onSubmit?: (data: OperationFormData) => void
}

export interface OperationFormData {
  amount: string
  origin_plan_cta_id: number | null
  destination_plan_cta_id: number | null
  transfer_type_id: number | null
  date: string
  description: string
}

const TITLES: Record<OperationType, string> = {
  income: 'Agregar Ingreso',
  expense: 'Agregar Egreso',
  transfer: 'Agregar Otra Operación',
}

const SUBMIT_LABELS: Record<OperationType, string> = {
  income: 'Agregar Ingreso',
  expense: 'Agregar Egreso',
  transfer: 'Agregar Operación',
}

function getPlanCtaLabel(cta: PlanDeCuentas): string {
  const account = cta.accounts?.[0]
  if (account) {
    return `${cta.codigo} - ${cta.nombre} (${account.name})`
  }
  return `${cta.codigo} - ${cta.nombre}`
}

function localDateTimeString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AddOperationDialog({ open, onOpenChange, operationType, onSubmit }: AddOperationDialogProps) {
  const [formData, setFormData] = useState<OperationFormData>({
    amount: '',
    origin_plan_cta_id: null,
    destination_plan_cta_id: null,
    transfer_type_id: null,
    date: localDateTimeString(),
    description: '',
  })
  const [planDeCuentas, setPlanDeCuentas] = useState<PlanDeCuentas[]>([])
  const [transferTypes, setTransferTypes] = useState<TransferType[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      const promises: Promise<any>[] = [
        accountingService.getPlanDeCuentas(),
      ]
      if (operationType === 'transfer') {
        promises.push(accountingService.getTransferTypes())
      }
      const [cuentasData, typesData] = await Promise.all(promises)
      setPlanDeCuentas(cuentasData)
      if (typesData) setTransferTypes(typesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter cuentas by context: for origin of income, show ingreso-type cuentas + activo (caja/banco).
  // For simplicity, show ALL active cuentas in both selectors and let the user choose.
  const activeCuentas = useMemo(() =>
    planDeCuentas.filter(c => c.is_active),
    [planDeCuentas]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.origin_plan_cta_id && !formData.destination_plan_cta_id) {
      alert('Selecciona al menos una cuenta de origen o destino')
      return
    }

    if (formData.origin_plan_cta_id && formData.destination_plan_cta_id &&
        formData.origin_plan_cta_id === formData.destination_plan_cta_id) {
      alert('Las cuentas de origen y destino deben ser diferentes')
      return
    }

    try {
      setLoading(true)
      await onSubmit?.(formData)
      setFormData({
        amount: '',
        origin_plan_cta_id: null,
        destination_plan_cta_id: null,
        transfer_type_id: null,
        date: localDateTimeString(),
        description: '',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating operation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{TITLES[operationType]}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
              Monto
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <Label htmlFor="origin" className="text-sm font-medium text-gray-700">
              Origen
            </Label>
            <Select
              value={formData.origin_plan_cta_id ? String(formData.origin_plan_cta_id) : 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, origin_plan_cta_id: value === 'none' ? null : parseInt(value) })
              }
              disabled={loading}
            >
              <SelectTrigger id="origin">
                <SelectValue placeholder="Seleccionar origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {activeCuentas.map((cta) => (
                  <SelectItem key={cta.id} value={String(cta.id)}>
                    {getPlanCtaLabel(cta)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-medium text-gray-700">
              Destino
            </Label>
            <Select
              value={formData.destination_plan_cta_id ? String(formData.destination_plan_cta_id) : 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, destination_plan_cta_id: value === 'none' ? null : parseInt(value) })
              }
              disabled={loading}
            >
              <SelectTrigger id="destination">
                <SelectValue placeholder="Seleccionar destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin especificar</SelectItem>
                {activeCuentas.map((cta) => (
                  <SelectItem key={cta.id} value={String(cta.id)}>
                    {getPlanCtaLabel(cta)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Type (only for transfers) */}
          {operationType === 'transfer' && (
            <div className="space-y-2">
              <Label htmlFor="transferType" className="text-sm font-medium text-gray-700">
                Tipo de Operación (Opcional)
              </Label>
              <Select
                value={formData.transfer_type_id ? String(formData.transfer_type_id) : 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, transfer_type_id: value === 'none' ? null : parseInt(value) })
                }
                disabled={loading}
              >
                <SelectTrigger id="transferType">
                  <SelectValue placeholder="Sin tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tipo</SelectItem>
                  {transferTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium text-gray-700">
              Fecha y Hora
            </Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción (Opcional)
            </Label>
            <textarea
              id="description"
              placeholder="Descripción de la operación"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold h-12 text-base"
            disabled={loading}
          >
            {loading ? 'Guardando...' : SUBMIT_LABELS[operationType]}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

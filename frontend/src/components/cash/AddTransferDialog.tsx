import { useState, useEffect } from 'react'
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
import type { Account, TransferType } from '@/types/accounting'

interface AddTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: TransferFormData) => void
}

export interface TransferFormData {
  amount: string
  from_account_id: number
  to_account_id: number
  transfer_type_id: number | null
  date: string
  description: string
}

export function AddTransferDialog({ open, onOpenChange, onSubmit }: AddTransferDialogProps) {
  const [formData, setFormData] = useState<TransferFormData>({
    from_account_id: 0,
    to_account_id: 0,
    amount: '',
    transfer_type_id: null,
    date: new Date().toISOString().slice(0, 16),
    description: '',
  })
  const [accounts, setAccounts] = useState<Account[]>([])
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
      const [accountsResponse, typesData] = await Promise.all([
        accountingService.getAccounts({ is_active: true }),
        accountingService.getTransferTypes(),
      ])
      setAccounts(accountsResponse.data)
      setTransferTypes(typesData)

      // Set default accounts if available
      if (accountsResponse.data.length > 0) {
        if (!formData.from_account_id) {
          setFormData(prev => ({ ...prev, from_account_id: accountsResponse.data[0].id }))
        }
        if (!formData.to_account_id && accountsResponse.data.length > 1) {
          setFormData(prev => ({ ...prev, to_account_id: accountsResponse.data[1].id }))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.from_account_id || !formData.to_account_id) {
      alert('Por favor selecciona las cuentas de origen y destino')
      return
    }

    if (formData.from_account_id === formData.to_account_id) {
      alert('Las cuentas de origen y destino deben ser diferentes')
      return
    }

    try {
      setLoading(true)
      await onSubmit?.(formData)
      // Reset form
      setFormData({
        from_account_id: accounts.length > 0 ? accounts[0].id : 0,
        to_account_id: accounts.length > 1 ? accounts[1].id : 0,
        amount: '',
        transfer_type_id: null,
        date: new Date().toISOString().slice(0, 16),
        description: '',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating transfer:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agregar Transferencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* From Account */}
          <div className="space-y-2">
            <Label htmlFor="fromAccount" className="text-sm font-medium text-gray-700">
              Desde
            </Label>
            <Select
              value={String(formData.from_account_id)}
              onValueChange={(value) => setFormData({ ...formData, from_account_id: parseInt(value) })}
              disabled={loading || accounts.length === 0}
            >
              <SelectTrigger id="fromAccount">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name} ({account.type}) - {account.currency} {(parseFloat(account.current_balance) || 0).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Account */}
          <div className="space-y-2">
            <Label htmlFor="toAccount" className="text-sm font-medium text-gray-700">
              Hacia
            </Label>
            <Select
              value={String(formData.to_account_id)}
              onValueChange={(value) => setFormData({ ...formData, to_account_id: parseInt(value) })}
              disabled={loading || accounts.length === 0}
            >
              <SelectTrigger id="toAccount">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name} ({account.type}) - {account.currency} {(parseFloat(account.current_balance) || 0).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Transfer Type */}
          <div className="space-y-2">
            <Label htmlFor="transferType" className="text-sm font-medium text-gray-700">
              Tipo de Transferencia (Opcional)
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
              placeholder="Descripción de la transferencia"
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
            disabled={loading || accounts.length < 2}
          >
            {loading ? 'Guardando...' : 'Agregar Transferencia'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

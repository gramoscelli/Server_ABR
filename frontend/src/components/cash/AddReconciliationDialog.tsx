import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import { accountingService } from '@/lib/accountingService'
import type { Account, CashReconciliation } from '@/types/accounting'

export interface ReconciliationFormData {
  account_id: number
  date: string
  expected_balance: string
  actual_balance: string
  notes: string
}

interface AddReconciliationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ReconciliationFormData) => void | Promise<void>
  reconciliation?: CashReconciliation | null
}

export function AddReconciliationDialog({ open, onOpenChange, onSubmit, reconciliation }: AddReconciliationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [formData, setFormData] = useState<ReconciliationFormData>({
    account_id: 0,
    date: new Date().toISOString().slice(0, 16),
    expected_balance: '0',
    actual_balance: '0',
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchAccounts()
    }
  }, [open])

  useEffect(() => {
    if (reconciliation) {
      setFormData({
        account_id: reconciliation.account_id,
        date: reconciliation.date,
        expected_balance: String(reconciliation.expected_balance),
        actual_balance: String(reconciliation.actual_balance),
        notes: reconciliation.notes || '',
      })
    } else {
      setFormData({
        account_id: accounts[0]?.id || 0,
        date: new Date().toISOString().slice(0, 16),
        expected_balance: '0',
        actual_balance: '0',
        notes: '',
      })
    }
  }, [reconciliation, open, accounts])

  const fetchAccounts = async () => {
    try {
      const response = await accountingService.getAccounts({ type: 'cash', is_active: true })
      setAccounts(response.data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  const difference = Number(formData.actual_balance) - Number(formData.expected_balance)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {reconciliation ? 'Editar' : 'Nuevo'} Arqueo de Caja
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="account_id">Cuenta *</Label>
            <Select
              value={String(formData.account_id)}
              onValueChange={(value) => setFormData({ ...formData, account_id: Number(value) })}
              disabled={loading || !!reconciliation}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name} - {account.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Fecha y Hora *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="expected_balance">Balance Esperado *</Label>
            <Input
              id="expected_balance"
              type="number"
              step="0.01"
              value={formData.expected_balance}
              onChange={(e) => setFormData({ ...formData, expected_balance: e.target.value })}
              required
              disabled={loading}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Balance que debería tener según el sistema
            </p>
          </div>

          <div>
            <Label htmlFor="actual_balance">Balance Real *</Label>
            <Input
              id="actual_balance"
              type="number"
              step="0.01"
              value={formData.actual_balance}
              onChange={(e) => setFormData({ ...formData, actual_balance: e.target.value })}
              required
              disabled={loading}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Balance real contado físicamente
            </p>
          </div>

          {(formData.expected_balance !== '0' || formData.actual_balance !== '0') && (
            <div className={`p-3 rounded-lg ${
              difference === 0
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Diferencia:</span>
                <span className={`font-bold text-lg ${
                  difference === 0
                    ? 'text-green-600'
                    : difference > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                </span>
              </div>
              {difference === 0 && (
                <p className="text-xs text-green-600 mt-1">Los balances coinciden</p>
              )}
              {difference !== 0 && (
                <p className="text-xs text-yellow-700 mt-1">
                  {difference > 0 ? 'Sobrante' : 'Faltante'} en caja
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              placeholder="Observaciones sobre el arqueo..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : reconciliation ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

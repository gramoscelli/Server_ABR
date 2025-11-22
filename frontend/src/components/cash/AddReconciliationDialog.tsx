import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect, useCallback } from 'react'
import { accountingService } from '@/lib/accountingService'
import type { Account, CashReconciliation, CalculatedBalance } from '@/types/accounting'
import { Calculator, Loader2 } from 'lucide-react'

export interface ReconciliationFormData {
  account_id: number
  date: string
  opening_balance: number
  closing_balance: number
  expected_balance: number
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
  const [calculating, setCalculating] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [calculatedData, setCalculatedData] = useState<CalculatedBalance | null>(null)
  const [formData, setFormData] = useState<ReconciliationFormData>({
    account_id: 0,
    date: new Date().toISOString().split('T')[0],
    opening_balance: 0,
    closing_balance: 0,
    expected_balance: 0,
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
        opening_balance: Number(reconciliation.opening_balance),
        closing_balance: Number(reconciliation.closing_balance),
        expected_balance: Number(reconciliation.expected_balance),
        notes: reconciliation.notes || '',
      })
      setCalculatedData(null)
    } else {
      const defaultAccountId = accounts[0]?.id || 0
      setFormData({
        account_id: defaultAccountId,
        date: new Date().toISOString().split('T')[0],
        opening_balance: 0,
        closing_balance: 0,
        expected_balance: 0,
        notes: '',
      })
      setCalculatedData(null)
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

  const calculateBalance = useCallback(async (accountId: number, date: string) => {
    if (!accountId || !date) return

    setCalculating(true)
    try {
      const result = await accountingService.calculateExpectedBalance(accountId, date)
      setCalculatedData(result)
      setFormData(prev => ({
        ...prev,
        opening_balance: Number(result.opening_balance),
        expected_balance: Number(result.expected_balance),
      }))
    } catch (error) {
      console.error('Error calculating balance:', error)
      setCalculatedData(null)
    } finally {
      setCalculating(false)
    }
  }, [])

  // Calculate when account or date changes (only for new reconciliations)
  useEffect(() => {
    if (!reconciliation && formData.account_id && formData.date) {
      const timer = setTimeout(() => {
        calculateBalance(formData.account_id, formData.date)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [formData.account_id, formData.date, reconciliation, calculateBalance])

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

  const difference = formData.closing_balance - formData.expected_balance

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {reconciliation ? 'Editar' : 'Nuevo'} Arqueo de Caja
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={loading || !!reconciliation}
              />
            </div>
          </div>

          {/* Calculated Balance Info */}
          {calculating ? (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Calculando balances...</span>
            </div>
          ) : calculatedData && !reconciliation ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Balance calculado para el día</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Saldo apertura:</span>
                  <span className="ml-2 font-medium">${Number(calculatedData.opening_balance).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ingresos:</span>
                  <span className="ml-2 font-medium text-green-600">+${Number(calculatedData.incomes).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Egresos:</span>
                  <span className="ml-2 font-medium text-red-600">-${Number(calculatedData.expenses).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Transf. entrada:</span>
                  <span className="ml-2 font-medium text-green-600">+${Number(calculatedData.incoming_transfers).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Transf. salida:</span>
                  <span className="ml-2 font-medium text-red-600">-${Number(calculatedData.outgoing_transfers).toFixed(2)}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-200">
                  <span className="text-gray-700 font-medium">Saldo esperado:</span>
                  <span className="ml-2 font-bold text-blue-800">${Number(calculatedData.expected_balance).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening_balance">Saldo Apertura</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={(e) => setFormData({ ...formData, opening_balance: Number(e.target.value) })}
                disabled={loading || (!reconciliation && !!calculatedData)}
                placeholder="0.00"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Calculado automáticamente
              </p>
            </div>

            <div>
              <Label htmlFor="expected_balance">Saldo Esperado</Label>
              <Input
                id="expected_balance"
                type="number"
                step="0.01"
                value={formData.expected_balance}
                onChange={(e) => setFormData({ ...formData, expected_balance: Number(e.target.value) })}
                disabled={loading || (!reconciliation && !!calculatedData)}
                placeholder="0.00"
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Según movimientos del sistema
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="closing_balance">Saldo Real (Conteo Físico) *</Label>
            <Input
              id="closing_balance"
              type="number"
              step="0.01"
              value={formData.closing_balance || ''}
              onChange={(e) => setFormData({ ...formData, closing_balance: Number(e.target.value) })}
              required
              disabled={loading}
              placeholder="Ingrese el dinero contado físicamente"
              className="text-lg font-medium"
            />
            <p className="text-xs text-gray-500 mt-1">
              Dinero real contado en la caja
            </p>
          </div>

          {(formData.expected_balance !== 0 || formData.closing_balance !== 0) && (
            <div className={`p-4 rounded-lg ${
              difference === 0
                ? 'bg-green-50 border-2 border-green-300'
                : Math.abs(difference) < 10
                ? 'bg-yellow-50 border-2 border-yellow-300'
                : 'bg-red-50 border-2 border-red-300'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Diferencia:</span>
                <span className={`font-bold text-xl ${
                  difference === 0
                    ? 'text-green-600'
                    : difference > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {difference >= 0 ? '+' : ''}${difference.toFixed(2)}
                </span>
              </div>
              {difference === 0 ? (
                <p className="text-sm text-green-700 mt-1 font-medium">
                  ✓ Los balances coinciden perfectamente
                </p>
              ) : (
                <p className="text-sm mt-1">
                  {difference > 0 ? (
                    <span className="text-green-700">Sobrante en caja: hay ${difference.toFixed(2)} más de lo esperado</span>
                  ) : (
                    <span className="text-red-700">Faltante en caja: faltan ${Math.abs(difference).toFixed(2)}</span>
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas / Observaciones</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              placeholder="Observaciones sobre el arqueo, explicación de diferencias..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || calculating || formData.closing_balance === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Guardando...' : reconciliation ? 'Actualizar Arqueo' : 'Registrar Arqueo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

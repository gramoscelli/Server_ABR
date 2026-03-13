import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect, useCallback } from 'react'
import * as accountingService from '@/lib/accountingService'
import type { CuentaContable, CashReconciliation } from '@/types/accounting'
import { Calculator, Loader2 } from 'lucide-react'
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'

export interface ReconciliationFormData {
  id_cuenta: number
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
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [calculatedData, setCalculatedData] = useState<{ opening_balance: string; total_debe: string; total_haber: string; expected_balance: string } | null>(null)
  const [formData, setFormData] = useState<ReconciliationFormData>({
    id_cuenta: 0,
    date: new Date().toLocaleDateString('en-CA'),
    opening_balance: 0,
    closing_balance: 0,
    expected_balance: 0,
    notes: '',
  })

  useEffect(() => {
    if (open) {
      fetchCuentas()
    }
  }, [open])

  useEffect(() => {
    if (reconciliation) {
      setFormData({
        id_cuenta: reconciliation.id_cuenta,
        date: reconciliation.date,
        opening_balance: Number(reconciliation.opening_balance),
        closing_balance: Number(reconciliation.closing_balance),
        expected_balance: Number(reconciliation.expected_balance),
        notes: reconciliation.notes || '',
      })
      setCalculatedData(null)
    } else {
      const defaultCuentaId = cuentas[0]?.id || 0
      setFormData({
        id_cuenta: defaultCuentaId,
        date: new Date().toLocaleDateString('en-CA'),
        opening_balance: 0,
        closing_balance: 0,
        expected_balance: 0,
        notes: '',
      })
      setCalculatedData(null)
    }
  }, [reconciliation, open, cuentas])

  const fetchCuentas = async () => {
    try {
      const response = await accountingService.getCuentas({ subtipo: 'efectivo', is_active: true })
      setCuentas(response.data || [])
    } catch (error) {
      console.error('Error fetching cuentas:', error)
    }
  }

  const calculateBalance = useCallback(async (cuentaId: number, date: string) => {
    if (!cuentaId || !date) return

    setCalculating(true)
    try {
      const result = await accountingService.calculateExpectedBalance(cuentaId, date)
      setCalculatedData(result.data)
      setFormData(prev => ({
        ...prev,
        opening_balance: Number(result.data.opening_balance),
        expected_balance: Number(result.data.expected_balance),
      }))
    } catch (error) {
      console.error('Error calculating balance:', error)
      setCalculatedData(null)
    } finally {
      setCalculating(false)
    }
  }, [])

  useEffect(() => {
    if (!reconciliation && formData.id_cuenta && formData.date) {
      const timer = setTimeout(() => {
        calculateBalance(formData.id_cuenta, formData.date)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [formData.id_cuenta, formData.date, reconciliation, calculateBalance])

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
              <Label htmlFor="id_cuenta">Cuenta de Efectivo *</Label>
              <Select
                value={String(formData.id_cuenta)}
                onValueChange={(value) => setFormData({ ...formData, id_cuenta: Number(value) })}
                disabled={loading || !!reconciliation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((cuenta) => (
                    <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                      {cuenta.codigo} - {cuenta.titulo}
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
                  <span className="ml-2 font-medium">{formatCurrency(Number(calculatedData.opening_balance))}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Debe:</span>
                  <span className="ml-2 font-medium text-green-600">+{formatCurrency(Number(calculatedData.total_debe))}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Haber:</span>
                  <span className="ml-2 font-medium text-red-600">-{formatCurrency(Number(calculatedData.total_haber))}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-blue-200">
                  <span className="text-gray-700 font-medium">Saldo esperado:</span>
                  <span className="ml-2 font-bold text-blue-800">{formatCurrency(Number(calculatedData.expected_balance))}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening_balance">Saldo Apertura</Label>
              <CurrencyInput
                id="opening_balance"
                value={formData.opening_balance}
                onValueChange={(v) => setFormData({ ...formData, opening_balance: v })}
                disabled={loading || (!reconciliation && !!calculatedData)}
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Calculado automáticamente
              </p>
            </div>

            <div>
              <Label htmlFor="expected_balance">Saldo Esperado</Label>
              <CurrencyInput
                id="expected_balance"
                value={formData.expected_balance}
                onValueChange={(v) => setFormData({ ...formData, expected_balance: v })}
                disabled={loading || (!reconciliation && !!calculatedData)}
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Según movimientos del sistema
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="closing_balance">Saldo Real (Conteo Físico) *</Label>
            <CurrencyInput
              id="closing_balance"
              value={formData.closing_balance}
              onValueChange={(v) => setFormData({ ...formData, closing_balance: v })}
              required
              disabled={loading}
              placeholder="$ 0,00"
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
                  {difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}
                </span>
              </div>
              {difference === 0 ? (
                <p className="text-sm text-green-700 mt-1 font-medium">
                  Los balances coinciden perfectamente
                </p>
              ) : (
                <p className="text-sm mt-1">
                  {difference > 0 ? (
                    <span className="text-green-700">Sobrante en caja: hay {formatCurrency(difference)} más de lo esperado</span>
                  ) : (
                    <span className="text-red-700">Faltante en caja: faltan {formatCurrency(Math.abs(difference))}</span>
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

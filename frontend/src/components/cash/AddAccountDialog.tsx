import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import { accountingService } from '@/lib/accountingService'
import type { Account, PlanDeCuentas } from '@/types/accounting'

export interface AccountFormData {
  name: string
  type: 'cash' | 'bank' | 'other'
  account_number: string
  bank_name: string
  currency: string
  initial_balance: string
  is_active: boolean
  notes: string
  plan_cta_id: number | null
}

interface AddAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AccountFormData) => void | Promise<void>
  account?: Account | null
}

export function AddAccountDialog({ open, onOpenChange, onSubmit, account }: AddAccountDialogProps) {
  const [loading, setLoading] = useState(false)
  const [planCuentas, setPlanCuentas] = useState<PlanDeCuentas[]>([])
  const [usedPlanCtaIds, setUsedPlanCtaIds] = useState<number[]>([])
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'cash',
    account_number: '',
    bank_name: '',
    currency: 'ARS',
    initial_balance: '0',
    is_active: true,
    notes: '',
    plan_cta_id: null,
  })

  // Load plan de cuentas (grupo 11 and 12) and used plan_cta_ids when dialog opens
  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      try {
        const [allPlanCuentas, accountsResponse] = await Promise.all([
          accountingService.getPlanDeCuentas(),
          accountingService.getAccounts(),
        ])

        // Filter to only grupo 11 (Caja) and 12 (Bancos), active only
        const filtered = allPlanCuentas.filter(
          (pc) => ['11', '12'].includes(pc.grupo) && pc.is_active
        )
        setPlanCuentas(filtered)

        // Get plan_cta_ids already used by other accounts
        const accounts = accountsResponse.data || []
        const used = accounts
          .filter((acc) => acc.plan_cta_id && (!account || acc.id !== account.id))
          .map((acc) => acc.plan_cta_id)
        setUsedPlanCtaIds(used)
      } catch (error) {
        console.error('Error loading plan de cuentas:', error)
      }
    }

    loadData()
  }, [open, account])

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        account_number: account.account_number || '',
        bank_name: account.bank_name || '',
        currency: account.currency,
        initial_balance: String(account.initial_balance),
        is_active: account.is_active,
        notes: account.notes || '',
        plan_cta_id: account.plan_cta_id,
      })
    } else {
      setFormData({
        name: '',
        type: 'cash',
        account_number: '',
        bank_name: '',
        currency: 'ARS',
        initial_balance: '0',
        is_active: true,
        notes: '',
        plan_cta_id: null,
      })
    }
  }, [account, open])

  const handlePlanCtaChange = (value: string) => {
    const planCtaId = Number(value)
    const selected = planCuentas.find((pc) => pc.id === planCtaId)
    setFormData({
      ...formData,
      plan_cta_id: planCtaId,
      name: selected ? selected.nombre : formData.name,
    })
  }

  const availablePlanCuentas = planCuentas.filter(
    (pc) => !usedPlanCtaIds.includes(pc.id) || (account && pc.id === account.plan_cta_id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plan_cta_id) return
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{account ? 'Editar Cuenta' : 'Nueva Cuenta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="plan_cta_id">Cuenta Contable *</Label>
              <Select
                value={formData.plan_cta_id ? String(formData.plan_cta_id) : ''}
                onValueChange={handlePlanCtaChange}
                disabled={loading}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta del plan..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlanCuentas.map((pc) => (
                    <SelectItem key={pc.id} value={String(pc.id)}>
                      {pc.codigo} - {pc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Solo cuentas del grupo Caja (11) y Bancos (12)
              </p>
            </div>

            <div className="col-span-2">
              <Label htmlFor="name">Nombre de la Cuenta *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                placeholder="Ej: Caja General, Banco Galicia"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'cash' | 'bank' | 'other') =>
                  setFormData({ ...formData, type: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="bank">Banco</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Moneda *</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Peso Argentino)</SelectItem>
                  <SelectItem value="USD">USD (Dólar)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'bank' && (
              <>
                <div>
                  <Label htmlFor="bank_name">Nombre del Banco</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    disabled={loading}
                    placeholder="Ej: Banco Galicia"
                  />
                </div>

                <div>
                  <Label htmlFor="account_number">Número de Cuenta</Label>
                  <Input
                    id="account_number"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    disabled={loading}
                    placeholder="Ej: 1234567890"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="initial_balance">Balance Inicial *</Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                value={formData.initial_balance}
                onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                required
                disabled={loading || !!account}
                placeholder="0.00"
              />
              {account && (
                <p className="text-xs text-gray-500 mt-1">
                  El balance inicial no se puede modificar
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                disabled={loading}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Cuenta Activa
              </Label>
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
                placeholder="Notas adicionales sobre esta cuenta..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.plan_cta_id}>
              {loading ? 'Guardando...' : account ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

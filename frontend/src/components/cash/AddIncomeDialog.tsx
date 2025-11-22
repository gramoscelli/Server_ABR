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
import type { Account, IncomeCategory } from '@/types/accounting'

interface AddIncomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: IncomeFormData) => void
}

export interface IncomeFormData {
  amount: string
  account_id: number
  date: string
  category_id: number | null
  description: string
  attachment_url?: string
}

export function AddIncomeDialog({ open, onOpenChange, onSubmit }: AddIncomeDialogProps) {
  const [formData, setFormData] = useState<IncomeFormData>({
    amount: '',
    account_id: 0,
    date: new Date().toISOString().slice(0, 16),
    category_id: null,
    description: '',
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      setLoading(true)
      const [accountsResponse, categoriesData] = await Promise.all([
        accountingService.getAccounts({ is_active: true }),
        accountingService.getIncomeCategories(),
      ])
      setAccounts(accountsResponse.data)
      setCategories(categoriesData)

      // Set default account if available
      if (accountsResponse.data.length > 0 && !formData.account_id) {
        setFormData(prev => ({ ...prev, account_id: accountsResponse.data[0].id }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const flattenCategories = (cats: IncomeCategory[]): IncomeCategory[] => {
    let result: IncomeCategory[] = []
    for (const cat of cats) {
      result.push(cat)
      if (cat.subcategories && cat.subcategories.length > 0) {
        result = result.concat(flattenCategories(cat.subcategories))
      }
    }
    return result
  }

  const allCategories = flattenCategories(categories)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_id) {
      alert('Por favor selecciona una cuenta')
      return
    }

    try {
      setLoading(true)
      await onSubmit?.(formData)
      // Reset form
      setFormData({
        amount: '',
        account_id: accounts.length > 0 ? accounts[0].id : 0,
        date: new Date().toISOString().slice(0, 16),
        category_id: null,
        description: '',
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating income:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Agregar Ingreso</DialogTitle>
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

          {/* Account & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account" className="text-sm font-medium text-gray-700">
                Cuenta
              </Label>
              <Select
                value={String(formData.account_id)}
                onValueChange={(value) => setFormData({ ...formData, account_id: parseInt(value) })}
                disabled={loading || accounts.length === 0}
              >
                <SelectTrigger id="account">
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium text-gray-700">
              Categoría (Opcional)
            </Label>
            <Select
              value={formData.category_id ? String(formData.category_id) : 'none'}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value === 'none' ? null : parseInt(value) })
              }
              disabled={loading}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Sin Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin Categoría</SelectItem>
                {allCategories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.parent_id ? `  ${category.name}` : category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descripción (Opcional)
            </Label>
            <textarea
              id="description"
              placeholder="Descripción del ingreso"
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
            disabled={loading || accounts.length === 0}
          >
            {loading ? 'Guardando...' : 'Agregar Ingreso'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

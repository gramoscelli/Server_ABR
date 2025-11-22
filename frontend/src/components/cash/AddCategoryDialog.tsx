import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import type { ExpenseCategory, IncomeCategory } from '@/types/accounting'

export interface CategoryFormData {
  name: string
  color: string
  description: string
  is_active: boolean
}

interface AddCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CategoryFormData) => void | Promise<void>
  category?: ExpenseCategory | IncomeCategory | null
  type: 'expense' | 'income'
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F59E0B', // orange
  '#EAB308', // yellow
  '#84CC16', // lime
  '#10B981', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#0EA5E9', // sky
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#EC4899', // pink
  '#F43F5E', // rose
]

export function AddCategoryDialog({ open, onOpenChange, onSubmit, category, type }: AddCategoryDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    color: PRESET_COLORS[0],
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        color: category.color,
        description: category.description || '',
        is_active: category.is_active ?? true,
      })
    } else {
      setFormData({
        name: '',
        color: PRESET_COLORS[0],
        description: '',
        is_active: true,
      })
    }
  }, [category, open])

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Editar' : 'Nueva'} Categoría de {type === 'expense' ? 'Egresos' : 'Ingresos'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              placeholder={type === 'expense' ? 'Ej: Servicios, Alquiler' : 'Ej: Ventas, Honorarios'}
            />
          </div>

          <div>
            <Label>Color *</Label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Label htmlFor="custom_color" className="text-sm">Color personalizado:</Label>
              <input
                id="custom_color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-20 rounded border border-gray-300"
                disabled={loading}
              />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              placeholder="Descripción opcional de la categoría..."
              rows={3}
            />
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
              Categoría Activa
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : category ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

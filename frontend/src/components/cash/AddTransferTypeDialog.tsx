import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect } from 'react'
import type { TransferType } from '@/types/accounting'

export interface TransferTypeFormData {
  name: string
  description: string
  is_active: boolean
}

interface AddTransferTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: TransferTypeFormData) => void | Promise<void>
  transferType?: TransferType | null
}

export function AddTransferTypeDialog({ open, onOpenChange, onSubmit, transferType }: AddTransferTypeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<TransferTypeFormData>({
    name: '',
    description: '',
    is_active: true,
  })

  useEffect(() => {
    if (transferType) {
      setFormData({
        name: transferType.name,
        description: transferType.description || '',
        is_active: transferType.is_active,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        is_active: true,
      })
    }
  }, [transferType, open])

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
            {transferType ? 'Editar' : 'Nuevo'} Tipo de Transferencia
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
              placeholder="Ej: Depósito, Extracción, Transferencia interna"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              placeholder="Descripción opcional del tipo de transferencia..."
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
              Tipo Activo
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : transferType ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'
import type { PlanDeCuentas } from '@/types/accounting'

export interface PlanCuentaFormData {
  codigo: number
  nombre: string
  tipo: string
  grupo: string
}

const TIPO_MAP: Record<string, string> = {
  '1': 'activo',
  '2': 'pasivo',
  '4': 'ingreso',
  '5': 'egreso',
}

const TIPO_LABELS: Record<string, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
}

function deriveTipo(codigo: number): string | null {
  const firstDigit = String(codigo).charAt(0)
  return TIPO_MAP[firstDigit] || null
}

function deriveGrupo(codigo: number): string {
  return String(codigo).substring(0, 2)
}

interface AddPlanCuentaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: PlanCuentaFormData) => void | Promise<void>
  cuenta?: PlanDeCuentas | null
}

export function AddPlanCuentaDialog({ open, onOpenChange, onSubmit, cuenta }: AddPlanCuentaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PlanCuentaFormData>({
    codigo: 0,
    nombre: '',
    tipo: '',
    grupo: '',
  })

  useEffect(() => {
    if (cuenta) {
      setFormData({
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        grupo: cuenta.grupo,
      })
    } else {
      setFormData({
        codigo: 0,
        nombre: '',
        tipo: '',
        grupo: '',
      })
    }
  }, [cuenta, open])

  const handleCodigoChange = (value: string) => {
    const codigo = parseInt(value) || 0
    const tipo = deriveTipo(codigo) || ''
    const grupo = codigo > 0 ? deriveGrupo(codigo) : ''
    setFormData({ ...formData, codigo, tipo, grupo })
  }

  const derivedTipo = formData.codigo > 0 ? deriveTipo(formData.codigo) : null
  const isCodigoValid = formData.codigo === 0 || derivedTipo !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!derivedTipo) return
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

  const isEditing = !!cuenta

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar' : 'Agregar'} Cuenta
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="codigo">Código *</Label>
            <Input
              id="codigo"
              type="number"
              value={formData.codigo || ''}
              onChange={(e) => handleCodigoChange(e.target.value)}
              required
              disabled={loading || isEditing}
              placeholder="Ej: 1101, 2101, 4101"
            />
            {!isEditing && formData.codigo > 0 && (
              <p className={`text-sm mt-1 ${isCodigoValid ? 'text-gray-600' : 'text-red-600 font-medium'}`}>
                {isCodigoValid
                  ? `Tipo: ${TIPO_LABELS[derivedTipo!]} — Grupo: ${deriveGrupo(formData.codigo)}`
                  : 'Código inválido: debe empezar con 1, 2, 4 o 5'}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              disabled={loading}
              placeholder="Nombre de la cuenta"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || (!isEditing && !isCodigoValid) || (!isEditing && formData.codigo === 0)}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

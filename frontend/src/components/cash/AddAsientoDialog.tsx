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
import { createAsiento } from '@/lib/accountingService'
import type { CuentaContable, CreateAsientoData, CreateAsientoDetalleData } from '@/types/accounting'

interface DetalleRow {
  key: number
  id_cuenta: number | null
  tipo_mov: 'debe' | 'haber'
  importe: string
  referencia_operativa: string
}

interface AddAsientoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  cuentas: CuentaContable[]
}

function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

let rowKeyCounter = 0
function nextKey(): number {
  return ++rowKeyCounter
}

function emptyRow(tipo_mov: 'debe' | 'haber' = 'debe'): DetalleRow {
  return { key: nextKey(), id_cuenta: null, tipo_mov, importe: '', referencia_operativa: '' }
}

function getCuentaLabel(c: CuentaContable): string {
  return `${c.codigo} - ${c.titulo}`
}

const ORIGEN_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'ajuste', label: 'Ajuste' },
] as const

export function AddAsientoDialog({ open, onOpenChange, onSuccess, cuentas }: AddAsientoDialogProps) {
  const [fecha, setFecha] = useState(localDateString())
  const [concepto, setConcepto] = useState('')
  const [origen, setOrigen] = useState<string>('manual')
  const [detalles, setDetalles] = useState<DetalleRow[]>([emptyRow('debe'), emptyRow('haber')])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCuentas = useMemo(() => cuentas.filter(c => c.is_active), [cuentas])

  // Group cuentas by tipo for quick-fill helpers
  const cuentasByTipo = useMemo(() => {
    const map: Record<string, CuentaContable[]> = {}
    for (const c of activeCuentas) {
      if (!map[c.tipo]) map[c.tipo] = []
      map[c.tipo].push(c)
    }
    return map
  }, [activeCuentas])

  useEffect(() => {
    if (open) {
      setFecha(localDateString())
      setConcepto('')
      setOrigen('manual')
      setDetalles([emptyRow('debe'), emptyRow('haber')])
      setError(null)
    }
  }, [open])

  const totalDebe = useMemo(
    () => detalles.reduce((sum, d) => d.tipo_mov === 'debe' ? sum + (parseFloat(d.importe) || 0) : sum, 0),
    [detalles]
  )
  const totalHaber = useMemo(
    () => detalles.reduce((sum, d) => d.tipo_mov === 'haber' ? sum + (parseFloat(d.importe) || 0) : sum, 0),
    [detalles]
  )
  const difference = Math.abs(totalDebe - totalHaber)
  const isBalanced = difference < 0.005 && totalDebe > 0

  const updateRow = (key: number, field: keyof DetalleRow, value: string | number | null) => {
    setDetalles(prev => prev.map(d => d.key === key ? { ...d, [field]: value } : d))
  }

  const removeRow = (key: number) => {
    setDetalles(prev => prev.length > 2 ? prev.filter(d => d.key !== key) : prev)
  }

  const addRow = () => {
    setDetalles(prev => [...prev, emptyRow('debe')])
  }

  // Quick shortcut helpers
  const findFirstCuenta = (tipo: string, subtipo?: string): number | null => {
    const list = cuentasByTipo[tipo] || []
    if (subtipo) {
      const match = list.find(c => c.subtipo === subtipo)
      if (match) return match.id
    }
    return list[0]?.id ?? null
  }

  const handleIngresoRapido = () => {
    const cajaId = findFirstCuenta('activo', 'efectivo')
    const ingresoId = findFirstCuenta('ingreso')
    setOrigen('ingreso')
    setDetalles([
      { key: nextKey(), id_cuenta: cajaId, tipo_mov: 'debe', importe: '', referencia_operativa: '' },
      { key: nextKey(), id_cuenta: ingresoId, tipo_mov: 'haber', importe: '', referencia_operativa: '' },
    ])
  }

  const handleEgresoRapido = () => {
    const cajaId = findFirstCuenta('activo', 'efectivo')
    const egresoId = findFirstCuenta('egreso')
    setOrigen('egreso')
    setDetalles([
      { key: nextKey(), id_cuenta: egresoId, tipo_mov: 'debe', importe: '', referencia_operativa: '' },
      { key: nextKey(), id_cuenta: cajaId, tipo_mov: 'haber', importe: '', referencia_operativa: '' },
    ])
  }

  const handleTransferenciaRapida = () => {
    setOrigen('transferencia')
    setDetalles([
      { key: nextKey(), id_cuenta: null, tipo_mov: 'debe', importe: '', referencia_operativa: '' },
      { key: nextKey(), id_cuenta: null, tipo_mov: 'haber', importe: '', referencia_operativa: '' },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isBalanced) {
      setError('El asiento debe estar balanceado (Debe = Haber)')
      return
    }

    const validDetalles: CreateAsientoDetalleData[] = []
    for (const d of detalles) {
      const importe = parseFloat(d.importe)
      if (!d.id_cuenta || isNaN(importe) || importe <= 0) {
        setError('Cada fila debe tener una cuenta e importe mayor a 0')
        return
      }
      validDetalles.push({
        id_cuenta: d.id_cuenta,
        tipo_mov: d.tipo_mov,
        importe,
        referencia_operativa: d.referencia_operativa || undefined,
      })
    }

    const data: CreateAsientoData = {
      fecha,
      concepto,
      origen,
      estado: 'confirmado',
      detalles: validDetalles,
    }

    try {
      setLoading(true)
      await createAsiento(data)
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Error creating asiento:', err)
      setError(err?.message || 'Error al crear el asiento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Nuevo Asiento Contable</DialogTitle>
        </DialogHeader>

        {/* Quick shortcuts */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleIngresoRapido} disabled={loading}>
            Ingreso Rapido
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleEgresoRapido} disabled={loading}>
            Egreso Rapido
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleTransferenciaRapida} disabled={loading}>
            Transferencia Rapida
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asiento-fecha" className="text-sm font-medium text-gray-700">
                Fecha
              </Label>
              <Input
                id="asiento-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asiento-concepto" className="text-sm font-medium text-gray-700">
                Concepto
              </Label>
              <Input
                id="asiento-concepto"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Descripcion del asiento"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asiento-origen" className="text-sm font-medium text-gray-700">
                Origen
              </Label>
              <Select value={origen} onValueChange={setOrigen} disabled={loading}>
                <SelectTrigger id="asiento-origen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Detalles table */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Detalles</Label>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Cuenta</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-32">Importe</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-36">Referencia</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((row) => (
                    <tr key={row.key} className="border-t">
                      <td className="px-2 py-1">
                        <Select
                          value={row.id_cuenta ? String(row.id_cuenta) : 'none'}
                          onValueChange={(v) => updateRow(row.key, 'id_cuenta', v === 'none' ? null : parseInt(v))}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Seleccionar cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar...</SelectItem>
                            {activeCuentas.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {getCuentaLabel(c)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Select
                          value={row.tipo_mov}
                          onValueChange={(v) => updateRow(row.key, 'tipo_mov', v)}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="debe">Debe</SelectItem>
                            <SelectItem value="haber">Haber</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={row.importe}
                          onChange={(e) => updateRow(row.key, 'importe', e.target.value)}
                          className="h-9 text-xs"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="text"
                          placeholder="Opcional"
                          value={row.referencia_operativa}
                          onChange={(e) => updateRow(row.key, 'referencia_operativa', e.target.value)}
                          className="h-9 text-xs"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeRow(row.key)}
                          disabled={loading || detalles.length <= 2}
                          title="Eliminar fila"
                        >
                          X
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={loading}>
              + Agregar fila
            </Button>
          </div>

          {/* Balance summary */}
          <div className="flex items-center gap-4 text-sm font-medium rounded-md bg-gray-50 px-4 py-3">
            <span>Total Debe: <span className="text-blue-700">${totalDebe.toFixed(2)}</span></span>
            <span>Total Haber: <span className="text-blue-700">${totalHaber.toFixed(2)}</span></span>
            <span className={difference > 0.005 ? 'text-red-600 font-bold' : 'text-green-600'}>
              Diferencia: ${difference.toFixed(2)}
            </span>
            {isBalanced && <span className="text-green-600 ml-auto">Balanceado</span>}
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              disabled={loading || !isBalanced}
            >
              {loading ? 'Guardando...' : 'Crear Asiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
import { CurrencyInput } from '@/components/ui/currency-input'
import { formatCurrency } from '@/lib/utils'

interface DetalleRow {
  key: number
  id_cuenta: number | null
  tipo_mov: 'debe' | 'haber'
  importe: number
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
  return { key: nextKey(), id_cuenta: null, tipo_mov, importe: 0, referencia_operativa: '' }
}

// ============================================================================
// CUENTA SEARCH INPUT
// ============================================================================

interface CuentaSearchProps {
  cuentas: CuentaContable[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  disabled?: boolean
}

function CuentaSearchInput({ cuentas, selectedId, onSelect, disabled }: CuentaSearchProps) {
  const [codigoSearch, setCodigoSearch] = useState('')
  const [tituloSearch, setTituloSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeField, setActiveField] = useState<'codigo' | 'titulo' | null>(null)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const codigoRef = useRef<HTMLInputElement>(null)
  const tituloRef = useRef<HTMLInputElement>(null)

  // Sync display when selectedId changes externally (e.g. reset)
  useEffect(() => {
    if (selectedId) {
      const c = cuentas.find(x => x.id === selectedId)
      if (c) {
        setCodigoSearch(String(c.codigo))
        setTituloSearch(c.titulo)
      }
    } else {
      setCodigoSearch('')
      setTituloSearch('')
    }
  }, [selectedId, cuentas])

  const filtered = useMemo(() => {
    const code = codigoSearch.trim()
    const title = tituloSearch.trim().toLowerCase()

    return cuentas.filter(c => {
      const matchCode = !code || String(c.codigo).startsWith(code)
      const matchTitle = !title || c.titulo.toLowerCase().includes(title)
      return matchCode && matchTitle
    }).slice(0, 15)
  }, [cuentas, codigoSearch, tituloSearch])

  const selectCuenta = useCallback((c: CuentaContable) => {
    setCodigoSearch(String(c.codigo))
    setTituloSearch(c.titulo)
    setShowDropdown(false)
    setHighlightIdx(-1)
    onSelect(c.id)
  }, [onSelect])

  const handleCodigoChange = (val: string) => {
    // Only allow digits
    const digits = val.replace(/\D/g, '')
    setCodigoSearch(digits)
    setShowDropdown(true)
    setActiveField('codigo')
    setHighlightIdx(-1)
    // Clear selection if user is typing
    if (selectedId) onSelect(null)
  }

  const handleTituloChange = (val: string) => {
    setTituloSearch(val)
    setShowDropdown(true)
    setActiveField('titulo')
    setHighlightIdx(-1)
    if (selectedId) onSelect(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      selectCuenta(filtered[highlightIdx])
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="flex gap-1 relative">
      <Input
        ref={codigoRef}
        value={codigoSearch}
        onChange={(e) => handleCodigoChange(e.target.value)}
        onFocus={() => { setShowDropdown(true); setActiveField('codigo') }}
        onKeyDown={handleKeyDown}
        placeholder="Código"
        className="h-9 text-xs w-20 font-mono"
        disabled={disabled}
      />
      <Input
        ref={tituloRef}
        value={tituloSearch}
        onChange={(e) => handleTituloChange(e.target.value)}
        onFocus={() => { setShowDropdown(true); setActiveField('titulo') }}
        onKeyDown={handleKeyDown}
        placeholder="Buscar cuenta..."
        className="h-9 text-xs flex-1"
        disabled={disabled}
      />
      {showDropdown && !selectedId && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex gap-2 ${
                idx === highlightIdx ? 'bg-blue-100' : ''
              }`}
              onMouseDown={(e) => { e.preventDefault(); selectCuenta(c) }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              <span className="font-mono text-gray-500 shrink-0">{c.codigo}</span>
              <span className="truncate">{c.titulo}</span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && !selectedId && filtered.length === 0 && (codigoSearch || tituloSearch) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-xs text-gray-500">
          No se encontraron cuentas
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function AddAsientoDialog({ open, onOpenChange, onSuccess, cuentas }: AddAsientoDialogProps) {
  const [fecha, setFecha] = useState(localDateString())
  const [concepto, setConcepto] = useState('')
  const [detalles, setDetalles] = useState<DetalleRow[]>([emptyRow('debe'), emptyRow('haber')])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeCuentas = useMemo(() => cuentas.filter(c => c.is_active), [cuentas])

  useEffect(() => {
    if (open) {
      setFecha(localDateString())
      setConcepto('')
      setDetalles([emptyRow('debe'), emptyRow('haber')])
      setError(null)
    }
  }, [open])

  const totalDebe = useMemo(
    () => detalles.reduce((sum, d) => d.tipo_mov === 'debe' ? sum + (d.importe || 0) : sum, 0),
    [detalles]
  )
  const totalHaber = useMemo(
    () => detalles.reduce((sum, d) => d.tipo_mov === 'haber' ? sum + (d.importe || 0) : sum, 0),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isBalanced) {
      setError('El asiento debe estar balanceado (Debe = Haber)')
      return
    }

    const validDetalles: CreateAsientoDetalleData[] = []
    for (const d of detalles) {
      const importe = d.importe
      if (!d.id_cuenta || !importe || importe <= 0) {
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
      origen: 'manual',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
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
                placeholder="Descripción del asiento"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Detalles table */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Detalles</Label>
            <div className="border rounded-md overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600" colSpan={2}>Cuenta</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-24">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-32">Importe</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 w-32">Referencia</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((row) => (
                    <tr key={row.key} className="border-t">
                      <td className="px-2 py-1" colSpan={2}>
                        <CuentaSearchInput
                          cuentas={activeCuentas}
                          selectedId={row.id_cuenta}
                          onSelect={(id) => updateRow(row.key, 'id_cuenta', id)}
                          disabled={loading}
                        />
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
                        <CurrencyInput
                          value={row.importe}
                          onValueChange={(v) => updateRow(row.key, 'importe', v)}
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
            <span>Total Debe: <span className="text-blue-700">{formatCurrency(totalDebe)}</span></span>
            <span>Total Haber: <span className="text-blue-700">{formatCurrency(totalHaber)}</span></span>
            <span className={difference > 0.005 ? 'text-red-600 font-bold' : 'text-green-600'}>
              Diferencia: {formatCurrency(difference)}
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

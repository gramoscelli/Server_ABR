import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { CurrencyInput } from '@/components/ui/currency-input'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import { toast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'
import * as accountingService from '@/lib/accountingService'
import type { CuentaContable, Asiento, AsientoDetalle, CreateAsientoData } from '@/types/accounting'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import {
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Wallet,
  Loader2,
} from 'lucide-react'

type TipoMovimiento = 'ingreso' | 'egreso' | 'transferencia'

function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// ============================================================================
// CUENTA SEARCH INPUT (reused pattern from AddAsientoDialog)
// ============================================================================

interface CuentaSearchProps {
  cuentas: CuentaContable[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  disabled?: boolean
  placeholder?: string
}

function CuentaSearchInput({ cuentas, selectedId, onSelect, disabled, placeholder }: CuentaSearchProps) {
  const [codigoSearch, setCodigoSearch] = useState('')
  const [tituloSearch, setTituloSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

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
    })
  }, [cuentas, codigoSearch, tituloSearch])

  const selectCuenta = useCallback((c: CuentaContable) => {
    setCodigoSearch(String(c.codigo))
    setTituloSearch(c.titulo)
    setShowDropdown(false)
    setHighlightIdx(-1)
    onSelect(c.id)
  }, [onSelect])

  const handleCodigoChange = (val: string) => {
    const digits = val.replace(/\D/g, '')
    setCodigoSearch(digits)
    setShowDropdown(true)
    setHighlightIdx(-1)
    if (selectedId) onSelect(null)
  }

  const handleTituloChange = (val: string) => {
    setTituloSearch(val)
    setShowDropdown(true)
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
        value={codigoSearch}
        onChange={(e) => handleCodigoChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder="Código"
        className="h-9 text-sm w-24 font-mono"
        disabled={disabled}
      />
      <Input
        value={tituloSearch}
        onChange={(e) => handleTituloChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Buscar cuenta...'}
        className="h-9 text-sm flex-1"
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
// MAIN PAGE
// ============================================================================

export default function CashMovementsPage() {
  const navigate = useNavigate()

  // Data
  const [cajaCuentas, setCajaCuentas] = useState<CuentaContable[]>([])
  const [allCuentas, setAllCuentas] = useState<CuentaContable[]>([])
  const [asientos, setAsientos] = useState<Asiento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Form state
  const [selectedCaja, setSelectedCaja] = useState<number | null>(null)
  const [tipoMov, setTipoMov] = useState<TipoMovimiento>('ingreso')
  const [contrapartidaId, setContrapartidaId] = useState<number | null>(null)
  const [fecha, setFecha] = useState(localDateString())
  const [importe, setImporte] = useState(0)
  const [detalle, setDetalle] = useState('')
  const [referencia, setReferencia] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // History state
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  })
  const [historyEndDate, setHistoryEndDate] = useState(new Date())
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  // Balance
  const [saldoCaja, setSaldoCaja] = useState<string | null>(null)

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) {
      navigate('/profile')
      return
    }
    fetchCuentas()
  }, [navigate])

  const fetchCuentas = async () => {
    try {
      setLoading(true)
      const [cajaRes, allRes] = await Promise.all([
        accountingService.getCuentas({ subtipo: 'efectivo', is_active: true }),
        accountingService.getCuentas({ is_active: true }),
      ])
      setCajaCuentas(cajaRes.data || [])
      setAllCuentas(allRes.data || [])

      // Restore last used caja, or default to first
      const lastCajaStr = localStorage.getItem('cashMovements_lastCaja')
      const cajas = cajaRes.data || []
      const match = lastCajaStr ? cajas.find((c: CuentaContable) => String(c.id) === lastCajaStr) : null
      if (match) {
        setSelectedCaja(match.id)
      } else if (cajas.length > 0) {
        setSelectedCaja(cajas[0].id)
      }
    } catch (error) {
      console.error('Error fetching cuentas:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar las cuentas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Persist selected caja to localStorage
  useEffect(() => {
    if (selectedCaja) {
      localStorage.setItem('cashMovements_lastCaja', String(selectedCaja))
    }
  }, [selectedCaja])

  // Fetch history when caja or date range changes
  useEffect(() => {
    if (selectedCaja) {
      fetchHistory()
      fetchSaldo()
    }
  }, [selectedCaja, historyStartDate, historyEndDate, currentPage])

  const fetchHistory = async () => {
    if (!selectedCaja) return
    try {
      setLoadingHistory(true)
      const response = await accountingService.getAsientos({
        cuenta_id: selectedCaja,
        origen: 'ingreso,egreso,transferencia',
        subdiario: 'caja',
        include_subdiario: 'true',
        start_date: localDateString(historyStartDate),
        end_date: localDateString(historyEndDate),
        page: currentPage,
        limit: 30,
      })
      setAsientos(response.data || [])
      setTotalPages(response.pagination?.pages || 1)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const fetchSaldo = async () => {
    if (!selectedCaja) return
    try {
      const res = await accountingService.calculateExpectedBalance(selectedCaja, localDateString())
      setSaldoCaja(res.data?.expected_balance ?? null)
    } catch {
      setSaldoCaja(null)
    }
  }

  // Cuentas available for contrapartida
  const contrapartidaCuentas = useMemo(() => {
    if (tipoMov === 'transferencia') {
      return cajaCuentas.filter(c => c.id !== selectedCaja)
    }
    return allCuentas.filter(c => c.is_active)
  }, [tipoMov, allCuentas, cajaCuentas, selectedCaja])

  // Reset contrapartida when tipo changes
  useEffect(() => {
    setContrapartidaId(null)
  }, [tipoMov])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCaja) {
      toast({ title: 'Error', description: 'Seleccione una caja', variant: 'destructive' })
      return
    }
    if (!contrapartidaId) {
      toast({ title: 'Error', description: 'Seleccione una cuenta contrapartida', variant: 'destructive' })
      return
    }
    if (importe <= 0) {
      toast({ title: 'Error', description: 'El importe debe ser mayor a 0', variant: 'destructive' })
      return
    }
    if (!detalle.trim()) {
      toast({ title: 'Error', description: 'Ingrese un detalle/concepto', variant: 'destructive' })
      return
    }

    // Build asiento detalles based on tipo
    const detalles = []
    const refOp = referencia.trim() || undefined

    if (tipoMov === 'ingreso') {
      // Debe: caja, Haber: contrapartida
      detalles.push({ id_cuenta: selectedCaja, tipo_mov: 'debe' as const, importe, referencia_operativa: refOp })
      detalles.push({ id_cuenta: contrapartidaId, tipo_mov: 'haber' as const, importe, referencia_operativa: refOp })
    } else if (tipoMov === 'egreso') {
      // Debe: contrapartida, Haber: caja
      detalles.push({ id_cuenta: contrapartidaId, tipo_mov: 'debe' as const, importe, referencia_operativa: refOp })
      detalles.push({ id_cuenta: selectedCaja, tipo_mov: 'haber' as const, importe, referencia_operativa: refOp })
    } else {
      // Transferencia: Debe: caja destino (contrapartida), Haber: caja origen (selectedCaja)
      detalles.push({ id_cuenta: contrapartidaId, tipo_mov: 'debe' as const, importe, referencia_operativa: refOp })
      detalles.push({ id_cuenta: selectedCaja, tipo_mov: 'haber' as const, importe, referencia_operativa: refOp })
    }

    const data: CreateAsientoData = {
      fecha,
      concepto: detalle.trim(),
      origen: tipoMov,
      estado: 'borrador',
      subdiario: 'caja',
      detalles,
    }

    try {
      setSubmitting(true)
      await accountingService.createAsiento(data)
      toast({ title: 'Movimiento registrado', description: 'Se creó el asiento en estado borrador' })
      // Reset form
      setImporte(0)
      setDetalle('')
      setReferencia('')
      setContrapartidaId(null)
      // Refresh
      fetchHistory()
      fetchSaldo()
    } catch (err: any) {
      console.error('Error creating movement:', err)
      toast({ title: 'Error', description: err?.message || 'No se pudo registrar el movimiento', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmar = async (id: number) => {
    try {
      await accountingService.confirmarAsiento(id)
      toast({ title: 'Confirmado', description: 'Asiento confirmado correctamente' })
      fetchHistory()
      fetchSaldo()
    } catch (error) {
      console.error('Error confirming:', error)
      toast({ title: 'Error', description: 'No se pudo confirmar el asiento', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este asiento borrador? Esta acción no se puede deshacer.')) return
    try {
      await accountingService.deleteAsiento(id)
      toast({ title: 'Eliminado', description: 'Asiento eliminado correctamente' })
      fetchHistory()
      fetchSaldo()
    } catch (error) {
      console.error('Error deleting:', error)
      toast({ title: 'Error', description: 'No se pudo eliminar el asiento', variant: 'destructive' })
    }
  }

  const getMovementInfo = (asiento: Asiento) => {
    if (!asiento.detalles || !selectedCaja) return { tipo: '?', importe: 0, contrapartida: null as CuentaContable | null }

    const cajaDetalle = asiento.detalles.find(d => d.id_cuenta === selectedCaja)
    const contraDetalle = asiento.detalles.find(d => d.id_cuenta !== selectedCaja)

    if (!cajaDetalle) return { tipo: '?', importe: 0, contrapartida: null }

    const isIngreso = cajaDetalle.tipo_mov === 'debe'
    const imp = Number(cajaDetalle.importe)

    return {
      tipo: asiento.origen === 'transferencia' ? 'T' : isIngreso ? 'I' : 'E',
      importe: isIngreso ? imp : -imp,
      contrapartida: contraDetalle?.cuenta || null,
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmado':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Confirmado</span>
      case 'borrador':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Borrador</span>
      case 'anulado':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Anulado</span>
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{estado}</span>
    }
  }

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'I':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1"><ArrowDownCircle className="h-3 w-3" />Ingreso</span>
      case 'E':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1"><ArrowUpCircle className="h-3 w-3" />Egreso</span>
      case 'T':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1"><ArrowLeftRight className="h-3 w-3" />Transf.</span>
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tipo}</span>
    }
  }

  const selectedCajaName = useMemo(() => {
    return cajaCuentas.find(c => c.id === selectedCaja)?.titulo || 'Seleccionar caja'
  }, [cajaCuentas, selectedCaja])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (cajaCuentas.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Movimientos de Caja</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No hay cajas de efectivo configuradas</p>
            <p className="text-sm text-gray-400 mt-1">
              Cree una cuenta contable con subtipo "efectivo" en el Plan de Cuentas
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos de Caja</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registrar ingresos, egresos y transferencias de efectivo
          </p>
        </div>
        {saldoCaja !== null && selectedCaja && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
            <Wallet className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Saldo {selectedCajaName}</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(saldoCaja)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5 text-purple-600" />
            Nuevo Movimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Caja + Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Caja</Label>
                <Select
                  value={selectedCaja ? String(selectedCaja) : ''}
                  onValueChange={(v) => { setSelectedCaja(Number(v)); setCurrentPage(1) }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caja" />
                  </SelectTrigger>
                  <SelectContent>
                    {cajaCuentas.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="font-mono text-xs text-gray-500 mr-2">{c.codigo}</span>
                        {c.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Movimiento</Label>
                <Select value={tipoMov} onValueChange={(v) => setTipoMov(v as TipoMovimiento)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingreso">
                      <span className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                        Ingreso
                      </span>
                    </SelectItem>
                    <SelectItem value="egreso">
                      <span className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        Egreso
                      </span>
                    </SelectItem>
                    <SelectItem value="transferencia">
                      <span className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                        Transferencia entre cajas
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Contrapartida + Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2">
                <Label>
                  {tipoMov === 'transferencia' ? 'Caja Destino' : 'Cuenta Contrapartida'}
                </Label>
                <CuentaSearchInput
                  cuentas={contrapartidaCuentas}
                  selectedId={contrapartidaId}
                  onSelect={setContrapartidaId}
                  disabled={submitting}
                  placeholder={tipoMov === 'transferencia' ? 'Buscar caja destino...' : 'Buscar cuenta...'}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  disabled={submitting}
                  className="w-40"
                />
              </div>
            </div>

            {/* Row 3: Importe + Detalle + Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr_160px] gap-4">
              <div className="space-y-2">
                <Label>Importe</Label>
                <CurrencyInput
                  value={importe}
                  onValueChange={setImporte}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Detalle / Concepto</Label>
                <Input
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
                  placeholder="Descripción del movimiento"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Referencia <span className="text-gray-400 font-normal">(opcional)</span></Label>
                <Input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Nro. comprobante"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={submitting || !selectedCaja || !contrapartidaId || importe <= 0}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
                ) : (
                  <>
                    {tipoMov === 'ingreso' && <ArrowDownCircle className="h-4 w-4 mr-2" />}
                    {tipoMov === 'egreso' && <ArrowUpCircle className="h-4 w-4 mr-2" />}
                    {tipoMov === 'transferencia' && <ArrowLeftRight className="h-4 w-4 mr-2" />}
                    Registrar Movimiento
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Historial de Movimientos — {selectedCajaName}</CardTitle>
            <div className="flex items-center gap-2">
              <CompactDatePicker value={historyStartDate} onChange={(d) => { setHistoryStartDate(d); setCurrentPage(1) }} />
              <span className="text-sm text-gray-400">a</span>
              <CompactDatePicker value={historyEndDate} onChange={(d) => { setHistoryEndDate(d); setCurrentPage(1) }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">Cargando movimientos...</div>
          ) : asientos.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay movimientos en el periodo seleccionado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {asientos.map((asiento) => {
                const info = getMovementInfo(asiento)
                const isExpanded = expandedId === asiento.id_asiento

                return (
                  <div key={asiento.id_asiento} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Row */}
                    <div
                      className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : asiento.id_asiento)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">
                              {new Date(asiento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                            </span>
                            {getTipoBadge(info.tipo)}
                            {getEstadoBadge(asiento.estado)}
                            <span className="font-mono text-xs text-gray-400">{asiento.nro_comprobante}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{asiento.concepto}</p>
                          {info.contrapartida && (
                            <p className="text-xs text-gray-500 truncate">
                              <span className="font-mono">{info.contrapartida.codigo}</span> {info.contrapartida.titulo}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={`text-sm font-bold ${info.importe >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {info.importe >= 0 ? '+' : ''}{formatCurrency(info.importe)}
                        </p>
                        {asiento.detalles?.[0]?.referencia_operativa && (
                          <p className="text-xs text-gray-400">{asiento.detalles[0].referencia_operativa}</p>
                        )}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && asiento.detalles && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-semibold">Cuenta</th>
                              <th className="text-right py-2 px-3 font-semibold">Debe</th>
                              <th className="text-right py-2 px-3 font-semibold">Haber</th>
                              <th className="text-left py-2 px-3 font-semibold">Referencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asiento.detalles.map((det: AsientoDetalle) => (
                              <tr key={det.id_detalle} className="border-b border-gray-100">
                                <td className="py-2 px-3">
                                  {det.cuenta ? (
                                    <span>
                                      <span className="font-mono text-xs text-gray-500 mr-1">{det.cuenta.codigo}</span>
                                      {det.cuenta.titulo}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">Cuenta #{det.id_cuenta}</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-blue-600">
                                  {det.tipo_mov === 'debe' ? formatCurrency(det.importe) : ''}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-blue-600">
                                  {det.tipo_mov === 'haber' ? formatCurrency(det.importe) : ''}
                                </td>
                                <td className="py-2 px-3 text-gray-500 text-xs">
                                  {det.referencia_operativa || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                          {asiento.estado === 'borrador' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => { e.stopPropagation(); handleConfirmar(asiento.id_asiento) }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => { e.stopPropagation(); handleDelete(asiento.id_asiento) }}
                              >
                                Eliminar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

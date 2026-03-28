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
import ReconciliationsPage from './ReconciliationsPage'
import {
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CheckCircle2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Wallet,
  Loader2,
  Plus,
  X,
  Download,
  BookUp2,
  CalendarDays,
  Clock,
  Eye,
  Send,
} from 'lucide-react'

type TipoMovimiento = 'ingreso' | 'egreso' | 'transferencia' | ''

interface EntryLine {
  id: number
  tipo: TipoMovimiento
  contrapartidaId: number | null
  importe: number
  detalle: string
  referencia: string
}

let lineIdCounter = 0
function createEmptyLine(): EntryLine {
  return { id: ++lineIdCounter, tipo: '', contrapartidaId: null, importe: 0, detalle: '', referencia: '' }
}

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
  const [fecha, setFecha] = useState(localDateString())       // date for day list
  const [formFecha, setFormFecha] = useState(localDateString()) // date for the form (new/edit)
  const [lines, setLines] = useState<EntryLine[]>([createEmptyLine()])
  const [submitting, setSubmitting] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'dia' | 'historial' | 'pase' | 'arqueos'>('dia')

  // Day view state
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  // History tab state
  const [historyAsientos, setHistoryAsientos] = useState<Asiento[]>([])
  const [loadingHistoryTab, setLoadingHistoryTab] = useState(false)
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d
  })
  const [historyEndDate, setHistoryEndDate] = useState(new Date())
  const [historyExpandedId, setHistoryExpandedId] = useState<number | null>(null)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1)

  // Pase al diario state
  const [pendientes, setPendientes] = useState<{ fecha: string; count: number; total_debe: number }[]>([])
  const [loadingPendientes, setLoadingPendientes] = useState(false)
  const [paseFechaDesde, setPaseFechaDesde] = useState('')
  const [paseFechaHasta, setPaseFechaHasta] = useState('')
  const [paseMes, setPaseMes] = useState('')
  const [pasePreview, setPasePreview] = useState<{
    fecha: string; fechaHasta: string; asientosCount: number;
    asientos: { id_asiento: number; nro_comprobante: string; concepto: string; origen: string; fecha: string }[];
    detalles: { id_cuenta: number; cuenta: CuentaContable; tipo_mov: 'debe' | 'haber'; importe: number }[];
    totalDebe: number; totalHaber: number;
  } | null>(null)
  const [loadingPasePreview, setLoadingPasePreview] = useState(false)
  const [ejecutandoPase, setEjecutandoPase] = useState(false)

  // Edit mode
  const [editingAsiento, setEditingAsiento] = useState<Asiento | null>(null)

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

  // Fetch history when caja or fecha changes
  useEffect(() => {
    if (selectedCaja) {
      fetchHistory()
      fetchSaldo()
    }
  }, [selectedCaja, fecha, currentPage])

  const fetchHistory = async () => {
    if (!selectedCaja) return
    try {
      setLoadingHistory(true)
      const response = await accountingService.getAsientos({
        cuenta_id: selectedCaja,
        origen: 'ingreso,egreso,transferencia',
        subdiario: 'caja',
        include_subdiario: 'true',
        start_date: fecha,
        end_date: fecha,
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

  // Fetch history tab when range or caja changes
  useEffect(() => {
    if (selectedCaja && activeTab === 'historial') {
      fetchHistoryTab()
    }
  }, [selectedCaja, historyStartDate, historyEndDate, historyCurrentPage, activeTab])

  const fetchHistoryTab = async () => {
    if (!selectedCaja) return
    try {
      setLoadingHistoryTab(true)
      const response = await accountingService.getAsientos({
        cuenta_id: selectedCaja,
        origen: 'ingreso,egreso,transferencia',
        subdiario: 'caja',
        include_subdiario: 'true',
        start_date: localDateString(historyStartDate),
        end_date: localDateString(historyEndDate),
        page: historyCurrentPage,
        limit: 30,
      })
      setHistoryAsientos(response.data || [])
      setHistoryTotalPages(response.pagination?.pages || 1)
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoadingHistoryTab(false)
    }
  }

  // Fetch pending count on mount for badge
  useEffect(() => {
    fetchPendientesCount()
  }, [])

  // Fetch full pase data when tab is selected
  useEffect(() => {
    if (activeTab === 'pase') fetchPendientes()
  }, [activeTab])

  const fetchPendientesCount = async () => {
    try {
      const res = await accountingService.getSubdiarioPendientes('caja')
      setPendientes(res.data || [])
    } catch (error) {
      console.error('Error fetching pendientes count:', error)
    }
  }

  const fetchPendientes = async () => {
    try {
      setLoadingPendientes(true)
      const res = await accountingService.getSubdiarioPendientes('caja')
      const data = res.data || []
      setPendientes(data)
      // Load full preview with all pending
      if (data.length > 0) {
        const fechas = data.map(p => p.fecha).sort()
        const desde = fechas[0]
        const hasta = fechas[fechas.length - 1]
        setPaseFechaDesde(desde)
        setPaseFechaHasta(hasta)
        setPaseMes('')
        await loadPreview(desde, hasta)
      } else {
        setPasePreview(null)
      }
    } catch (error) {
      console.error('Error fetching pendientes:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar las fechas pendientes', variant: 'destructive' })
    } finally {
      setLoadingPendientes(false)
    }
  }

  const loadPreview = async (desde: string, hasta: string) => {
    try {
      setLoadingPasePreview(true)
      const res = await accountingService.getSubdiarioPreview(desde, 'caja', hasta)
      setPasePreview(res.data as typeof pasePreview ?? null)
    } catch (error) {
      console.error('Error fetching preview:', error)
      setPasePreview(null)
    } finally {
      setLoadingPasePreview(false)
    }
  }

  const handlePaseFechaChange = (desde: string, hasta: string) => {
    setPaseFechaDesde(desde)
    setPaseFechaHasta(hasta)
    if (desde && hasta) loadPreview(desde, hasta)
    else setPasePreview(null)
  }

  const handlePaseMesChange = (mes: string) => {
    setPaseMes(mes)
    if (!mes) return
    const [year, month] = mes.split('-').map(Number)
    const desde = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const hasta = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    setPaseFechaDesde(desde)
    setPaseFechaHasta(hasta)
    loadPreview(desde, hasta)
  }

  const handleEjecutarPase = async () => {
    if (!paseFechaDesde || !paseFechaHasta) return
    const desde = new Date(paseFechaDesde + 'T12:00:00').toLocaleDateString('es-AR')
    const hasta = new Date(paseFechaHasta + 'T12:00:00').toLocaleDateString('es-AR')
    if (!confirm(`Se generará el asiento resumen del ${desde} al ${hasta}. ¿Continuar?`)) return
    try {
      setEjecutandoPase(true)
      const res = await accountingService.ejecutarPaseDiario(paseFechaDesde, 'caja', paseFechaHasta)
      const vinculados = res.data?.asientosVinculados || 0
      toast({ title: 'Pase realizado', description: `Se consolidaron ${vinculados} movimientos en un asiento resumen` })
      setPasePreview(null)
      fetchPendientes()
      fetchHistory()
      fetchHistoryTab()
    } catch (err: any) {
      console.error('Error executing pase:', err)
      toast({ title: 'Error', description: err?.message || 'No se pudo ejecutar el pase al diario', variant: 'destructive' })
    } finally {
      setEjecutandoPase(false)
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

  // Cuentas available for contrapartida (always exclude selected caja)
  const contrapartidaCuentas = useCallback((tipo: TipoMovimiento) => {
    if (!tipo) return []
    if (tipo === 'transferencia') {
      return cajaCuentas.filter(c => c.id !== selectedCaja)
    }
    return allCuentas.filter(c => c.is_active && c.id !== selectedCaja)
  }, [allCuentas, cajaCuentas, selectedCaja])

  // Line helpers
  const updateLine = (id: number, updates: Partial<EntryLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }
  const addLine = () => {
    setLines(prev => [...prev, createEmptyLine()])
  }
  const removeLine = (id: number) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }

  const buildAsientoFromLines = (entryLines: EntryLine[]): CreateAsientoData | null => {
    if (!selectedCaja) return null

    const detalles: { id_cuenta: number; tipo_mov: 'debe' | 'haber'; importe: number; referencia_operativa?: string }[] = []
    const conceptos: string[] = []

    for (const line of entryLines) {
      if (!line.tipo || !line.contrapartidaId || line.importe <= 0 || !line.detalle.trim()) return null
      const refOp = line.referencia.trim() || undefined
      conceptos.push(line.detalle.trim())

      if (line.tipo === 'ingreso') {
        // Ingreso a caja: Debe caja, Haber contrapartida
        detalles.push({ id_cuenta: selectedCaja, tipo_mov: 'debe', importe: line.importe, referencia_operativa: refOp })
        detalles.push({ id_cuenta: line.contrapartidaId, tipo_mov: 'haber', importe: line.importe, referencia_operativa: refOp })
      } else {
        // Egreso de caja (o transferencia): Debe contrapartida, Haber caja
        detalles.push({ id_cuenta: line.contrapartidaId, tipo_mov: 'debe', importe: line.importe, referencia_operativa: refOp })
        detalles.push({ id_cuenta: selectedCaja, tipo_mov: 'haber', importe: line.importe, referencia_operativa: refOp })
      }
    }

    // Determine predominant origen
    const tipos = entryLines.map(l => l.tipo)
    const hasTransf = tipos.includes('transferencia')
    const origen = hasTransf ? 'transferencia' : tipos[0]

    return {
      fecha: formFecha,
      concepto: conceptos.join(' | '),
      origen,
      estado: 'confirmado',
      subdiario: 'caja',
      detalles,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCaja) {
      toast({ title: 'Error', description: 'Seleccione una caja', variant: 'destructive' })
      return
    }

    for (const line of lines) {
      if (!line.contrapartidaId) {
        toast({ title: 'Error', description: 'Seleccione una cuenta contrapartida en todas las líneas', variant: 'destructive' })
        return
      }
      if (line.contrapartidaId === selectedCaja) {
        toast({ title: 'Error', description: 'La contrapartida no puede ser la misma que la caja', variant: 'destructive' })
        return
      }
      if (line.importe <= 0) {
        toast({ title: 'Error', description: 'El importe debe ser mayor a 0 en todas las líneas', variant: 'destructive' })
        return
      }
      if (!line.detalle.trim()) {
        toast({ title: 'Error', description: 'Ingrese un detalle en todas las líneas', variant: 'destructive' })
        return
      }
    }

    const data = buildAsientoFromLines(lines)
    if (!data) return

    try {
      setSubmitting(true)

      if (editingAsiento) {
        await accountingService.updateAsiento(editingAsiento.id_asiento, data)
        toast({ title: 'Movimiento actualizado', description: 'El asiento fue modificado correctamente' })
        setEditingAsiento(null)
      } else {
        await accountingService.createAsiento(data)
        toast({ title: 'Movimiento registrado', description: 'Se creó el asiento en estado borrador' })
      }

      setLines([createEmptyLine()])
      setFormFecha(fecha)
      fetchHistory()
      fetchHistoryTab()
      fetchSaldo()
    } catch (err: any) {
      console.error('Error saving movement:', err)
      toast({ title: 'Error', description: err?.message || 'No se pudo guardar el movimiento', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }



  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) return
    try {
      await accountingService.deleteAsiento(id)
      toast({ title: 'Eliminado', description: 'Movimiento eliminado correctamente' })
      fetchHistory()
      fetchSaldo()
    } catch (error) {
      console.error('Error deleting:', error)
      toast({ title: 'Error', description: 'No se pudo eliminar el movimiento', variant: 'destructive' })
    }
  }


  const startEdit = (asiento: Asiento) => {
    console.log('[startEdit] id:', asiento.id_asiento, 'estado:', asiento.estado, 'id_pase_diario:', asiento.id_pase_diario, 'detalles:', asiento.detalles?.length, 'selectedCaja:', selectedCaja)
    if (!asiento.detalles || !selectedCaja) {
      console.log('[startEdit] BAIL: detalles=', !!asiento.detalles, 'selectedCaja=', selectedCaja)
      return
    }

    // Reconstruct lines: pair each contra-detail with its caja counterpart
    const contraDetalles = asiento.detalles.filter(d => d.id_cuenta !== selectedCaja)
    const conceptos = asiento.concepto.split(' | ')
    const newLines: EntryLine[] = []

    for (let i = 0; i < contraDetalles.length; i++) {
      const contra = contraDetalles[i]
      // If contra is debe → it's an egreso from caja; if haber → ingreso to caja
      const tipo: TipoMovimiento = asiento.origen === 'transferencia'
        ? 'transferencia'
        : contra.tipo_mov === 'debe' ? 'egreso' : 'ingreso'

      newLines.push({
        id: ++lineIdCounter,
        tipo,
        contrapartidaId: contra.id_cuenta,
        importe: Number(contra.importe),
        detalle: conceptos[i] || asiento.concepto,
        referencia: contra.referencia_operativa || '',
      })
    }

    if (newLines.length === 0) return

    setEditingAsiento(asiento)
    setFormFecha(asiento.fecha)
    setLines(newLines)
    setActiveTab('dia')

    // Scroll to the form card after tab switch renders
    setTimeout(() => {
      const formCard = document.getElementById('cash-form-card')
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        const main = document.querySelector('main')
        if (main) main.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  const cancelEdit = () => {
    setEditingAsiento(null)
    setLines([createEmptyLine()])
    setFormFecha(fecha)
  }

  const [importingCuotas, setImportingCuotas] = useState(false)

  const handleImportCuotas = async () => {
    try {
      setImportingCuotas(true)
      const res = await accountingService.getCuotasDia(fecha)
      if (!res.success || !res.data) {
        toast({ title: 'Error', description: 'No se pudieron obtener las cuotas', variant: 'destructive' })
        return
      }
      const { total, cantidad } = res.data
      if (total <= 0) {
        toast({ title: 'Sin cuotas', description: `No se encontraron cuotas cobradas para el ${fecha}` })
        return
      }

      // Find the "CUOTAS SOCIALES" account (codigo 4101) in allCuentas
      const cuentaCuotas = allCuentas.find(c => c.codigo === 4101)
      if (!cuentaCuotas) {
        toast({ title: 'Error', description: 'No se encontró la cuenta 4101 CUOTAS SOCIALES', variant: 'destructive' })
        return
      }

      // Add a new line (or replace empty first line)
      const newLine: EntryLine = {
        id: ++lineIdCounter,
        tipo: 'ingreso',
        contrapartidaId: cuentaCuotas.id,
        importe: total,
        detalle: `Cuotas del día (${cantidad} cobros)`,
        referencia: '',
      }

      setLines(prev => {
        const firstEmpty = prev.length === 1 && !prev[0].contrapartidaId && prev[0].importe === 0
        return firstEmpty ? [newLine] : [...prev, newLine]
      })

      toast({ title: 'Cuotas importadas', description: `${cantidad} cobros por ${formatCurrency(total)}` })
    } catch (error) {
      console.error('Error importing cuotas:', error)
      toast({ title: 'Error', description: 'No se pudieron importar las cuotas', variant: 'destructive' })
    } finally {
      setImportingCuotas(false)
    }
  }

  const getMovementInfo = (asiento: Asiento) => {
    if (!asiento.detalles || !selectedCaja) return { ingresos: 0, egresos: 0, neto: 0, contrapartidas: [] as (CuentaContable | null)[], isTransferencia: false }

    let ingresos = 0 // debe en caja = entra plata
    let egresos = 0  // haber en caja = sale plata
    const contras: (CuentaContable | null)[] = []

    for (const d of asiento.detalles) {
      if (d.id_cuenta === selectedCaja) {
        if (d.tipo_mov === 'debe') ingresos += Number(d.importe)
        else egresos += Number(d.importe)
      } else {
        if (d.cuenta && !contras.find(c => c?.id === d.cuenta?.id)) {
          contras.push(d.cuenta)
        }
      }
    }

    return {
      ingresos,
      egresos,
      neto: ingresos - egresos,
      contrapartidas: contras,
      isTransferencia: asiento.origen === 'transferencia',
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

  const renderMovementList = (
    items: Asiento[],
    isLoading: boolean,
    expId: number | null,
    setExpId: (id: number | null) => void,
    pages: number,
    page: number,
    setPage: (fn: (p: number) => number) => void,
    showActions: boolean,
    showDate: boolean,
  ) => {
    if (isLoading) return <div className="text-center py-8 text-gray-500">Cargando movimientos...</div>
    if (items.length === 0) return (
      <div className="text-center py-12">
        <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No hay movimientos en el periodo seleccionado</p>
      </div>
    )
    return (
      <>
        <div className="space-y-2">
          {items.map((asiento) => {
            const info = getMovementInfo(asiento)
            const isExpanded = expId === asiento.id_asiento
            return (
              <div key={asiento.id_asiento} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpId(isExpanded ? null : asiento.id_asiento)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showDate && (
                          <span className="text-xs text-gray-500">
                            {new Date(asiento.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {asiento.estado === 'anulado'
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Anulado</span>
                          : asiento.id_pase_diario
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">En diario</span>
                            : <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Pendiente pase</span>
                        }
                        <span className="font-mono text-xs text-gray-400">{asiento.nro_comprobante}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{asiento.concepto}</p>
                      {info.contrapartidas.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {info.contrapartidas.map((c, i) => (
                            <span key={c?.id || i}>
                              {i > 0 && ', '}
                              <span className="font-mono">{c?.codigo}</span> {c?.titulo}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4 space-y-0.5">
                    {info.ingresos > 0 && (
                      <p className="text-sm font-bold text-emerald-600">+{formatCurrency(info.ingresos)}</p>
                    )}
                    {info.egresos > 0 && (
                      <p className="text-sm font-bold text-red-600">-{formatCurrency(info.egresos)}</p>
                    )}
                    {asiento.detalles?.[0]?.referencia_operativa && (
                      <p className="text-xs text-gray-400">{asiento.detalles[0].referencia_operativa}</p>
                    )}
                  </div>
                </div>
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
                        {[...asiento.detalles].sort((a, b) => {
                          if (a.tipo_mov === b.tipo_mov) return 0
                          return a.tipo_mov === 'debe' ? -1 : 1
                        }).map((det: AsientoDetalle) => (
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
                    {showActions && !asiento.id_pase_diario && asiento.estado !== 'anulado' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(asiento) }}>
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(asiento.id_asiento) }}>
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span className="text-sm text-gray-500">Página {page} de {pages}</span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
          </div>
        )}
      </>
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
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dia'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('dia')}
        >
          Movimientos del día
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'historial'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('historial')}
        >
          Historial
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pase'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('pase')}
        >
          Pase al Diario
          {pendientes.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
              {pendientes.reduce((s, p) => s + p.count, 0)}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'arqueos'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('arqueos')}
        >
          Arqueos
        </button>
      </div>

      {/* Tab: Movimientos del día */}
      {activeTab === 'dia' && (
        <>
          {/* Caja + Saldo */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {cajaCuentas.length > 1 && (
              <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-lg px-5 py-3.5 shadow-sm">
                <Banknote className="h-6 w-6 text-purple-600 shrink-0" />
                <span className="text-base font-semibold text-purple-800 shrink-0">Caja:</span>
                <Select
                  value={selectedCaja ? String(selectedCaja) : ''}
                  onValueChange={(v) => { setSelectedCaja(Number(v)); setCurrentPage(1); setHistoryCurrentPage(1) }}
                >
                  <SelectTrigger className="w-auto min-w-[220px] font-medium border-purple-200 bg-white">
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
            )}
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
          <Card id="cash-form-card" className={editingAsiento ? 'border-amber-300 bg-amber-50/30' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-purple-600" />
                  {editingAsiento ? `Editando ${editingAsiento.nro_comprobante}` : 'Nuevos Movimientos'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {editingAsiento && (
                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                      Cancelar edición
                    </Button>
                  )}
                </div>
              </div>
              {editingAsiento && formFecha !== fecha && (
                <p className="text-sm text-amber-700 bg-amber-100 rounded px-3 py-1.5 mt-2">
                  Editando movimiento del {new Date(formFecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Fecha */}
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <Label className="text-sm text-gray-600 shrink-0">Fecha:</Label>
                  <Input
                    type="date"
                    value={formFecha}
                    onChange={(e) => { setFormFecha(e.target.value); if (!editingAsiento) setFecha(e.target.value) }}
                    required
                    disabled={submitting}
                    className="w-40 h-9"
                  />
                  <Button
                    type="button"
                    variant={formFecha === localDateString((() => { const d = new Date(); d.setDate(d.getDate() - 1); return d })()) ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 shrink-0 px-2.5"
                    onClick={() => { const d = localDateString((() => { const x = new Date(); x.setDate(x.getDate() - 1); return x })()); setFormFecha(d); if (!editingAsiento) setFecha(d) }}
                  >
                    Ayer
                  </Button>
                  <Button
                    type="button"
                    variant={formFecha === localDateString() ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 shrink-0 px-2.5"
                    onClick={() => { setFormFecha(localDateString()); if (!editingAsiento) setFecha(localDateString()) }}
                  >
                    Hoy
                  </Button>
                  {/* TODO: Importar cuotas del día - oculto temporalmente */}
                </div>

                {/* Column headers */}
                <div className="hidden sm:grid sm:grid-cols-[100px_1fr_130px_1fr_130px_36px] gap-2 text-xs text-gray-400 font-medium px-1">
                  <span>Tipo</span>
                  <span>Cuenta Contrapartida</span>
                  <span>Importe</span>
                  <span>Detalle</span>
                  <span>Referencia</span>
                  <span></span>
                </div>

                {/* Entry lines */}
                <div className="space-y-2">
                  {lines.map((line) => (
                    <div key={line.id} className="grid grid-cols-1 sm:grid-cols-[100px_1fr_130px_1fr_130px_36px] gap-2 items-start">
                      {/* Tipo toggle */}
                      <div className="flex rounded-md border border-gray-200 overflow-hidden h-9">
                        <button
                          type="button"
                          className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors ${
                            line.tipo === 'ingreso'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => updateLine(line.id, { tipo: 'ingreso', contrapartidaId: null })}
                          title="Ingreso"
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors border-l border-gray-200 ${
                            line.tipo === 'egreso'
                              ? 'bg-red-100 text-red-700'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => updateLine(line.id, { tipo: 'egreso', contrapartidaId: null })}
                          title="Egreso"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors border-l border-gray-200 ${
                            line.tipo === 'transferencia'
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          onClick={() => updateLine(line.id, { tipo: 'transferencia', contrapartidaId: null })}
                          title="Transferencia"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Contrapartida */}
                      <CuentaSearchInput
                        cuentas={contrapartidaCuentas(line.tipo)}
                        selectedId={line.contrapartidaId}
                        onSelect={(id) => updateLine(line.id, { contrapartidaId: id })}
                        disabled={submitting}
                        placeholder="Buscar cuenta..."
                      />

                      {/* Importe */}
                      <CurrencyInput
                        value={line.importe}
                        onValueChange={(v) => updateLine(line.id, { importe: v })}
                        disabled={submitting}
                      />

                      {/* Detalle */}
                      <Input
                        value={line.detalle}
                        onChange={(e) => updateLine(line.id, { detalle: e.target.value })}
                        placeholder="Descripción"
                        disabled={submitting}
                        className="h-9 text-sm"
                      />

                      {/* Referencia */}
                      <Input
                        value={line.referencia}
                        onChange={(e) => updateLine(line.id, { referencia: e.target.value })}
                        placeholder="Ref."
                        disabled={submitting}
                        className="h-9 text-sm"
                      />

                      {/* Remove */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-gray-400 hover:text-red-600"
                        disabled={lines.length <= 1 || submitting}
                        onClick={() => removeLine(line.id)}
                        title="Eliminar línea"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add line + Submit */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                    disabled={submitting}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar línea
                  </Button>
                  <div>
                    <Button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={submitting || !selectedCaja}
                    >
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editingAsiento ? 'Guardando...' : 'Registrando...'}</>
                      ) : editingAsiento ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Guardar Cambios
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Registrar movimiento{lines.length > 1 ? `s (${lines.length} líneas)` : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Day movements list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Movimientos del {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderMovementList(asientos, loadingHistory, expandedId, setExpandedId, totalPages, currentPage, setCurrentPage, true, false)}
            </CardContent>
          </Card>
        </>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <>
          {cajaCuentas.length > 1 && (
            <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-lg px-5 py-3.5 shadow-sm">
              <Banknote className="h-6 w-6 text-purple-600 shrink-0" />
              <span className="text-base font-semibold text-purple-800 shrink-0">Caja:</span>
              <Select
                value={selectedCaja ? String(selectedCaja) : ''}
                onValueChange={(v) => { setSelectedCaja(Number(v)); setCurrentPage(1); setHistoryCurrentPage(1) }}
              >
                <SelectTrigger className="w-auto min-w-[220px] font-medium border-purple-200 bg-white">
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
          )}
          <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg">Historial — {selectedCajaName}</CardTitle>
              <div className="flex items-center gap-2">
                <CompactDatePicker value={historyStartDate} onChange={(d) => { setHistoryStartDate(d); setHistoryCurrentPage(1) }} />
                <span className="text-sm text-gray-400">a</span>
                <CompactDatePicker value={historyEndDate} onChange={(d) => { setHistoryEndDate(d); setHistoryCurrentPage(1) }} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderMovementList(historyAsientos, loadingHistoryTab, historyExpandedId, setHistoryExpandedId, historyTotalPages, historyCurrentPage, setHistoryCurrentPage, true, true)}
          </CardContent>
        </Card>
        </>
      )}

      {/* Tab: Pase al Diario */}
      {activeTab === 'pase' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookUp2 className="h-5 w-5 text-purple-600" />
                  Pase al Libro Diario
                </CardTitle>
                {pendientes.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {pendientes.reduce((s, p) => s + p.count, 0)} movimientos pendientes
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingPendientes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : pendientes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Todo al día</p>
                  <p className="text-sm text-gray-400 mt-1">No hay movimientos pendientes de pase al libro diario</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filters */}
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Mes</label>
                      <input
                        type="month"
                        value={paseMes}
                        onChange={(e) => handlePaseMesChange(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Desde</label>
                      <input
                        type="date"
                        value={paseFechaDesde}
                        onChange={(e) => { setPaseMes(''); handlePaseFechaChange(e.target.value, paseFechaHasta) }}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Hasta</label>
                      <input
                        type="date"
                        value={paseFechaHasta}
                        onChange={(e) => { setPaseMes(''); handlePaseFechaChange(paseFechaDesde, e.target.value) }}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {loadingPasePreview ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">Cargando movimientos...</span>
                    </div>
                  ) : pasePreview && pasePreview.asientosCount > 0 ? (
                    <div className="space-y-4">
                      {/* Movimientos a consolidar */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Movimientos a consolidar ({pasePreview.asientosCount})
                        </h4>
                        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-semibold text-gray-600">Fecha</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-600">Comprobante</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-600">Concepto</th>
                              <th className="text-left py-2 px-3 font-semibold text-gray-600">Tipo</th>
                            </tr></thead>
                            <tbody>
                              {pasePreview.asientos.map((a) => (
                                <tr key={a.id_asiento} className="border-b border-gray-100">
                                  <td className="py-2 px-3 text-xs text-gray-500">
                                    {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-xs text-gray-500">{a.nro_comprobante}</td>
                                  <td className="py-2 px-3 text-gray-900">{a.concepto}</td>
                                  <td className="py-2 px-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      a.origen === 'ingreso' ? 'text-emerald-700 bg-emerald-50' :
                                      a.origen === 'egreso' ? 'text-red-700 bg-red-50' : 'text-blue-700 bg-blue-50'
                                    }`}>{a.origen === 'ingreso' ? 'Ingreso' : a.origen === 'egreso' ? 'Egreso' : 'Transferencia'}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Asiento resumen */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Asiento resumen</h4>
                        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-2 px-3 font-semibold text-gray-600">Cuenta</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-600">Debe</th>
                              <th className="text-right py-2 px-3 font-semibold text-gray-600">Haber</th>
                            </tr></thead>
                            <tbody>
                              {pasePreview.detalles.map((d, i) => (
                                <tr key={i} className="border-b border-gray-100">
                                  <td className="py-2 px-3">
                                    {d.cuenta ? (<><span className="font-mono text-xs text-gray-500 mr-1">{d.cuenta.codigo}</span>{d.cuenta.titulo}</>) : <span className="text-gray-400">Cuenta #{d.id_cuenta}</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right font-medium text-blue-600">{d.tipo_mov === 'debe' ? formatCurrency(d.importe) : ''}</td>
                                  <td className="py-2 px-3 text-right font-medium text-blue-600">{d.tipo_mov === 'haber' ? formatCurrency(d.importe) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot><tr className="bg-gray-50 border-t border-gray-300">
                              <td className="py-2 px-3 font-semibold text-gray-700">Totales</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(pasePreview.totalDebe)}</td>
                              <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(pasePreview.totalHaber)}</td>
                            </tr></tfoot>
                          </table>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button className="bg-purple-600 hover:bg-purple-700 text-white" disabled={ejecutandoPase} onClick={handleEjecutarPase}>
                          {ejecutandoPase ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ejecutando pase...</>) : (<><Send className="h-4 w-4 mr-2" />Ejecutar Pase al Diario</>)}
                        </Button>
                      </div>
                    </div>
                  ) : pasePreview && pasePreview.asientosCount === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No hay movimientos pendientes en el rango seleccionado
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Tab: Arqueos */}
      {activeTab === 'arqueos' && <ReconciliationsPage />}
    </div>
  )
}

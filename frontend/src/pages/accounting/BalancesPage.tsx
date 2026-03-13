import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  Building2,
  CreditCard,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Landmark,
  Scale,
  Receipt,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import * as accountingService from '@/lib/accountingService'
import type { AccountBalancesData, CuentaContable } from '@/types/accounting'
import { toast } from '@/components/ui/use-toast'
import { cn, formatCurrency } from '@/lib/utils'

type CuentaConSaldo = CuentaContable & { saldo: number; total_debe: number; total_haber: number }

interface TipoConfig {
  key: keyof AccountBalancesData['cuentas']
  label: string
  icon: typeof Wallet
  color: string
  borderColor: string
  bgColor: string
  textColor: string
}

const TIPO_CONFIG: TipoConfig[] = [
  { key: 'activo', label: 'Activo', icon: Wallet, color: 'text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300' },
  { key: 'pasivo', label: 'Pasivo', icon: Receipt, color: 'text-orange-600 dark:text-orange-400', borderColor: 'border-l-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20', textColor: 'text-orange-700 dark:text-orange-300' },
  { key: 'patrimonio', label: 'Patrimonio Neto', icon: Landmark, color: 'text-purple-600 dark:text-purple-400', borderColor: 'border-l-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-700 dark:text-purple-300' },
  { key: 'ingreso', label: 'Ingresos', icon: TrendingUp, color: 'text-green-600 dark:text-green-400', borderColor: 'border-l-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', textColor: 'text-green-700 dark:text-green-300' },
  { key: 'egreso', label: 'Egresos', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20', textColor: 'text-red-700 dark:text-red-300' },
]

function getSubtipoIcon(subtipo: string | null) {
  switch (subtipo) {
    case 'efectivo': return <Wallet className="h-3.5 w-3.5 text-green-500" />
    case 'bancaria': return <Building2 className="h-3.5 w-3.5 text-blue-500" />
    case 'cobro_electronico': return <CreditCard className="h-3.5 w-3.5 text-purple-500" />
    default: return null
  }
}

function getSubtipoLabel(subtipo: string | null) {
  switch (subtipo) {
    case 'efectivo': return 'Efectivo'
    case 'bancaria': return 'Bancaria'
    case 'cobro_electronico': return 'Cobro electr.'
    case 'credito_cobrar': return 'Credito a cobrar'
    case 'pasivo_liquidar': return 'Pasivo a liquidar'
    default: return null
  }
}

export default function BalancesPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AccountBalancesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activo: true, pasivo: true, patrimonio: true, ingreso: false, egreso: false,
  })

  useEffect(() => {
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee'
    if (!hasAccess) navigate('/profile')
  }, [navigate])

  useEffect(() => { fetchBalances() }, [])

  const fetchBalances = async () => {
    try {
      setLoading(true)
      const result = await accountingService.getAccountBalances()
      setData(result)
    } catch (error) {
      console.error('Error fetching balances:', error)
      toast({ title: 'Error', description: 'No se pudieron cargar los saldos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Saldos de Cuentas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Saldos al {new Date(data.as_of_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBalances} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TIPO_CONFIG.map(({ key, label, icon: Icon, color, borderColor }) => (
          <Card key={key} className={cn('border-l-4', borderColor)}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <p className={cn('text-lg font-bold', color)}>
                {formatCurrency(data.totals[key])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ecuacion patrimonial */}
      {(() => {
        const activo = Number(data.totals.activo)
        const pasivo = Number(data.totals.pasivo)
        const patrimonio = Number(data.totals.patrimonio)
        const ingresos = Number(data.totals.ingreso)
        const egresos = Number(data.totals.egreso)
        const resultado = ingresos - egresos
        const ladoDerecho = pasivo + patrimonio + resultado
        const diferencia = Math.abs(activo - ladoDerecho)
        const balanced = diferencia < 0.01

        return (
          <Card className={cn(
            'bg-gradient-to-r border-2',
            balanced
              ? 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700'
              : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-300 dark:border-red-700'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-700 dark:text-gray-300">Ecuacion Patrimonial</span>
                {!balanced && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                    (Diferencia: {formatCurrency(diferencia)})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Activo {formatCurrency(activo)}
                </span>
                <span className="text-gray-400">=</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  Pasivo {formatCurrency(pasivo)}
                </span>
                <span className="text-gray-400">+</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">
                  Patrimonio {formatCurrency(patrimonio)}
                </span>
                <span className="text-gray-400">+</span>
                <span className={cn('font-medium', resultado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                  Resultado {formatCurrency(resultado)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Resultado del ejercicio = Ingresos ({formatCurrency(ingresos)}) - Egresos ({formatCurrency(egresos)})
              </p>
            </CardContent>
          </Card>
        )
      })()}

      {/* Account Sections */}
      <div className="space-y-4">
        {TIPO_CONFIG.map(({ key, label, icon: Icon, color, bgColor, textColor, borderColor }) => {
          const cuentas = data.cuentas[key] as CuentaConSaldo[]
          const isExpanded = expandedSections[key]
          const cuentasConMovimiento = cuentas.filter(c => c.saldo !== 0 || c.total_debe !== 0 || c.total_haber !== 0)
          const cuentasSinMovimiento = cuentas.filter(c => c.saldo === 0 && c.total_debe === 0 && c.total_haber === 0)

          return (
            <Card key={key} className={cn('border-l-4', borderColor)}>
              <CardHeader
                className={cn('pb-2 cursor-pointer select-none', bgColor)}
                onClick={() => toggleSection(key)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Icon className={cn('h-5 w-5', color)} />
                    <span className={cn('text-base', textColor)}>{label}</span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({cuentas.length} cuentas)
                    </span>
                  </div>
                  <span className={cn('text-lg font-bold', color)}>
                    {formatCurrency(data.totals[key])}
                  </span>
                </CardTitle>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-2">
                  {cuentas.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Sin cuentas registradas</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-gray-500 dark:text-gray-400">
                            <th className="pb-2 pr-2 font-medium">Codigo</th>
                            <th className="pb-2 pr-2 font-medium">Cuenta</th>
                            <th className="pb-2 pr-2 font-medium hidden sm:table-cell">Tipo</th>
                            <th className="pb-2 pr-2 font-medium text-right">Debe</th>
                            <th className="pb-2 pr-2 font-medium text-right">Haber</th>
                            <th className="pb-2 font-medium text-right">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cuentasConMovimiento.map((cuenta) => (
                            <tr
                              key={cuenta.id}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                              onClick={() => navigate('/accounting/reports', { state: { mayorCuentaId: cuenta.id } })}
                            >
                              <td className="py-2 pr-2 font-mono text-xs text-gray-500">{cuenta.codigo}</td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1.5">
                                  {getSubtipoIcon(cuenta.subtipo)}
                                  <span className="font-medium text-gray-900 dark:text-white">{cuenta.titulo}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-2 hidden sm:table-cell">
                                {cuenta.subtipo && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {getSubtipoLabel(cuenta.subtipo)}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-2 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                                {cuenta.total_debe > 0 ? formatCurrency(cuenta.total_debe) : '-'}
                              </td>
                              <td className="py-2 pr-2 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                                {cuenta.total_haber > 0 ? formatCurrency(cuenta.total_haber) : '-'}
                              </td>
                              <td className={cn(
                                'py-2 text-right font-mono font-semibold',
                                cuenta.saldo > 0 ? 'text-green-600 dark:text-green-400' :
                                cuenta.saldo < 0 ? 'text-red-600 dark:text-red-400' :
                                'text-gray-400'
                              )}>
                                {formatCurrency(cuenta.saldo)}
                              </td>
                            </tr>
                          ))}
                          {cuentasSinMovimiento.length > 0 && (
                            <tr>
                              <td colSpan={6} className="py-2 text-xs text-gray-400 italic">
                                {cuentasSinMovimiento.length} cuenta{cuentasSinMovimiento.length > 1 ? 's' : ''} sin movimientos
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {cuentasConMovimiento.length > 1 && (
                          <tfoot>
                            <tr className="border-t-2 font-semibold">
                              <td className="pt-2" colSpan={3}></td>
                              <td className="pt-2 pr-2 text-right font-mono text-xs">
                                {formatCurrency(cuentasConMovimiento.reduce((s, c) => s + c.total_debe, 0))}
                              </td>
                              <td className="pt-2 pr-2 text-right font-mono text-xs">
                                {formatCurrency(cuentasConMovimiento.reduce((s, c) => s + c.total_haber, 0))}
                              </td>
                              <td className={cn('pt-2 text-right font-mono', color)}>
                                {formatCurrency(data.totals[key])}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

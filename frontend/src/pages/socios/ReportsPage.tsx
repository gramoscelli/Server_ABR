import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, AlertTriangle, Users, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/auth'

interface GrupoReport {
  Gr_ID: number
  Gr_Nombre: string
  Gr_Titulo: string
  Gr_Cuota: number
  socios: any[]
  totalSocios: number
  totalCuota: number
  sociosMorados: number
  ultimaActualizacion: string
}

interface ReportSummary {
  totalGrupos: number
  totalSocios: number
  totalCuotaMensual: number
  totalMorados: number
  fechaGeneracion: string
}

export default function SociosReportsPage() {
  // Morosos report state
  const [monthsDelayed, setMonthsDelayed] = useState('3')
  const [morososCount, setMorososCount] = useState<number | null>(null)
  const [loadingMorosos, setLoadingMorosos] = useState(false)
  const [morosusError, setMorosusError] = useState<string | null>(null)

  // Por Grupo report state
  const [grupoReport, setGrupoReport] = useState<GrupoReport[]>([])
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [loadingGrupo, setLoadingGrupo] = useState(false)
  const [grupoError, setGrupoError] = useState<string | null>(null)
  const [expandedGrupo, setExpandedGrupo] = useState<number | null>(null)

  // Load report por grupo on component mount
  useEffect(() => {
    handleLoadGrupoReport()
  }, [])

  const handleSearchMorosos = async () => {
    const months = parseInt(monthsDelayed)
    if (isNaN(months) || months < 1) {
      setMorosusError('Ingrese un número válido de meses')
      return
    }

    setLoadingMorosos(true)
    setMorosusError(null)
    try {
      const response = await fetchWithAuth(`/api/socios/morosos/${months}`)
      const data = await response.json()

      if (data.success) {
        setMorososCount(data.total)
      } else {
        setMorosusError(data.message || 'Error al obtener datos')
      }
    } catch (err) {
      setMorosusError('Error al conectar con el servidor')
      console.error('Error fetching morosos:', err)
    } finally {
      setLoadingMorosos(false)
    }
  }

  const handleLoadGrupoReport = async () => {
    setLoadingGrupo(true)
    setGrupoError(null)
    try {
      const response = await fetchWithAuth('/api/socios/report/por-grupo')
      const data = await response.json()

      if (data.success) {
        setGrupoReport(data.data)
        setReportSummary(data.summary)
      } else {
        setGrupoError(data.message || 'Error al obtener datos')
      }
    } catch (err) {
      setGrupoError('Error al conectar con el servidor')
      console.error('Error fetching grupo report:', err)
    } finally {
      setLoadingGrupo(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes de Socios</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Consultas y reportes sobre el estado de los socios
        </p>
      </div>

      {/* Report por Grupo Section */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="text-gray-900 dark:text-white">Socios por Grupo</span>
            </CardTitle>
            <Button
              onClick={handleLoadGrupoReport}
              disabled={loadingGrupo}
              variant="outline"
              size="sm"
            >
              {loadingGrupo ? 'Cargando...' : 'Actualizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {grupoError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{grupoError}</p>
            </div>
          )}

          {/* Summary Stats */}
          {reportSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Grupos</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {reportSummary.totalGrupos}
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total Socios</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {reportSummary.totalSocios}
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Cuota Mensual</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  ${reportSummary.totalCuotaMensual.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Socios Morosos</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {reportSummary.totalMorados}
                </p>
              </div>
            </div>
          )}

          {/* Grupos List */}
          {loadingGrupo && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">Cargando reporte...</p>
            </div>
          )}

          {!loadingGrupo && grupoReport.length > 0 && (
            <div className="space-y-3">
              {grupoReport.map((grupo) => (
                <div
                  key={grupo.Gr_ID}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedGrupo(expandedGrupo === grupo.Gr_ID ? null : grupo.Gr_ID)
                    }
                    className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {grupo.Gr_Nombre}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {grupo.Gr_Titulo}
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {grupo.totalSocios}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">socios</p>
                      </div>
                      {grupo.sociosMorados > 0 && (
                        <div className="text-right px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                          <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                            {grupo.sociosMorados}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400">morosos</p>
                        </div>
                      )}
                      <svg
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          expandedGrupo === grupo.Gr_ID ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Socios List */}
                  {expandedGrupo === grupo.Gr_ID && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {grupo.socios.map((socio, idx) => (
                          <div key={idx} className="p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {socio.So_Apellido}, {socio.So_Nombre}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  DNI: {socio.So_NroDoc}
                                </p>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-xs font-semibold px-2 py-1 rounded ${
                                    socio.estadoPago === 'Al día'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : socio.estadoPago === 'Sin pagos'
                                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                  }`}
                                >
                                  {socio.estadoPago}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Morosos Count Section */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <span className="text-gray-900 dark:text-white">Socios con Atraso en Pagos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consulte la cantidad de socios con una determinada cantidad de meses de atraso en el pago de cuotas
          </p>

          {/* Search Form */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="monthsDelayed" className="text-gray-700 dark:text-gray-300">
                Meses de atraso (mínimo)
              </Label>
              <Input
                id="monthsDelayed"
                type="number"
                min="1"
                value={monthsDelayed}
                onChange={(e) => setMonthsDelayed(e.target.value)}
                placeholder="Ej: 3"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSearchMorosos}
              disabled={loadingMorosos}
              className="bg-red-600 hover:bg-red-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loadingMorosos ? 'Consultando...' : 'Consultar'}
            </Button>
          </div>

          {/* Error Message */}
          {morosusError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{morosusError}</p>
            </div>
          )}

          {/* Result Count */}
          {morososCount !== null && !morosusError && (
            <div className="mt-4">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Socios con {monthsDelayed} o más meses de atraso:
                  </p>
                  <p className="text-5xl font-bold text-red-600 dark:text-red-400">
                    {morososCount}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {morososCount === 1 ? 'socio encontrado' : 'socios encontrados'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

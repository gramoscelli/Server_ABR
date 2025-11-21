import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { fetchWithAuth } from '@/lib/auth'

interface Moroso {
  So_ID: number
  So_Nombre: string
  So_Apellido: string
  So_DomCob: string
  So_Telef: string
  Gr_Nombre: string
  MesesAtraso: number
  UltimaCuota_Anio?: number
  UltimaCuota_Mes?: number
  UltimaCuota_FechaCobrado?: string
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [monthsDelayed, setMonthsDelayed] = useState('3')
  const [morosos, setMorosos] = useState<Moroso[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const handleSearchMorosos = async () => {
    const months = parseInt(monthsDelayed)
    if (isNaN(months) || months < 1) {
      setError('Ingrese un número válido de meses')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth(`/api/socios/morosos/${months}`)
      const data = await response.json()

      if (data.success) {
        setMorosos(data.data)
      } else {
        setError(data.message || 'Error al obtener datos')
      }
    } catch (err) {
      setError('Error al conectar con el servidor')
      console.error('Error fetching morosos:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (month: number) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return months[month - 1] || '-'
  }

  const reports = [
    {
      title: 'Balance General',
      description: 'Estado de situación patrimonial con activos, pasivos y patrimonio neto',
      icon: BarChart3,
      color: 'bg-blue-500',
    },
    {
      title: 'Estado de Resultados',
      description: 'Resumen de ingresos, gastos y resultado del período',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Flujo de Efectivo',
      description: 'Movimientos de efectivo y equivalentes durante el período',
      icon: FileText,
      color: 'bg-purple-500',
    },
    {
      title: 'Análisis por Categorías',
      description: 'Distribución de ingresos y egresos por categoría',
      icon: PieChart,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes Financieros</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 capitalize">
            Período: {monthYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CompactDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
          />
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => {
          const Icon = report.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-900 dark:text-white">{report.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {report.description}
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Ver Reporte
                  </Button>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Socios Morosos Report */}
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
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Consulte los socios con una determinada cantidad de meses de atraso en el pago de cuotas
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
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Buscando...' : 'Consultar'}
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Results Table */}
          {morosos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Resultados: {morosos.length} socio{morosos.length !== 1 ? 's' : ''} encontrado{morosos.length !== 1 ? 's' : ''}
                </p>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-900">
                        <TableHead className="font-semibold">ID</TableHead>
                        <TableHead className="font-semibold">Apellido y Nombre</TableHead>
                        <TableHead className="font-semibold">Grupo</TableHead>
                        <TableHead className="font-semibold">Domicilio</TableHead>
                        <TableHead className="font-semibold">Teléfono</TableHead>
                        <TableHead className="font-semibold">Último Pago</TableHead>
                        <TableHead className="font-semibold text-right">Meses Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {morosos.map((socio) => (
                        <TableRow key={socio.So_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">{socio.So_ID}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {socio.So_Apellido}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {socio.So_Nombre}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{socio.Gr_Nombre || '-'}</TableCell>
                          <TableCell className="text-sm">{socio.So_DomCob || '-'}</TableCell>
                          <TableCell className="text-sm">{socio.So_Telef || '-'}</TableCell>
                          <TableCell className="text-sm">
                            {socio.UltimaCuota_Anio && socio.UltimaCuota_Mes ? (
                              <span>
                                {getMonthName(socio.UltimaCuota_Mes)} {socio.UltimaCuota_Anio}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">Sin pagos</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              socio.MesesAtraso >= 12
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : socio.MesesAtraso >= 6
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {socio.MesesAtraso} {socio.MesesAtraso === 1 ? 'mes' : 'meses'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!loading && morosos.length === 0 && !error && monthsDelayed && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron socios con {monthsDelayed} o más meses de atraso</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                Más Reportes en Desarrollo
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                Los reportes financieros adicionales estarán disponibles próximamente. Podrás generar balances,
                estados de resultados y análisis detallados de tus operaciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

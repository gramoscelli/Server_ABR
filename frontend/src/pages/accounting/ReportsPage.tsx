import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompactDatePicker } from '@/components/ui/compact-date-picker'
import {
  FileText,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import { useState } from 'react'

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())

  const monthYear = selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

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

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                Funcionalidad en Desarrollo
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                Los reportes financieros estarán disponibles próximamente. Podrás generar balances,
                estados de resultados y análisis detallados de tus operaciones.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

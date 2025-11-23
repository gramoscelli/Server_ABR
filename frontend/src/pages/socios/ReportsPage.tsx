import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { fetchWithAuth } from '@/lib/auth'

export default function SociosReportsPage() {
  // Morosos report state
  const [monthsDelayed, setMonthsDelayed] = useState('3')
  const [morososCount, setMorososCount] = useState<number | null>(null)
  const [loadingMorosos, setLoadingMorosos] = useState(false)
  const [morosusError, setMorosusError] = useState<string | null>(null)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes de Socios</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Consultas y reportes sobre el estado de los socios
        </p>
      </div>

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

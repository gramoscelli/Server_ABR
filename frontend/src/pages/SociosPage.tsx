import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, User, MapPin, Users as UsersIcon, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { authService, fetchWithAuth } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'

interface Socio {
  So_ID: number
  So_Nombre: string
  So_Apellido: string
  So_DomCob: string
  So_DomRes: string
  So_Telef: string
  So_NroDoc: string
  So_Email: string
  So_FecNac: string
  Gr_ID: number | null
  Gr_Nombre?: string
  Gr_Titulo?: string
  So_Foto_Base64?: string
  UltimaCuota_Anio?: number
  UltimaCuota_Mes?: number
  UltimaCuota_Valor?: number
  UltimaCuota_FechaCobrado?: string
}

export default function SociosPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [socios, setSocios] = useState<Socio[]>([])
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Check if user has access (root, admin_employee, or library_employee)
    const user = authService.getUser()
    const hasAccess = user?.role === 'root' || user?.role === 'admin_employee' || user?.role === 'library_employee'

    if (!hasAccess) {
      navigate('/profile')
      return
    }
  }, [navigate])

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSocios([])
      setSelectedSocio(null)
      setSearching(false)
      return
    }

    setSearching(true)
    try {
      console.log('[SociosPage] Calling fetchWithAuth for:', term)
      const response = await fetchWithAuth(
        `/api/socios/search?q=${encodeURIComponent(term)}&limit=20`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      console.log('[SociosPage] Response received:', response.status)

      if (!response.ok) {
        throw new Error('Error en la búsqueda')
      }

      const result = await response.json()

      if (result.success) {
        const newSocios = result.data || []
        setSocios(newSocios)

        // Auto-select first socio if results found
        if (newSocios.length > 0) {
          // If current selection is not in new results, select first one
          if (!selectedSocio || !newSocios.find((s: Socio) => s.So_ID === selectedSocio.So_ID)) {
            setSelectedSocio(newSocios[0])
          }
        } else {
          // Clear selection if no results
          setSelectedSocio(null)
        }
      } else {
        throw new Error(result.message || 'Error en la búsqueda')
      }
    } catch (error) {
      console.error('Error searching socios:', error)
      toast({
        title: 'Error',
        description: 'No se pudo realizar la búsqueda. Por favor, intenta nuevamente.',
        variant: 'destructive'
      })
      setSocios([])
      setSelectedSocio(null)
    } finally {
      setSearching(false)
    }
  }, [toast, selectedSocio])

  // Debounced search - search as user types with 500ms delay
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchTerm.trim().length === 0) {
      setSocios([])
      setSelectedSocio(null)
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchTerm)
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, handleSearch])

  const handleSelectSocio = (socio: Socio) => {
    setSelectedSocio(socio)
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Socios</h1>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Buscar Socio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-3 top-3 pointer-events-none z-10">
                {searching ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <Input
                type="text"
                placeholder="Escribe para buscar por nombre, apellido o número..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 z-10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              La búsqueda se realiza automáticamente mientras escribes.
              Busca por nombre, apellido, DNI o número de socio (insensible a mayúsculas).
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Results */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Resultados {socios.length > 0 && `(${socios.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searching && socios.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-500">Buscando socios...</p>
                  </div>
                ) : socios.length === 0 ? (
                  <div className="text-center py-8">
                    <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      {searchTerm
                        ? 'No se encontraron socios con ese criterio'
                        : 'Escribe en el buscador para ver resultados'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {socios.map((socio) => (
                      <button
                        key={socio.So_ID}
                        onClick={() => handleSelectSocio(socio)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selectedSocio?.So_ID === socio.So_ID
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {socio.So_Apellido}, {socio.So_Nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              Socio N° {socio.So_ID}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Socio Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Socio</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedSocio ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500">
                      Selecciona un socio de la lista para ver su información
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header del socio */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-start gap-4">
                        {selectedSocio.So_Foto_Base64 ? (
                          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                            <img
                              src={selectedSocio.So_Foto_Base64}
                              alt={`${selectedSocio.So_Apellido}, ${selectedSocio.So_Nombre}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="p-4 bg-blue-600 rounded-full flex-shrink-0">
                            <User className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-gray-900">
                            {selectedSocio.So_Apellido}, {selectedSocio.So_Nombre}
                          </h2>
                          <p className="text-sm text-gray-600 mt-1">
                            Número de Socio: <span className="font-semibold">#{selectedSocio.So_ID}</span>
                          </p>
                          {selectedSocio.UltimaCuota_Anio && selectedSocio.UltimaCuota_Mes && (
                            (() => {
                              const now = new Date()
                              const currentYear = now.getFullYear()
                              const currentMonth = now.getMonth() + 1

                              // Calculate months difference
                              const monthsDiff = (currentYear - selectedSocio.UltimaCuota_Anio) * 12 + (currentMonth - selectedSocio.UltimaCuota_Mes)
                              const isDelayed = monthsDiff >= 2

                              const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
                              const monthName = monthNames[selectedSocio.UltimaCuota_Mes - 1] || selectedSocio.UltimaCuota_Mes

                              return (
                                <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                  isDelayed
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-green-100 text-green-800 border border-green-300'
                                }`}>
                                  Última cuota: {monthName} {selectedSocio.UltimaCuota_Anio}
                                  {isDelayed && ` (${monthsDiff} meses de retraso)`}
                                </div>
                              )
                            })()
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Detalles del socio */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Nombre
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.So_Nombre || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Apellido
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.So_Apellido || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            DNI
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg font-mono">
                            {selectedSocio.So_NroDoc || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Teléfono
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.So_Telef || 'No especificado'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Número de Socio
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg font-mono">
                            {selectedSocio.So_ID}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Grupo
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.Gr_Nombre || (selectedSocio.Gr_ID ? `Grupo #${selectedSocio.Gr_ID}` : 'Sin grupo')}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Email
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.So_Email || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500 block mb-1">
                            Fecha de Nacimiento
                          </label>
                          <p className="text-base text-gray-900 bg-gray-50 px-4 py-2 rounded-lg">
                            {selectedSocio.So_FecNac || 'No especificado'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Domicilios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Domicilio de Residencia
                        </label>
                        <p className="text-base text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                          {selectedSocio.So_DomRes || 'No especificado'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Domicilio de Cobro
                        </label>
                        <p className="text-base text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                          {selectedSocio.So_DomCob || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}

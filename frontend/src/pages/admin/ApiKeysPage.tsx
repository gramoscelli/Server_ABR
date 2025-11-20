import { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { fetchWithAuth } from '@/lib/auth'
import {
  Key,
  Plus,
  Trash2,
  ShieldOff,
  Copy,
  CheckCircle2,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react'

interface ApiKey {
  id: number
  name: string
  user_id: number | null
  active: boolean
  created_at: string
  expires_at: string | null
  last_used: string | null
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiration, setNewKeyExpiration] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const { toast } = useToast()

  // Load API keys
  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const response = await fetchWithAuth('/api/api-keys')

      if (!response.ok) {
        throw new Error('Error al cargar claves API')
      }

      const data = await response.json()
      setApiKeys(data.apiKeys || [])
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las claves API',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la clave es requerido',
        variant: 'destructive'
      })
      return
    }

    setCreating(true)
    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfResponse.json()

      const body: { name: string; expiresAt?: string } = {
        name: newKeyName.trim()
      }

      if (newKeyExpiration) {
        body.expiresAt = new Date(newKeyExpiration).toISOString()
      }

      const response = await fetchWithAuth('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear clave API')
      }

      const data = await response.json()
      setGeneratedKey(data.apiKey)
      setNewKeyName('')
      setNewKeyExpiration('')
      setShowCreateForm(false)

      toast({
        title: 'Clave API creada',
        description: '¡Copia la clave ahora! No podrás verla de nuevo.',
        variant: 'default'
      })

      await loadApiKeys()
    } catch (error: any) {
      console.error('Error creating API key:', error)
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la clave API',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKeyId(id)
      setTimeout(() => setCopiedKeyId(null), 2000)
      toast({
        title: 'Copiado',
        description: 'Clave copiada al portapapeles',
        variant: 'default'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar la clave',
        variant: 'destructive'
      })
    }
  }

  const revokeApiKey = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas revocar la clave "${name}"?`)) {
      return
    }

    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfResponse.json()

      const response = await fetchWithAuth(`/api/api-keys/${id}/revoke`, {
        method: 'PATCH',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (!response.ok) {
        throw new Error('Error al revocar clave API')
      }

      toast({
        title: 'Clave revocada',
        description: 'La clave API ha sido revocada exitosamente',
        variant: 'default'
      })

      await loadApiKeys()
    } catch (error) {
      console.error('Error revoking API key:', error)
      toast({
        title: 'Error',
        description: 'No se pudo revocar la clave API',
        variant: 'destructive'
      })
    }
  }

  const deleteApiKey = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente la clave "${name}"?`)) {
      return
    }

    try {
      // Get CSRF token first
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfResponse.json()

      const response = await fetchWithAuth(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (!response.ok) {
        throw new Error('Error al eliminar clave API')
      }

      toast({
        title: 'Clave eliminada',
        description: 'La clave API ha sido eliminada permanentemente',
        variant: 'default'
      })

      await loadApiKeys()
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la clave API',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claves API</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona claves de acceso para integraciones y servicios externos
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Clave
          </Button>
        </div>

        {/* Generated Key Display */}
        {generatedKey && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-5 w-5" />
                ¡Clave API generada exitosamente!
              </CardTitle>
              <CardDescription className="text-green-700">
                Copia esta clave ahora. Por seguridad, no podrás verla de nuevo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={generatedKey}
                  readOnly
                  className="font-mono text-sm bg-white"
                />
                <Button
                  onClick={() => copyToClipboard(generatedKey, 'generated')}
                  variant="outline"
                >
                  {copiedKeyId === 'generated' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Importante:</p>
                    <p>Guarda esta clave en un lugar seguro. Necesitarás incluirla en el header <code className="bg-yellow-100 px-1 rounded">X-API-Key</code> para autenticarte.</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setGeneratedKey(null)}
                variant="outline"
                className="mt-3"
              >
                Cerrar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Clave API</CardTitle>
              <CardDescription>
                Genera una nueva clave de acceso para integraciones externas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="keyName">Nombre de la clave</Label>
                <Input
                  id="keyName"
                  placeholder="Ej: Servicio de backups, Integración WhatsApp..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="keyExpiration">Fecha de expiración (opcional)</Label>
                <Input
                  id="keyExpiration"
                  type="datetime-local"
                  value={newKeyExpiration}
                  onChange={(e) => setNewKeyExpiration(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={createApiKey}
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {creating ? 'Creando...' : 'Crear Clave'}
                </Button>
                <Button
                  onClick={() => setShowCreateForm(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Claves API Existentes
            </CardTitle>
            <CardDescription>
              Lista de todas las claves API creadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Cargando claves API...
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Key className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay claves API creadas</p>
                <p className="text-sm mt-1">Crea una nueva clave para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((apiKey) => {
                  const expired = isExpired(apiKey.expires_at)
                  const inactive = !apiKey.active || expired

                  return (
                    <div
                      key={apiKey.id}
                      className={`p-4 border rounded-lg ${
                        inactive
                          ? 'bg-gray-50 border-gray-300'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              {apiKey.name}
                            </h3>
                            {inactive && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                {expired ? 'Expirada' : 'Revocada'}
                              </span>
                            )}
                            {!inactive && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                Activa
                              </span>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>Creada: {formatDate(apiKey.created_at)}</span>
                            </div>
                            {apiKey.expires_at && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className={expired ? 'text-red-600 font-medium' : ''}>
                                  Expira: {formatDate(apiKey.expires_at)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span>Último uso: {formatDate(apiKey.last_used)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {apiKey.active && !expired && (
                            <Button
                              onClick={() => revokeApiKey(apiKey.id, apiKey.name)}
                              variant="outline"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            onClick={() => deleteApiKey(apiKey.id, apiKey.name)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Cómo usar las claves API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">1. Incluye la clave en tus peticiones HTTP</h4>
              <p className="text-sm text-gray-600 mb-2">Agrega el header <code className="bg-gray-200 px-1 rounded">X-API-Key</code> con tu clave:</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`curl -H "X-API-Key: tu_clave_api_aqui" \\
  http://localhost:3000/api/socios/search?q=Martinez`}
              </pre>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">2. La clave hereda los permisos del usuario root</h4>
              <p className="text-sm text-gray-600">
                Las claves API tienen acceso completo a todos los endpoints disponibles para el rol root.
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">⚠️ Seguridad</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Nunca compartas tus claves API públicamente</li>
                <li>Usa HTTPS en producción</li>
                <li>Revoca claves comprometidas inmediatamente</li>
                <li>Establece fechas de expiración cuando sea posible</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

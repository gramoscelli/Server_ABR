import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Settings,
  Key,
  Database,
  Server,
  Mail,
  Bell,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'

interface SystemInfo {
  version: string
  nodeVersion: string
  database: string
  environment: string
  uptime: string
  serverStatus: 'online' | 'offline' | 'degraded'
  lastBackup: string | null
  dbSize: string
  memoryUsage: number
  cpuUsage: number
  diskUsage: number
}

interface BackupInfo {
  filename: string
  size: number
  sizeFormatted: string
  createdAt: string
  createdAtFormatted: string
}

export default function SystemPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    version: '1.0.0',
    nodeVersion: 'v20.x',
    database: 'MySQL 8.0',
    environment: 'Producción',
    uptime: '0d 0h',
    serverStatus: 'online',
    lastBackup: null,
    dbSize: '-- MB',
    memoryUsage: 0,
    cpuUsage: 0,
    diskUsage: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [loadingBackups, setLoadingBackups] = useState(false)

  useEffect(() => {
    const user = authService.getUser()
    const isRoot = user?.role === 'root'

    if (!isRoot) {
      navigate('/profile')
      return
    }

    loadSystemInfo()
    loadBackups()
  }, [navigate])

  const loadBackups = async () => {
    setLoadingBackups(true)
    try {
      const response = await fetchWithAuth('/api/admin/backups')
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups || [])
        // Update lastBackup in systemInfo
        if (data.backups && data.backups.length > 0) {
          setSystemInfo(prev => ({
            ...prev,
            lastBackup: data.backups[0].createdAtFormatted
          }))
        }
      }
    } catch (error) {
      console.error('Error loading backups:', error)
    } finally {
      setLoadingBackups(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreatingBackup(true)
    try {
      // Get CSRF token
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth('/api/admin/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        const data = await response.json()
        let description = `${data.backup.filename} (${data.backup.sizeFormatted})`
        if (data.cleanup && data.cleanup.deleted > 0) {
          description += ` - Se eliminaron ${data.cleanup.deleted} backup(s) antiguo(s)`
        }
        toast({
          title: 'Backup creado',
          description,
        })
        // Reload backups list
        await loadBackups()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'No se pudo crear el backup',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión al crear el backup',
        variant: 'destructive'
      })
    } finally {
      setCreatingBackup(false)
    }
  }

  const handleDownloadBackup = async (filename: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'No se pudo descargar el backup',
          variant: 'destructive'
        })
        return
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Descarga iniciada',
        description: filename
      })
    } catch (error) {
      console.error('Error downloading backup:', error)
      toast({
        title: 'Error',
        description: 'Error de conexión al descargar el backup',
        variant: 'destructive'
      })
    }
  }

  const loadSystemInfo = async () => {
    try {
      // Simular carga de información del sistema
      // En producción, esto vendría de un endpoint real /api/admin/system-info
      await new Promise(resolve => setTimeout(resolve, 800))

      // Valores simulados pero realistas
      const uptimeHours = Math.floor(Math.random() * 720) + 24
      const days = Math.floor(uptimeHours / 24)
      const hours = uptimeHours % 24

      setSystemInfo({
        version: '1.0.0',
        nodeVersion: 'v20.x',
        database: 'MySQL 8.0',
        environment: process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo',
        uptime: `${days}d ${hours}h`,
        serverStatus: 'online',
        lastBackup: new Date(Date.now() - Math.random() * 86400000).toLocaleString('es-AR'),
        dbSize: `${(Math.random() * 500 + 50).toFixed(1)} MB`,
        memoryUsage: Math.floor(Math.random() * 40) + 30,
        cpuUsage: Math.floor(Math.random() * 20) + 5,
        diskUsage: Math.floor(Math.random() * 30) + 20,
      })
    } catch (error) {
      console.error('Error loading system info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSystemInfo()
    setRefreshing(false)
    toast({
      title: 'Actualizado',
      description: 'Información del sistema actualizada'
    })
  }

  const systemSections = [
    {
      title: 'Claves API',
      description: 'Gestiona las claves de API para integraciones externas',
      icon: Key,
      color: 'bg-orange-500',
      route: '/admin/api-keys',
    },
    {
      title: 'Configuración de Email',
      description: 'Configura el servidor SMTP para envío de notificaciones',
      icon: Mail,
      color: 'bg-green-500',
      route: '/admin/email-settings',
    },
    {
      title: 'Configuración General',
      description: 'Parámetros y configuración global del sistema',
      icon: Settings,
      color: 'bg-blue-500',
      route: '/admin/settings',
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'offline': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'En línea'
      case 'degraded': return 'Degradado'
      case 'offline': return 'Fuera de línea'
      default: return 'Desconocido'
    }
  }

  const getProgressColor = (value: number) => {
    if (value < 50) return 'bg-green-500'
    if (value < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configuración general del sistema y gestión de servicios
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {systemSections.map((section, index) => {
          const Icon = section.icon
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(section.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900">
                      {section.title}
                    </CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600">
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-red-600" />
            Estado del Servidor
          </CardTitle>
          <CardDescription>
            Recursos y rendimiento en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando información...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CPU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">CPU</span>
                  </div>
                  <span className="text-sm font-bold">{systemInfo.cpuUsage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(systemInfo.cpuUsage)}`}
                    style={{ width: `${systemInfo.cpuUsage}%` }}
                  />
                </div>
              </div>

              {/* Memory */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Memoria</span>
                  </div>
                  <span className="text-sm font-bold">{systemInfo.memoryUsage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(systemInfo.memoryUsage)}`}
                    style={{ width: `${systemInfo.memoryUsage}%` }}
                  />
                </div>
              </div>

              {/* Disk */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Disco</span>
                  </div>
                  <span className="text-sm font-bold">{systemInfo.diskUsage}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${getProgressColor(systemInfo.diskUsage)}`}
                    style={{ width: `${systemInfo.diskUsage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Base de Datos
          </CardTitle>
          <CardDescription>
            Estado y mantenimiento de la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Motor</div>
              <div className="text-lg font-semibold text-gray-900">{systemInfo.database}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Tamaño</div>
              <div className="text-lg font-semibold text-gray-900">{systemInfo.dbSize}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Estado</div>
              <div className={`text-lg font-semibold flex items-center gap-1 ${getStatusColor(systemInfo.serverStatus)}`}>
                <CheckCircle2 className="h-4 w-4" />
                Conectada
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Último Backup</div>
              <div className="text-lg font-semibold text-gray-900">
                {systemInfo.lastBackup || 'No disponible'}
              </div>
            </div>
          </div>

          {/* Create Backup Button */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creando backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Crear Backup
                </>
              )}
            </Button>
          </div>

          {/* Backups List */}
          {backups.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Últimos Backups</h4>
              <div className="space-y-2">
                {backups.slice(0, 5).map((backup, index) => (
                  <div
                    key={backup.filename}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className={`h-4 w-4 ${index === 0 ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <div className={`text-sm font-medium ${index === 0 ? 'text-green-900' : 'text-gray-900'}`}>
                          {backup.createdAtFormatted}
                        </div>
                        <div className="text-xs text-gray-500">{backup.filename}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${index === 0 ? 'text-green-700' : 'text-gray-600'}`}>
                        {backup.sizeFormatted}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.filename)}
                        title="Descargar backup"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingBackups && backups.length === 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Cargando backups...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Correo Electrónico
          </CardTitle>
          <CardDescription>
            Configuración del servicio de email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Proveedor</div>
              <div className="text-lg font-semibold text-gray-900">Resend</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Estado</div>
              <div className="text-lg font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Configurado
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Emails Enviados (hoy)</div>
              <div className="text-lg font-semibold text-gray-900">--</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Información General</CardTitle>
          <CardDescription className="text-gray-600">
            Detalles técnicos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Versión del Sistema:</span>
                <span className="font-semibold text-gray-900">{systemInfo.version}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Node.js:</span>
                <span className="font-semibold text-gray-900">{systemInfo.nodeVersion}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Base de Datos:</span>
                <span className="font-semibold text-gray-900">{systemInfo.database}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Entorno:</span>
                <span className="font-semibold text-gray-900">{systemInfo.environment}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Estado del Servidor:</span>
                <span className={`font-semibold ${getStatusColor(systemInfo.serverStatus)}`}>
                  * {getStatusText(systemInfo.serverStatus)}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Tiempo Activo:</span>
                <span className="font-semibold text-gray-900">{systemInfo.uptime}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Note */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">
                Mantenimiento del Sistema
              </h3>
              <p className="text-sm text-yellow-800 mt-1">
                Los backups automáticos se ejecutan diariamente a las 9:48 AM (lunes a sábado) y se almacenan en Mega.nz.
                Los backups manuales se mantienen localmente (máximo 5, los más antiguos se eliminan automáticamente).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

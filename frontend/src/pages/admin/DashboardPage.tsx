import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Shield,
  Key,
  Activity,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth, authService } from '@/lib/auth'
import { toast } from '@/components/ui/use-toast'

interface AdminStats {
  totalUsers: number
  activeUsers: number
  totalRoles: number
  totalApiKeys: number
  pendingApprovals: number
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalApiKeys: 0,
    pendingApprovals: 0,
  })
  const [loading, setLoading] = useState(true)

  // Check if user is root
  const currentUser = authService.getUser()
  const isRoot = currentUser?.role === 'root'

  useEffect(() => {
    if (!isRoot) {
      navigate('/')
      return
    }
    fetchStats()
  }, [isRoot, navigate])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Fetch users
      const usersResponse = await fetchWithAuth('/api/admin/users')
      const rolesResponse = await fetchWithAuth('/api/admin/roles')
      const apiKeysResponse = await fetchWithAuth('/api/admin/api-keys')

      if (usersResponse.ok && rolesResponse.ok && apiKeysResponse.ok) {
        const usersData = await usersResponse.json()
        const rolesData = await rolesResponse.json()
        const apiKeysData = await apiKeysResponse.json()

        const activeUsers = usersData.users?.filter((u: any) => u.active !== false).length || 0
        const pendingUsers = usersData.users?.filter((u: any) => !u.email_verified).length || 0

        setStats({
          totalUsers: usersData.users?.length || 0,
          activeUsers,
          totalRoles: rolesData.roles?.length || 0,
          totalApiKeys: apiKeysData.api_keys?.length || 0,
          pendingApprovals: pendingUsers,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las estadísticas',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isRoot) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel Principal</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Gestión y administración del sistema
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center justify-between">
              Total de Usuarios
              <Users className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-blue-100 mt-1">
              {stats.activeUsers} activos
            </p>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Roles del Sistema
              </CardTitle>
              <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalRoles}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Perfiles de acceso
            </p>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Claves API
              </CardTitle>
              <Key className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.totalApiKeys}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Activas en el sistema
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className={`border-2 ${stats.pendingApprovals > 0 ? 'border-yellow-300 dark:border-yellow-700' : 'border-green-300 dark:border-green-700'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Aprobaciones Pendientes
              </CardTitle>
              {stats.pendingApprovals > 0 ? (
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.pendingApprovals > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
              {stats.pendingApprovals}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {stats.pendingApprovals > 0 ? 'Requieren verificación' : 'Todo al día'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Users Management */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/admin/users')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Gestión de Usuarios</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Administra usuarios del sistema, roles, permisos y estados de cuenta
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <UserPlus className="h-3 w-3" />
              <span>Crear, editar, activar/desactivar usuarios</span>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/admin/security')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <span>Seguridad</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestiona roles y permisos del sistema para controlar el acceso
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <Activity className="h-3 w-3" />
              <span>Roles, permisos y configuración de seguridad</span>
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow dark:bg-gray-800" onClick={() => navigate('/admin/system')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span>Sistema</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuración general del sistema y gestión de claves API
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
              <Activity className="h-3 w-3" />
              <span>API keys, configuración y parámetros</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Info */}
      <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Usuario actual:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{currentUser?.username}</span>
          </div>
          <div className="flex justify-between">
            <span>Rol:</span>
            <span className="font-semibold text-gray-900 dark:text-white">Administrador</span>
          </div>
          <div className="flex justify-between">
            <span>Última actualización:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

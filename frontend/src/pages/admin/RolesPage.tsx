import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface RoleStats {
  id: number
  name: string
  description: string
  count: number
  percentage: string
}

interface StatsData {
  total_users: number
  roles: RoleStats[]
}

export default function RolesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Check if user is root (only root can access roles page)
    const user = authService.getUser()
    const isRoot = user?.role === 'root'

    if (!isRoot) {
      // Redirect non-root users to profile
      navigate('/profile')
      return
    }

    fetchStats()
  }, [navigate])

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth('/api/roles/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.message || 'Error al cargar estadísticas de roles'
        })
      }
    } catch (error) {
      console.error('[RolesPage] Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al cargar estadísticas'
      })
    } finally {
      setLoading(false)
    }
  }

  const getRoleDisplayName = (name: string) => {
    const names: Record<string, string> = {
      'root': 'Administrador',
      'admin_employee': 'Empleado de Administración',
      'library_employee': 'Empleado de Biblioteca',
      'new_user': 'Usuario Nuevo',
      'readonly': 'Solo Lectura'
    }
    return names[name] || name
  }

  const getRoleBadgeColor = (name: string) => {
    const colors: Record<string, string> = {
      'root': 'bg-purple-100 text-purple-800 border-purple-200',
      'admin_employee': 'bg-blue-100 text-blue-800 border-blue-200',
      'library_employee': 'bg-green-100 text-green-800 border-green-200',
      'new_user': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'readonly': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[name] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roles y Permisos</h1>
            <p className="mt-2 text-gray-600">Gestionar roles del sistema y distribución de usuarios</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">Cargando...</div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Total de Usuarios
                  </CardTitle>
                  <CardDescription>Usuarios registrados en el sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats?.total_users || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Roles Disponibles
                  </CardTitle>
                  <CardDescription>Roles configurados en el sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900">{stats?.roles.length || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Roles Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Usuarios por Rol</CardTitle>
                <CardDescription>Cantidad y porcentaje de usuarios en cada rol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.roles.map((role) => (
                    <div key={role.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-gray-400" />
                          <div>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(role.name)}`}>
                              {getRoleDisplayName(role.name)}
                            </span>
                            {role.description && (
                              <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{role.count}</div>
                          <div className="text-sm text-gray-500">{role.percentage}%</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                          className={`h-2 rounded-full ${
                            role.name === 'root' ? 'bg-purple-600' :
                            role.name === 'admin_employee' ? 'bg-blue-600' :
                            role.name === 'library_employee' ? 'bg-green-600' :
                            role.name === 'new_user' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          }`}
                          style={{ width: `${role.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {(!stats?.roles || stats.roles.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      No se encontraron roles configurados
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Información sobre Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">•</span>
                    <span><strong>Administrador:</strong> Acceso completo al sistema, puede realizar cualquier operación</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">•</span>
                    <span><strong>Empleado de Administración:</strong> Puede gestionar usuarios, roles y configuraciones del sistema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">•</span>
                    <span><strong>Empleado de Biblioteca:</strong> Usuario aprobado con acceso a funciones de la biblioteca</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold mt-0.5">•</span>
                    <span><strong>Usuario Nuevo:</strong> Cuenta creada pero pendiente de aprobación por un administrador</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

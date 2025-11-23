import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Shield, Save, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate, useParams } from 'react-router-dom'

interface Permission {
  resource_id: number
  resource_name: string
  resource_description: string | null
  actions: string[]
  available_actions: string[]
}

interface RoleData {
  id: number
  name: string
  description: string | null
  is_system: boolean
}

interface PermissionsResponse {
  role: RoleData
  permissions: Permission[]
}

const ACTION_LABELS: Record<string, string> = {
  'read': 'Leer',
  'create': 'Crear',
  'update': 'Actualizar',
  'delete': 'Eliminar',
  'print': 'Imprimir',
  '*': 'Todos'
}

const RESOURCE_LABELS: Record<string, string> = {
  '*': 'Todos los recursos (Administrador)',
  'users': 'Usuarios',
  'roles': 'Roles',
  'api_keys': 'Claves API',
  'library_associateds': 'Socios de la Biblioteca'
}

export default function RolePermissionsPage() {
  const navigate = useNavigate()
  const { roleId } = useParams<{ roleId: string }>()
  const [role, setRole] = useState<RoleData | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const user = authService.getUser()
    const isRoot = user?.role === 'root'

    if (!isRoot) {
      navigate('/profile')
      return
    }

    if (roleId) {
      fetchPermissions()
    }
  }, [navigate, roleId])

  useEffect(() => {
    // Check for changes
    const changed = JSON.stringify(permissions) !== JSON.stringify(originalPermissions)
    setHasChanges(changed)
  }, [permissions, originalPermissions])

  const fetchPermissions = async () => {
    try {
      const response = await fetchWithAuth(`/api/roles/${roleId}/permissions`)
      if (response.ok) {
        const data: PermissionsResponse = await response.json()
        setRole(data.role)
        setPermissions(data.permissions)
        setOriginalPermissions(JSON.parse(JSON.stringify(data.permissions)))
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.message || 'Error al cargar los permisos'
        })
        navigate('/admin/roles')
      }
    } catch (error) {
      console.error('[RolePermissionsPage] Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al cargar los permisos'
      })
      navigate('/admin/roles')
    } finally {
      setLoading(false)
    }
  }

  const handleActionToggle = (resourceId: number, action: string) => {
    setPermissions(prev =>
      prev.map(perm => {
        if (perm.resource_id !== resourceId) return perm

        let newActions: string[]
        if (action === '*') {
          // Toggle all permissions
          if (perm.actions.includes('*')) {
            newActions = []
          } else {
            newActions = ['*']
          }
        } else {
          // Remove wildcard if toggling individual action
          const actionsWithoutWildcard = perm.actions.filter(a => a !== '*')

          if (actionsWithoutWildcard.includes(action)) {
            newActions = actionsWithoutWildcard.filter(a => a !== action)
          } else {
            newActions = [...actionsWithoutWildcard, action]
          }
        }

        return { ...perm, actions: newActions }
      })
    )
  }

  const isActionChecked = (perm: Permission, action: string) => {
    if (perm.actions.includes('*')) return true
    return perm.actions.includes(action)
  }

  const handleSave = async () => {
    if (!roleId) return

    setSaving(true)
    try {
      const permissionsToSend = permissions.map(p => ({
        resource_id: p.resource_id,
        actions: p.actions
      }))

      const response = await fetchWithAuth(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsToSend })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Permisos guardados',
          description: 'Los permisos del rol han sido actualizados exitosamente'
        })
        setOriginalPermissions(JSON.parse(JSON.stringify(permissions)))
        setHasChanges(false)
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Error al guardar los permisos'
        })
      }
    } catch (error) {
      console.error('[RolePermissionsPage] Save error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al guardar los permisos'
      })
    } finally {
      setSaving(false)
    }
  }

  const getRoleDisplayName = (name: string) => {
    const names: Record<string, string> = {
      'root': 'Administrador',
      'admin_employee': 'Empleado de Administración',
      'library_employee': 'Empleado de Biblioteca',
      'new_user': 'Usuario Nuevo',
      'readonly': 'Solo Lectura',
      'printer': 'Impresión'
    }
    return names[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const isRootRole = role?.name === 'root'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/roles')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Permisos del Rol</h1>
            {role && (
              <p className="mt-1 text-gray-600">
                Configurar permisos para: <strong>{getRoleDisplayName(role.name)}</strong>
              </p>
            )}
          </div>
        </div>
        {!isRootRole && (
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">Cargando permisos...</div>
          </CardContent>
        </Card>
      ) : isRootRole ? (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Shield className="h-5 w-5" />
              Rol de Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-purple-800">
              El rol de Administrador (root) tiene acceso completo a todos los recursos y acciones del sistema.
              No es posible modificar sus permisos por razones de seguridad.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Role Info */}
          {role && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  {getRoleDisplayName(role.name)}
                </CardTitle>
                {role.description && (
                  <CardDescription>{role.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          )}

          {/* Permissions Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permisos</CardTitle>
              <CardDescription>
                Selecciona los permisos que este rol tendrá sobre cada recurso del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissions.map((perm) => (
                  <div
                    key={perm.resource_id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900">
                        {RESOURCE_LABELS[perm.resource_name] || perm.resource_name}
                      </h3>
                      {perm.resource_description && (
                        <p className="text-sm text-gray-500">{perm.resource_description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      {perm.available_actions.map((action) => (
                        <label
                          key={action}
                          className="flex items-center gap-2 cursor-pointer select-none"
                        >
                          <Checkbox
                            checked={isActionChecked(perm, action)}
                            onCheckedChange={() => handleActionToggle(perm.resource_id, action)}
                            disabled={perm.resource_name === '*' && action !== '*'}
                          />
                          <span className={`text-sm ${
                            isActionChecked(perm, action) ? 'text-gray-900 font-medium' : 'text-gray-600'
                          }`}>
                            {ACTION_LABELS[action] || action}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {permissions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No hay recursos configurados en el sistema
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Guía de Permisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-semibold mb-2">Acciones disponibles:</h4>
                  <ul className="space-y-1">
                    <li><strong>Leer:</strong> Ver y consultar información</li>
                    <li><strong>Crear:</strong> Añadir nuevos registros</li>
                    <li><strong>Actualizar:</strong> Modificar registros existentes</li>
                    <li><strong>Eliminar:</strong> Borrar registros</li>
                    <li><strong>Imprimir:</strong> Generar reportes e impresiones</li>
                    <li><strong>Todos:</strong> Acceso completo al recurso</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Recursos del sistema:</h4>
                  <ul className="space-y-1">
                    <li><strong>Usuarios:</strong> Gestión de cuentas de usuario</li>
                    <li><strong>Roles:</strong> Administración de roles y permisos</li>
                    <li><strong>Claves API:</strong> Gestión de claves de integración</li>
                    <li><strong>Socios:</strong> Gestión de socios de la biblioteca</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Changes indicator */}
          {hasChanges && (
            <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg">
              <p className="text-sm text-yellow-800">
                Tienes cambios sin guardar
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

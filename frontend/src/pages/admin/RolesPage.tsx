import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Shield, Users, Plus, Pencil, Trash2, Lock, Key } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'

interface RoleStats {
  id: number
  name: string
  description: string | null
  is_system?: boolean
  count: number
  percentage: string
}

interface StatsData {
  total_users: number
  roles: RoleStats[]
}

interface RoleFormData {
  name: string
  description: string
}

const SYSTEM_ROLES = ['root', 'new_user']

export default function RolesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<RoleStats | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const user = authService.getUser()
    const isRoot = user?.role === 'root'

    if (!isRoot) {
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

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'El nombre del rol es requerido'
      })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetchWithAuth('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Rol creado',
          description: `El rol "${data.role.name}" ha sido creado exitosamente`
        })
        setIsCreateDialogOpen(false)
        setFormData({ name: '', description: '' })
        fetchStats()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Error al crear el rol'
        })
      }
    } catch (error) {
      console.error('[RolesPage] Create error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al crear el rol'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditRole = async () => {
    if (!selectedRole) return

    setSubmitting(true)
    try {
      const response = await fetchWithAuth(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim() || undefined,
          description: formData.description.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Rol actualizado',
          description: 'El rol ha sido actualizado exitosamente'
        })
        setIsEditDialogOpen(false)
        setSelectedRole(null)
        setFormData({ name: '', description: '' })
        fetchStats()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Error al actualizar el rol'
        })
      }
    } catch (error) {
      console.error('[RolesPage] Edit error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al actualizar el rol'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRole = async () => {
    if (!selectedRole) return

    setSubmitting(true)
    try {
      const response = await fetchWithAuth(`/api/roles/${selectedRole.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Rol eliminado',
          description: `El rol "${selectedRole.name}" ha sido eliminado`
        })
        setIsDeleteDialogOpen(false)
        setSelectedRole(null)
        fetchStats()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message || 'Error al eliminar el rol'
        })
      }
    } catch (error) {
      console.error('[RolesPage] Delete error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al eliminar el rol'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const openEditDialog = (role: RoleStats) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      description: role.description || ''
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (role: RoleStats) => {
    setSelectedRole(role)
    setIsDeleteDialogOpen(true)
  }

  const isSystemRole = (name: string) => SYSTEM_ROLES.includes(name)

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

  const getRoleBadgeColor = (name: string) => {
    const colors: Record<string, string> = {
      'root': 'bg-purple-100 text-purple-800 border-purple-200',
      'admin_employee': 'bg-blue-100 text-blue-800 border-blue-200',
      'library_employee': 'bg-green-100 text-green-800 border-green-200',
      'new_user': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'readonly': 'bg-gray-100 text-gray-800 border-gray-200',
      'printer': 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colors[name] || 'bg-slate-100 text-slate-800 border-slate-200'
  }

  const getProgressBarColor = (name: string) => {
    const colors: Record<string, string> = {
      'root': 'bg-purple-600',
      'admin_employee': 'bg-blue-600',
      'library_employee': 'bg-green-600',
      'new_user': 'bg-yellow-600',
      'readonly': 'bg-gray-600',
      'printer': 'bg-orange-600'
    }
    return colors[name] || 'bg-slate-600'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles y Permisos</h1>
          <p className="mt-2 text-gray-600">Gestionar roles del sistema y distribución de usuarios</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', description: '' })
          setIsCreateDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">Cargando...</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
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

          {/* Roles List */}
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
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(role.name)}`}>
                              {getRoleDisplayName(role.name)}
                            </span>
                            {isSystemRole(role.name) && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                <Lock className="h-3 w-3" />
                                Sistema
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{role.count}</div>
                          <div className="text-sm text-gray-500">{role.percentage}%</div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/roles/${role.id}/permissions`)}
                            title="Gestionar permisos"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                            title="Editar rol"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!isSystemRole(role.name) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(role)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar rol"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                      <div
                        className={`h-2 rounded-full ${getProgressBarColor(role.name)}`}
                        style={{ width: `${Math.max(parseFloat(role.percentage), 1)}%` }}
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
                  <span className="font-bold mt-0.5">*</span>
                  <span><strong>Administrador:</strong> Acceso completo al sistema, puede realizar cualquier operación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">*</span>
                  <span><strong>Empleado de Administración:</strong> Puede gestionar usuarios, roles y configuraciones del sistema</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">*</span>
                  <span><strong>Empleado de Biblioteca:</strong> Usuario aprobado con acceso a funciones de la biblioteca</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">*</span>
                  <span><strong>Usuario Nuevo:</strong> Cuenta creada pero pendiente de aprobación por un administrador</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">*</span>
                  <span><strong>Roles del Sistema:</strong> Los roles marcados con <Lock className="inline h-3 w-3" /> no pueden ser eliminados</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Crea un nuevo rol para asignar a los usuarios del sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nombre del rol *</Label>
              <Input
                id="create-name"
                placeholder="ej: supervisor, contador..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Solo letras, números, guiones y guiones bajos. Min. 2 caracteres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Descripción</Label>
              <Input
                id="create-description"
                placeholder="Descripción del rol..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRole} disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear Rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol</DialogTitle>
            <DialogDescription>
              Modifica la información del rol {selectedRole && `"${getRoleDisplayName(selectedRole.name)}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del rol</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!!(selectedRole && isSystemRole(selectedRole.name))}
              />
              {selectedRole && isSystemRole(selectedRole.name) && (
                <p className="text-xs text-amber-600">
                  El nombre de los roles del sistema no puede ser modificado
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Input
                id="edit-description"
                placeholder="Descripción del rol..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleEditRole} disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el rol "{selectedRole && getRoleDisplayName(selectedRole.name)}"?
              {selectedRole && selectedRole.count > 0 && (
                <span className="block mt-2 text-red-600">
                  Atención: Este rol tiene {selectedRole.count} usuario(s) asignado(s).
                  Debes reasignarlos a otro rol antes de eliminar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              disabled={submitting || !!(selectedRole && selectedRole.count > 0)}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

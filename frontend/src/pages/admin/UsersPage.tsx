import { AdminLayout } from '@/components/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Edit, Plus, Trash2, Search, Key, Mail, MailCheck, CheckCircle, RefreshCw, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchWithAuth, authService } from '@/lib/auth'
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface User {
  id: number
  username: string
  email: string
  nombre?: string
  apellido?: string
  email_verified?: boolean
  active?: boolean
  role?: string
  role_id?: number
  created_at: string
}

interface Role {
  id: number
  name: string
  description: string
}

interface UserFormData {
  username: string
  email: string
  nombre: string
  apellido: string
  password: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    nombre: '',
    apellido: '',
    password: ''
  })
  const [passwordValidation, setPasswordValidation] = useState<any>(null)

  // New dialogs state
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [isChangeEmailDialogOpen, setIsChangeEmailDialogOpen] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')

  const { toast} = useToast()

  // Check if current user is root (only root can edit users)
  const currentUserData = authService.getUser()
  const isRoot = currentUserData?.role === 'root'

  // Helper function to translate role names
  const translateRoleName = (roleName: string) => {
    const translations: Record<string, string> = {
      'root': 'Administrador',
      'admin_employee': 'Empleado de Administración',
      'library_employee': 'Empleado de Biblioteca',
      'new_user': 'Usuario Nuevo',
      'readonly': 'Solo Lectura'
    }
    return translations[roleName] || roleName
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const fetchUsers = async () => {
    try {
      console.log('[UsersPage] Fetching users...')
      const response = await fetchWithAuth('/api/admin/users')
      console.log('[UsersPage] Response received:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[UsersPage] Users data:', data)
        setUsers(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[UsersPage] Error response:', errorData)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.message || 'Error al cargar usuarios'
        })
      }
    } catch (error) {
      console.error('[UsersPage] Exception:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red al cargar usuarios'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setIsEditMode(false)
    setCurrentUser(null)
    setFormData({ username: '', email: '', nombre: '', apellido: '', password: '' })
    setIsDialogOpen(true)
  }

  const handleEditUser = (user: User) => {
    setIsEditMode(true)
    setCurrentUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      password: ''
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate password strength when creating a new user or when changing password
    if (formData.password && (!passwordValidation || !passwordValidation.valid)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La contraseña no cumple con los requisitos de seguridad'
      })
      return
    }

    try {
      const csrfRes = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfRes.json()

      const url = isEditMode ? `/api/admin/users/${currentUser?.id}` : '/api/admin/users'
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetchWithAuth(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          variant: 'success',
          title: 'Éxito',
          description: `Usuario ${isEditMode ? 'actualizado' : 'creado'} exitosamente`
        })
        setIsDialogOpen(false)
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Operación fallida'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  const handleDeleteUser = async (userId: number, username: string) => {
    // Protect admin account
    if (username === 'admin') {
      toast({
        variant: 'destructive',
        title: 'No se puede eliminar admin',
        description: 'La cuenta "admin" está protegida y no se puede eliminar'
      })
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return

    try {
      const csrfRes = await fetch('/api/csrf-token', {
        credentials: 'include'
      })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        toast({
          variant: 'success',
          title: 'Éxito',
          description: 'Usuario eliminado exitosamente'
        })
        fetchUsers()
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorData.message || 'Error al eliminar usuario'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Reset password with temporary password
  const handleResetPassword = (user: User) => {
    setCurrentUser(user)
    setTemporaryPassword('')
    setIsResetPasswordDialogOpen(true)
  }

  const handleResetPasswordSubmit = async () => {
    if (!currentUser || !temporaryPassword) return

    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${currentUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ temporaryPassword })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Contraseña restablecida',
          description: data.warning || 'Contraseña temporal establecida exitosamente'
        })
        setIsResetPasswordDialogOpen(false)
        setTemporaryPassword('')
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al restablecer contraseña'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Verify email manually
  const handleVerifyEmail = async (userId: number, username: string) => {
    if (!confirm(`¿Marcar el email de ${username} como verificado?`)) return

    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${userId}/verify-email`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        toast({
          title: 'Email verificado',
          description: 'El email ha sido marcado como verificado'
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al verificar email'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Resend verification email
  const handleResendVerification = async (userId: number, email: string) => {
    if (!confirm(`¿Reenviar email de verificación a ${email}?`)) return

    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${userId}/resend-verification`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        toast({
          title: 'Email enviado',
          description: 'Email de verificación reenviado exitosamente'
        })
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al reenviar email'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Change email
  const handleChangeEmail = (user: User) => {
    setCurrentUser(user)
    setNewEmail(user.email)
    setIsChangeEmailDialogOpen(true)
  }

  const handleChangeEmailSubmit = async () => {
    if (!currentUser || !newEmail) return

    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${currentUser.id}/change-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ newEmail })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Email cambiado',
          description: data.warning || 'Email actualizado exitosamente'
        })
        setIsChangeEmailDialogOpen(false)
        setNewEmail('')
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al cambiar email'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Fetch available roles
  const fetchRoles = async () => {
    try {
      const response = await fetchWithAuth('/api/roles')
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('[UsersPage] Error fetching roles:', error)
    }
  }

  // Approve account
  const handleApproveAccount = async (userId: number, username: string) => {
    if (!confirm(`¿Aprobar la cuenta de ${username}?`)) return

    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        toast({
          title: 'Cuenta aprobada',
          description: 'La cuenta ha sido activada exitosamente'
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al aprobar cuenta'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
    }
  }

  // Change user role
  const handleRoleChange = async (userId: number, username: string, newRoleId: string) => {
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/roles/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ role_id: parseInt(newRoleId) })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Rol actualizado',
          description: `Rol de ${username} cambiado de ${translateRoleName(data.user.old_role)} a ${translateRoleName(data.user.new_role)}`
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al cambiar rol'
        })
        fetchUsers() // Revert UI
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
      fetchUsers() // Revert UI
    }
  }

  // Toggle active status
  const handleToggleActive = async (userId: number, username: string, currentStatus: boolean) => {
    try {
      const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' })
      const { csrfToken } = await csrfRes.json()

      const response = await fetchWithAuth(`/api/admin/users/${userId}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: data.message,
          description: `Cuenta de ${username} ${!currentStatus ? 'activada' : 'desactivada'}`
        })
        fetchUsers()
      } else {
        const error = await response.json()
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Error al cambiar estado'
        })
        fetchUsers() // Revert UI
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de red'
      })
      fetchUsers() // Revert UI
    }
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.apellido && user.apellido.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
            <p className="mt-2 text-gray-600">Gestionar usuarios del sistema y permisos</p>
          </div>
          {isRoot && (
            <Button onClick={handleCreateUser}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Usuario
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>Todos los usuarios registrados en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar usuarios..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm">Nombre de usuario</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Rol</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Creado</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{user.username}</td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={`mailto:${user.email}`}
                              title={user.email}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Mail className="h-4 w-4 text-blue-600" />
                            </a>
                            {user.username !== 'admin' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleChangeEmail(user)}
                                  title="Cambiar email"
                                  className="h-8 w-8"
                                >
                                  <RefreshCw className="h-4 w-4 text-purple-600" />
                                </Button>
                                {!user.email_verified && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleVerifyEmail(user.id, user.username)}
                                      title="Marcar email como verificado"
                                      className="h-8 w-8"
                                    >
                                      <MailCheck className="h-4 w-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleResendVerification(user.id, user.email)}
                                      title="Reenviar email de verificación"
                                      className="h-8 w-8"
                                    >
                                      <Mail className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {user.username === 'admin' || !isRoot ? (
                            <span className="inline-block px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md">
                              {user.role ? translateRoleName(user.role) : 'Sin rol'}
                            </span>
                          ) : (
                            <Select
                              value={user.role_id?.toString() || ''}
                              onValueChange={(value) => handleRoleChange(user.id, user.username, value)}
                            >
                              <SelectTrigger className="w-full max-w-[200px] text-left">
                                <SelectValue placeholder="Seleccionar rol">
                                  {user.role ? translateRoleName(user.role) : 'Sin rol'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map((role) => (
                                  <SelectItem key={role.id} value={role.id.toString()}>
                                    {translateRoleName(role.name)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={user.active ?? true}
                              onCheckedChange={() => handleToggleActive(user.id, user.username, user.active ?? true)}
                              disabled={user.username === 'admin' || !isRoot}
                            />
                            <span className="text-xs text-gray-600">
                              {user.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {user.username === 'admin' ? (
                            <div className="flex justify-end gap-1 flex-wrap">
                              <span className="text-xs text-gray-500 italic px-2 py-1">
                                Cuenta protegida
                              </span>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1 flex-wrap">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResetPassword(user)}
                                title="Establecer contraseña temporal"
                              >
                                <Key className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(user)}
                                title="Editar usuario"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                title="Eliminar usuario"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron usuarios
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Actualizar información del usuario' : 'Agregar un nuevo usuario al sistema'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isEditMode && currentUser?.username === 'admin'}
                    className={isEditMode && currentUser?.username === 'admin' ? 'bg-gray-100 cursor-not-allowed' : ''}
                  />
                  {isEditMode && currentUser?.username === 'admin' && (
                    <p className="text-xs text-gray-500">
                      El nombre de usuario admin no se puede cambiar por razones de seguridad
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña {isEditMode && '(dejar en blanco para mantener la actual)'}</Label>
                  <Input
                    id="password"
                    type="password"
                    required={!isEditMode}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {formData.password && (
                    <PasswordStrengthIndicator
                      password={formData.password}
                      onValidationChange={setPasswordValidation}
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {isEditMode ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Establecer Contraseña Temporal</DialogTitle>
              <DialogDescription>
                Establecer una contraseña temporal para {currentUser?.username}. El usuario deberá cambiarla en su próximo inicio de sesión.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="temp-password">Contraseña Temporal</Label>
                <Input
                  id="temp-password"
                  type="text"
                  placeholder="Ingresa una contraseña temporal"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-xs text-gray-500">
                  Esta contraseña será visible para el administrador. Compártela de forma segura con el usuario.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleResetPasswordSubmit}
                disabled={!temporaryPassword}
              >
                Establecer Contraseña
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Email Dialog */}
        <Dialog open={isChangeEmailDialogOpen} onOpenChange={setIsChangeEmailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Email</DialogTitle>
              <DialogDescription>
                Cambiar el email de {currentUser?.username}. Se enviará un email de verificación a la nueva dirección.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-email">Email Actual</Label>
                <Input
                  id="current-email"
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Nuevo Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="nuevo@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  El email será marcado como no verificado y se enviará un email de verificación.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsChangeEmailDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleChangeEmailSubmit}
                disabled={!newEmail || newEmail === currentUser?.email}
              >
                Cambiar Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
